// A naive market making script that tracks position,
// posts two-way quotes across futures and manages risk
require("dotenv").config();
import {
  Market,
  Client,
  Exchange,
  Network,
  utils,
  types,
  events,
} from "@zetamarkets/sdk";
import { PublicKey, Connection } from "@solana/web3.js";
import { Wallet, web3, BN } from "@project-serum/anchor";
import fetch from "node-fetch";
import { Order } from "@zetamarkets/sdk/dist/types";

interface OrdersOnMarket {
  marketIndex: number;
  expiryTs: number;
  theoPrice: number;
}

const userKey = web3.Keypair.generate();
const wallet = new Wallet(userKey);

let client: Client;

// object for holding order state
let markets: OrdersOnMarket[] = [];

// solana airdrop configuration
const airdropConnection: Connection = new Connection(
  "https://api.devnet.solana.com",
  {
    commitment: "confirmed",
  }
);

//trading logic constants

//tick size for market
const TICKSIZE = 1000;
//time between refreshes
const PULSE_FREQUENCY = 1000;
//how much edge to charge bid/ask
const EDGE = 0.001;
//how much lean per standard "SIZE"
const LEAN = 0.001;
//TODO: Change this to dollar deltas
//general size to quote on bid-ask (dollar delta)
const SIZE = 1_000;
//layers to have on the book (unused)
// const LAYERS = 2;
//devnet param to airdrop USDC
const STARTING_BALANCE = 100_000_000;

const mintUSDC = async () => {
  const body = {
    key: wallet.publicKey.toString(),
    amount: STARTING_BALANCE,
  };
  await fetch(`${process.env.server_url}/faucet/USDC`, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  console.log(`Airdropped USDC`);
  await utils.sleep(10000);
};

async function callback(eventType: any, data: any) {
  if (eventType == events.EventType.USER) {
    console.log("CLIENT CALLBACK + slot = ", data);
  }
}

async function refreshQuotes() {
  try {
    await client.cancelAllOrders();
  } catch (e) {}
  let expiries = Exchange.markets.getTradeableExpiryIndices();
  let markets: Market[] = expiries
    .map((index) => {
      return Exchange.markets.getMarketsByExpiryIndex(index);
    })
    .flat();

  await Promise.all(
    markets.map(async (market) => {
      let markPrice = utils.convertNativeBNToDecimal(
        Exchange.greeks.markPrices[market.marketIndex]
      );

      let bidPrice = utils.convertDecimalToNativeInteger(
        Math.max(0.01, markPrice - 0.1)
      );
      let askPrice = utils.convertDecimalToNativeInteger(markPrice + 0.1);

      let size = utils.convertDecimalToNativeLotSize(Math.random() * 100);

      await Promise.all(
        [0, 1].map(async (index) => {
          let price = index == 0 ? bidPrice : askPrice;
          price = Math.floor(price / TICKSIZE) * TICKSIZE;
          let side = index == 0 ? types.Side.BID : types.Side.ASK;
          try {
            await client.placeOrder(market.address, price, size, side);
          } catch (e) {}
        })
      );
    })
  );
}

const main = async () => {
  //Aidropping Solana
  console.log("Attempting airdrop...");
  await airdropConnection.requestAirdrop(wallet.publicKey, 1000000000);
  console.log("airdrop complete...");

  const connection = new Connection(process.env.devnet, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });

  await Exchange.load(
    new PublicKey(process.env.program_id),
    Network.DEVNET,
    connection,
    utils.defaultCommitment(),
    wallet,
    0
  );

  console.log("Exchange loaded");

  client = await Client.load(
    connection,
    wallet,
    utils.defaultCommitment(),
    callback
  );

  //TODO: this USDC airdrop should only be used for devnet
  const clientUsdcAddress = await utils.getAssociatedTokenAddress(
    Exchange.usdcMintAddress,
    wallet.publicKey
  );
  const clientUsdcAccount = await connection.getAccountInfo(clientUsdcAddress);
  await mintUSDC();
  await utils.sleep(1000);
  await client.deposit(utils.convertDecimalToNativeInteger(STARTING_BALANCE));
  await utils.sleep(1000);

  setInterval(async () => {
    try {
      if (client.marginAccount.balance.lt(new BN(1_000_000))) {
        console.log("Quoter account has low balance!");
        await mintUSDC();
        await client.deposit(
          utils.convertDecimalToNativeInteger(STARTING_BALANCE)
        );
      }
      await refreshQuotes();
    } catch (e) {
      console.log(e);
    }
  }, PULSE_FREQUENCY);

  setInterval(async () => {
    console.log("airdropping SOL");
    await airdropConnection.requestAirdrop(wallet.publicKey, 500000000);
  }, 3_600_000);
};

main().catch(console.error.bind(console));
