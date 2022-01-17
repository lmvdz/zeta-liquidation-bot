/// <reference types="node" />
import * as anchor from "@project-serum/anchor";
import { Commitment, Keypair, ConfirmOptions, PublicKey, Connection, Signer, Transaction, TransactionInstruction, TransactionSignature, AccountInfo } from "@solana/web3.js";
import { TradeEvent } from "./program-types";
import { ClockData, ProgramAccountType } from "./types";
export declare function getState(programId: PublicKey): Promise<[PublicKey, number]>;
export declare function getMarketNode(programId: PublicKey, zetaGroup: PublicKey, marketIndex: number): Promise<[PublicKey, number]>;
export declare function getSettlement(programId: PublicKey, underlyingMint: PublicKey, expirationTs: anchor.BN): Promise<[PublicKey, number]>;
export declare function getOpenOrders(programId: PublicKey, market: PublicKey, userKey: PublicKey): Promise<[PublicKey, number]>;
export declare function createOpenOrdersAddress(programId: PublicKey, market: PublicKey, userKey: PublicKey, nonce: number): Promise<PublicKey>;
export declare function getOpenOrdersMap(programId: PublicKey, openOrders: PublicKey): Promise<[PublicKey, number]>;
export declare function getSerumAuthority(programId: PublicKey): Promise<[PublicKey, number]>;
export declare function getMintAuthority(programId: PublicKey): Promise<[PublicKey, number]>;
export declare function getVault(programId: PublicKey, zetaGroup: PublicKey): Promise<[PublicKey, number]>;
export declare function getSerumVault(programId: PublicKey, mint: PublicKey): Promise<[PublicKey, number]>;
export declare function getZetaVault(programId: PublicKey, mint: PublicKey): Promise<[PublicKey, number]>;
export declare function getZetaInsuranceVault(programId: PublicKey, zetaGroup: PublicKey): Promise<[PublicKey, number]>;
export declare function getUserInsuranceDepositAccount(programId: PublicKey, zetaGroup: PublicKey, userKey: PublicKey): Promise<[PublicKey, number]>;
export declare function getUserWhitelistDepositAccount(programId: PublicKey, userKey: PublicKey): Promise<[PublicKey, number]>;
export declare function getUserWhitelistInsuranceAccount(programId: PublicKey, userKey: PublicKey): Promise<[PublicKey, number]>;
export declare function getUserWhitelistTradingFeesAccount(programId: PublicKey, userKey: PublicKey): Promise<[PublicKey, number]>;
export declare function getZetaGroup(programId: PublicKey, mint: PublicKey): Promise<[PublicKey, number]>;
export declare function getUnderlying(programId: PublicKey, underlyingIndex: number): Promise<[PublicKey, number]>;
export declare function getGreeks(programId: PublicKey, zetaGroup: PublicKey): Promise<[PublicKey, number]>;
export declare function getMarketIndexes(programId: PublicKey, zetaGroup: PublicKey): Promise<[PublicKey, number]>;
export declare function getBaseMint(programId: PublicKey, market: PublicKey): Promise<[PublicKey, number]>;
export declare function getQuoteMint(programId: PublicKey, market: PublicKey): Promise<[PublicKey, number]>;
export declare function getMarginAccount(programId: PublicKey, zetaGroup: PublicKey, userKey: PublicKey): Promise<[PublicKey, number]>;
export declare function getMarketUninitialized(programId: PublicKey, zetaGroup: PublicKey, marketIndex: number): Promise<[PublicKey, number]>;
export declare function getSocializedLossAccount(programId: PublicKey, zetaGroup: PublicKey): Promise<[PublicKey, number]>;
/**
 * Returns the expected PDA by serum to own the serum vault
 * Serum uses a u64 as nonce which is not the same as
 * normal solana PDA convention and goes 0 -> 255
 */
