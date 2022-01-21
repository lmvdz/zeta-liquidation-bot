import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
    Client,
    Exchange,
    Network,
    Wallet,
    utils,
    types,
    programTypes,
} from "@zetamarkets/sdk";

import { airdropUsdc } from "./utils.js";

import {
    findAccountsForLiquidation,
    liquidateAccounts
} from "./liquidator-utils.js";

import * as anchor from "@project-serum/anchor";


import { config } from 'dotenv';
import axios from "axios";

config({path: './.env.local'});

const to_b58 = function(B,A){var d=[],s="",i,j,c,n;for(i in B){j=0,c=B[i];s+=c||s.length^i?"":1;while(j in d||c){n=d[j];n=n?n*256+c:c;c=n/58|0;d[j]=n%58;j++}}while(j--)s+=A[d[j]];return s};
const from_b58 = function(S,A){var d=[],b=[],i,j,c,n;for(i in S){j=0,c=A.indexOf(S[i]);if(c<0)return undefined;c||b.length^i?i:b.push(0);while(j in d||c){n=d[j];n=n?n*58+c:c;c=n>>8;d[j]=n%256;j++}}while(j--)b.push(d[j]);return new Uint8Array(b)};


const botKeyEnvVariable = "BOT_KEY"
// ENVIRONMENT VARIABLE FOR THE BOT PRIVATE KEY
const botKey = process.env[botKeyEnvVariable]

if (botKey === undefined) {
    console.error('need a ' + botKeyEnvVariable +' env variable');
    process.exit()
}
// setup wallet
let keypair : Keypair;

try {
    keypair = Keypair.fromSecretKey(
        from_b58(botKey, "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")!
    );
} catch {
    try {
        keypair = Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(botKey))
        );
    } catch (e) {
        console.error(e);
        console.error('Failed to parse private key from Uint8Array (solana-keygen) and base58 encoded string (phantom wallet export)')
        process.exit();
    }
}

const MAINNET = true;

const PROGRAM_ID = MAINNET ? new PublicKey('ZETAxsqBRek56DhiGXrn75yj2NHU3aYUnxvHXpkf3aD') : new PublicKey('BG3oRikW8d16YjUEmX3ZxHm9SiJzrGtMhsSR8aCw1Cd7')

const ENDPOINT = MAINNET ? process.env.ENDPOINT_URL : process.env.DEVNET_ENDPOINT_URL;

const connection = new Connection(ENDPOINT, { commitment: "processed" });
const wallet = new Wallet(keypair);

let scanning: boolean = false;



async function updatePricing() {
    // Get relevant expiry indices.
    let indicesToCrank = [];
    for (var i = 0; i < Exchange.markets.expirySeries.length; i++) {
      let expirySeries = Exchange.markets.expirySeries[i];
      if (
        Exchange.clockTimestamp <= expirySeries.expiryTs &&
        expirySeries.strikesInitialized &&
        !expirySeries.dirty
      ) {
        indicesToCrank.push(i);
      }
    }
    await Promise.all(
      indicesToCrank.map(async (index) => {
        try {
          console.log(`Update pricing index ${index}`);
          await Exchange.updatePricing(index);
        } catch (e) {
          console.error(`Index ${index}: Update pricing failed. ${e}`);
        }
      })
    );
  }


const main = async () => {
    await airdropUsdc(wallet.publicKey, 1_000_000);
    await Exchange.load(
        PROGRAM_ID,
        MAINNET ? Network.MAINNET : Network.DEVNET,
        connection,
        { commitment: "processed" },
        wallet, // Use the loaded wallet.
        0, // ThrottleMs - increase if you are running into rate limit issues on startup.]
        undefined
    )
    
    const client = await Client.load(
        connection,
        wallet, // Use the loaded wallet.
        { commitment: "processed" },
        undefined // Callback - See below for more details.
    )
    // Exchange.markets.markets.forEach(async (market, index) => {
    //     await market.updateOrderbook()
    // })
    // await updatePricing();
    console.log('margin acc balance: ', client.marginAccount.balance.toNumber() / (10 ** 6))
    subscribeAllMarginAccounts()
    // check & subscribe for new margin accounts every minute
    setInterval(async () => {
        // console.clear();
        subscribeAllMarginAccounts()
    }, 60 * 1000)
    setInterval(
        async () => {
            try {
                await scanMarginAccounts(client);
            } catch (e) {
                console.log(`Scan margin account error: ${e}`);
            }
        },
    process.env.CHECK_INTERVAL_MS
        ? parseInt(process.env.CHECK_INTERVAL_MS)
        : 5
    );
}

