import { InsuranceDepositAccount } from "./program-types";
import { PublicKey, Connection, ConfirmOptions, TransactionSignature } from "@solana/web3.js";
import { Wallet } from "./types";
export declare class InsuranceClient {
    /**
     * Returns the user wallet public key.
     */
    get publicKey(): PublicKey;
    /**
     * Anchor provider for client, including wallet.
     */
    private _provider;
    /**
     * Anchor program wrapper for the IDL.
     */
    private _program;
    /**
     * InsuranceCLient insurance vault deposit account to track how much they deposited / are allowed to withdraw
     */
    get insuranceDepositAccount(): InsuranceDepositAccount | null;
    private _insuranceDepositAccount;
    /**
     * InsuranceClient insurance vault deposit account address
     */
    get insuranceDepositAccountAddress(): PublicKey;
    private _insuranceDepositAccountAddress;
    /**
     * InsuranceClient white list insurance account address
     */
    get whitelistInsuranceAccountAddress(): PublicKey | null;
    private _whitelistInsuranceAccountAddress;
    /**
     * InsuranceClient usdc account address.
     */
    get usdcAccountAddress(): PublicKey;
    private _usdcAccountAddress;
    private constructor();
    /**
     * Returns a new instance of InsuranceClient based of the Exchange singleton
     * Requires Exchange to be loaded
     */
    static load(connection: Connection, wallet: Wallet, opts?: ConfirmOptions): Promise<InsuranceClient>;
    /**
     * @param amount the native amount to deposit to the insurance vault (6 d.p)
     */
    deposit(amount: number): Promise<TransactionSignature>;
    /**
     * @param percentageAmount the percentage amount to withdraw from the insurance vault (integer percentage)
     */
    withdraw(percentageAmount: number): Promise<TransactionSignature>;
    updateInsuranceDepositAccount(): Promise<void>;
    private usdcAccountCheck;
    insuranceWhitelistCheck(): Promise<void>;
}
