require("dotenv").config();

import * as anchor from "@project-serum/anchor";
import {
  Wallet,
  Exchange,
  Network,
  utils,
  constants,
  programTypes,
} from "@zetamarkets/sdk";
import { Commitment, PublicKey, Connection, Keypair } from "@solana/web3.js";
import fetch from "node-fetch";

const NETWORK_URL = process.env["network_url"]!;
const SERVER_URL = process.env["server_url"];
const PROGRAM_ID = new PublicKey(process.env["program_id"]);
const STARTING_BALANCE = 10_000;
let network: Network;

switch (process.env["network"]) {
  case "localnet":
    network = Network.LOCALNET;
    break;
  case "devnet":
    network = Network.DEVNET;
    break;
  case "mainnet":
    network = Network.MAINNET;
    break;
  default:
    throw Error("Unsupported network type!");
}

console.log(NETWORK_URL);

async function main() {
  // Create a solana web3 connection to devnet.
  const connection: Connection = new Connection(NETWORK_URL, "confirmed");

  console.error(`Settlement price`);
}

main();
