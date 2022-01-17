import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
    Client,
    Exchange,
    Network,
    Wallet,
    utils,
    types,
} from "@zetamarkets/sdk";

import {
    cancelAllActiveOrders,
    findAccountsAtRisk,
    findLiquidatableAccounts,
    liquidateAccounts,
} from "./liquidator-utils.js";

import * as anchor from "@project-serum/anchor";


import { config } from 'dotenv';
import { MarginAccount } from "@zetamarkets/sdk/dist/program-types";
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

const PROGRAM_ID = new PublicKey('ZETAxsqBRek56DhiGXrn75yj2NHU3aYUnxvHXpkf3aD');


const connection = new Connection(process.env.ENDPOINT_URL, utils.defaultCommitment());
const wallet = new Wallet(keypair);

let scanning: boolean = false;



const main = async () => {
    await Exchange.load(
        PROGRAM_ID,
        Network.MAINNET,
        connection,
        utils.defaultCommitment(),
        undefined, // Exchange wallet can be ignored for normal clients.
        0, // ThrottleMs - increase if you are running into rate limit issues on startup.
        undefined // Callback - See below for more details.
    )
    const client = await Client.load(
        connection,
        wallet, // Use the loaded wallet.
        utils.defaultCommitment(),
        undefined // Callback - See below for more details.
    )
    console.log('margin acc balance: ', client.marginAccount.balance.toNumber() / (10 ** 6))
    subscribeAllMarginAccounts()
    setInterval(async () => {
        console.clear();
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

const marginAccountMap : Map<string, anchor.ProgramAccount> = new Map<string, anchor.ProgramAccount>();

export function subscribeAllMarginAccounts() {
    Exchange.program.account.marginAccount.all().then((marginAccounts: anchor.ProgramAccount[]) => {
        marginAccounts.forEach(marginAccount => {
            if (!marginAccountMap.has(marginAccount.publicKey.toBase58())) {
                marginAccountMap.set(marginAccount.publicKey.toBase58(), marginAccount);
            }
            Exchange.program.account.marginAccount.subscribe(marginAccountMap.get(marginAccount.publicKey.toBase58()).publicKey).on('change', (data) => {
                // console.log('margin account', marginAccount.publicKey.toBase58(), ' changed');
                marginAccountMap.set(marginAccount.publicKey.toBase58(), { publicKey: marginAccountMap.get(marginAccount.publicKey.toBase58()).publicKey, account: { ...marginAccountMap.get(marginAccount.publicKey.toBase58()).account, ...data}});
            })
        })
    });
}



  // Function that will do a few things sequentially.
  // 1. Get all margin accounts for the program.
  // 2. Cancel all active orders for accounts at risk. (This is required to liquidate an account)
  // 3. Naively liquidate all margin accounts at risk up to your own margin account available balance limit.
  export async function scanMarginAccounts(client: Client) {
    // Just early exit if previous scan is still running.
    if (scanning) {
      return;
    }
    // console.log(`Scanning margin accounts...`);
    scanning = true;
    // console.log(`${marginAccountMap.size} margin accounts.`);
  
    let accountsAtRisk = await findAccountsAtRisk([...marginAccountMap.values()]);
    if (accountsAtRisk.length == 0) {
    //   console.log("No accounts at risk.");
      scanning = false;
      return;
    }
  
    // We need to cancel all orders on accounts that are at risk
    // before we are able to liquidate them.
    await cancelAllActiveOrders(client, accountsAtRisk);
  
    // Liquidate the accounts that are under water exclusive of initial
    // margin as cancelling active orders reduces initial margin to 0.
    let liquidatableAccounts: anchor.ProgramAccount[] =
      await findLiquidatableAccounts(accountsAtRisk);
  
    await liquidateAccounts(client, liquidatableAccounts);
    // Display the latest client state.
    await client.updateState();
    let clientMarginAccountState = Exchange.riskCalculator.getMarginAccountState(
      client.marginAccount
    );
    console.log(
      `Client margin account state: ${JSON.stringify(clientMarginAccountState)}`
    );
    scanning = false;
  }

const mainLoop = () => {
    main().catch(error => {
        console.error(error);
        mainLoop();
    })
}

mainLoop();



