import { PublicKey } from "@solana/web3.js";
import fetch from "node-fetch";

export async function airdropUsdc(publicKey: PublicKey, amount: number) {
  const body = {
    key: publicKey.toString(),
    amount,
  };
  await fetch(`https://server.zeta.markets/faucet/USDC`, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}