// hold all margin accounts in memory, no need to get them every time we check.

const marginAccountMap : Map<string, anchor.ProgramAccount> = new Map<string, anchor.ProgramAccount>();


const chunk = (arr, size) => {
  return arr.reduce((acc, val, ind) => {
     const subIndex = ind % size;
     if(!Array.isArray(acc[subIndex])){
        acc[subIndex] = [val];
     } else {
        acc[subIndex].push(val);
     };
     return acc;
  }, []);
};

export async function updateAllMarginAccounts() {
  const chunks = chunk([...marginAccountMap.keys()], 100)
  chunks.forEach(chunk => {
    updateMarginAccounts(chunk);
  })
}

export async function updateMarginAccounts(keys) {

  const dataToDecode = (await axios.post(ENDPOINT, [
    {
      jsonrpc: "2.0",
        id: "1",

        method: "getMultipleAccounts",
        params: [
          keys,
          {
            commitment: "confirmed",
          },
        ],
    }
  ])).data[0];

  dataToDecode.result.value.forEach((marginAccount, i) => {
    const myBuffer = Buffer.from(marginAccount.data[0], marginAccount.data[1]);
    const details = Exchange.program.account.marginAccount.coder.accounts.decode(
      Exchange.program.account.marginAccount._idlAccount.name,
      myBuffer,
    ) as programTypes.MarginAccount;
    marginAccountMap.set(marginAccount.owner, { publicKey: new PublicKey(marginAccount.owner), account: details } as anchor.ProgramAccount);
  });
}

// subscribe to margin account updates
export function subscribeAllMarginAccounts() {

    // console.log(`Scanning margin accounts...`);
    // console.log(process.memoryUsage().heapUsed / process.memoryUsage().heapTotal)
    Exchange.program.account.marginAccount.all().then((marginAccounts: anchor.ProgramAccount[]) => {
        // let newAccounts = 0;
        marginAccounts.forEach(marginAccount => {
            if (!marginAccountMap.has(marginAccount.publicKey.toBase58())) {
                marginAccountMap.set(marginAccount.publicKey.toBase58(), marginAccount);
                // Exchange.program.account.marginAccount.subscribe(marginAccountMap.get(marginAccount.publicKey.toBase58()).publicKey).on('change', (data) => {
                //   // console.log(data);
                //     // console.log('margin account', marginAccount.publicKey.toBase58(), ' changed');
                    
                // })
                // newAccounts++;
            }
        })
        // console.log('found', newAccounts, 'new accounts');
        // console.log(process.memoryUsage().heapUsed / process.memoryUsage().heapTotal)
    });

}



  // Function that will do a few things sequentially.
  // 1. Get all margin accounts for the program.
  // 2. Cancel all active orders for accounts at risk. (This is required to liquidate an account)
  // 3. Naively liquidate all margin accounts at risk up to your own margin account available balance limit.
  export async function scanMarginAccounts(client: Client) {
    // Just early exit if previous scan is still running.
    if (scanning) {
      updateAllMarginAccounts()
      return;
    }
    
    scanning = true;
  
    const liquidatableAccounts = await findAccountsForLiquidation([...marginAccountMap.values()]);
    if (liquidatableAccounts.length == 0) {
      scanning = false;
      return;
    }
  
    const liquidatedAccounts = await liquidateAccounts(client, liquidatableAccounts);
    liquidatedAccounts.map(x => x.filter(y => y !== 'possible profit negative')).forEach((liquidatedAccount) => {
      console.log(liquidatedAccount);
    })
    // Display the latest client state.
    await client.updateState();

    scanning = false;
  }

const mainLoop = () => {
    main().catch(error => {
        console.error(error);
        mainLoop();
    })
}
try {
  mainLoop();
} catch (error) {
  console.error(error);
  if (error.type === 'system' && error.code === 'ETIMEDOUT') {
    process.exit(1);
  }
}