export declare function getSerumVaultOwnerAndNonce(market: PublicKey, dexPid: PublicKey): Promise<[PublicKey, anchor.BN]>;
/**
 * Serum interprets publickeys as [u64; 4]
 * Which requires swap64 sorting.
 */
export declare function sortOpenOrderKeys(keys: PublicKey[]): PublicKey[];
/**
 * Normal sorting of keys
 */
export declare function sortMarketKeys(keys: PublicKey[]): PublicKey[];
/**
 * Converts a decimal number to native fixed point integer of precision 6.
 */
export declare function convertDecimalToNativeInteger(amount: number): number;
/**
 * Returns the trade event price. This may return a number that
 * does not divide perfectly by tick size (0.0001) if your order traded
 * against orders at different prices.
 */
export declare function getTradeEventPrice(event: TradeEvent): number;
/**
 * Converts a native fixed point integer of precision 6 to decimal.
 */
export declare function convertNativeIntegerToDecimal(amount: number): number;
/**
 * Converts a program BN to a decimal number.
 * @param pricing   whether the BN you are converting is a pricing BN - defaults to false.
 */
export declare function convertNativeBNToDecimal(number: anchor.BN, precision?: number): number;
/**
 * Converts a native lot size where 1 unit = 0.001 lots to human readable decimal
 * @param amount
 */
export declare function convertNativeLotSizeToDecimal(amount: number): number;
/**
 * Converts a native lot size where 1 unit = 0.001 lots to human readable decimal
 * @param amount
 */
export declare function convertDecimalToNativeLotSize(amount: number): number;
export declare function getTokenMint(connection: Connection, key: PublicKey): Promise<PublicKey>;
/**
 * Copied from @solana/spl-token but their version requires you to
 * construct a Token object which is completely unnecessary
 */
export declare function getTokenAccountInfo(connection: Connection, key: PublicKey): Promise<any>;
export declare function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): Promise<PublicKey>;
export declare function defaultCommitment(): ConfirmOptions;
export declare function commitmentConfig(commitment: Commitment): ConfirmOptions;
export declare function processTransaction(provider: anchor.Provider, tx: Transaction, signers?: Array<Signer>, opts?: ConfirmOptions): Promise<TransactionSignature>;
export declare function getClockData(accountInfo: AccountInfo<Buffer>): ClockData;
export declare function getPriceFromSerumOrderKey(key: anchor.BN): anchor.BN;
export declare function splitIxsIntoTx(ixs: TransactionInstruction[], ixsPerTx: number): Transaction[];
export declare function sleep(ms: number): Promise<void>;
export declare function getOrderedMarketIndexes(): number[];
export declare function getDirtySeriesIndices(): number[];
/**
 * Given a market index, return the index to access the greeks.productGreeks.
 */
export declare function getGreeksIndex(marketIndex: number): number;
export declare function displayState(): void;
export declare function getMarginFromOpenOrders(openOrders: PublicKey, marketIndex: number): Promise<anchor.web3.PublicKey>;
export declare function getNextStrikeInitialisationTs(): number;
export declare function cleanZetaMarkets(marketAccountTuples: any[]): Promise<void>;
export declare function cleanZetaMarketsHalted(marketAccountTuples: any[]): Promise<void>;
export declare function settleUsers(userAccounts: any[], expiryTs: anchor.BN): Promise<void>;
export declare function crankMarket(marketIndex: number, openOrdersToMargin?: Map<PublicKey, PublicKey>): Promise<void>;
export declare function expireSeries(expiryTs: anchor.BN): Promise<void>;
/**
 * Get the most recently expired index
 */
export declare function getMostRecentExpiredIndex(): number;
export declare function getMutMarketAccounts(marketIndex: number): Object[];
export declare function getCancelAllIxs(orders: any[], expiration: boolean): Promise<TransactionInstruction[]>;
export declare function writeKeypair(filename: string, keypair: Keypair): Promise<void>;
export declare function getAllProgramAccountAddresses(accountType: ProgramAccountType): Promise<PublicKey[]>;
