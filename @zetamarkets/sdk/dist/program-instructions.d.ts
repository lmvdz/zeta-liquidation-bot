import { PublicKey, TransactionInstruction, Transaction } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Side } from "./types";
export declare function initializeMarginAccountTx(userKey: PublicKey): Promise<Transaction>;
export declare function initializeInsuranceDepositAccountIx(userKey: PublicKey, userWhitelistInsuranceKey: PublicKey): Promise<TransactionInstruction>;
/**
 * @param amount the native amount to deposit (6dp)
 */
export declare function depositIx(amount: number, marginAccount: PublicKey, usdcAccount: PublicKey, userKey: PublicKey, whitelistDepositAccount: PublicKey | undefined): Promise<TransactionInstruction>;
/**
 * @param amount
 * @param insuranceDepositAccount
 * @param usdcAccount
 * @param userKey
 */
export declare function depositInsuranceVaultIx(amount: number, insuranceDepositAccount: PublicKey, usdcAccount: PublicKey, userKey: PublicKey): TransactionInstruction;
export declare function withdrawInsuranceVaultIx(percentageAmount: number, insuranceDepositAccount: PublicKey, usdcAccount: PublicKey, userKey: PublicKey): TransactionInstruction;
/**
 * @param amount the native amount to withdraw (6dp)
 */
export declare function withdrawIx(amount: number, marginAccount: PublicKey, usdcAccount: PublicKey, userKey: PublicKey): TransactionInstruction;
export declare function initializeOpenOrdersIx(market: PublicKey, userKey: PublicKey, marginAccount: PublicKey): Promise<[TransactionInstruction, PublicKey]>;
export declare function placeOrderIx(marketIndex: number, price: number, size: number, side: Side, clientOrderId: number, marginAccount: PublicKey, authority: PublicKey, openOrders: PublicKey, whitelistTradingFeesAccount: PublicKey | undefined): TransactionInstruction;
export declare function cancelOrderIx(marketIndex: number, userKey: PublicKey, marginAccount: PublicKey, openOrders: PublicKey, orderId: anchor.BN, side: Side): TransactionInstruction;
export declare function cancelOrderByClientOrderIdIx(marketIndex: number, userKey: PublicKey, marginAccount: PublicKey, openOrders: PublicKey, clientOrderId: anchor.BN): TransactionInstruction;
export declare function cancelExpiredOrderIx(marketIndex: number, marginAccount: PublicKey, openOrders: PublicKey, orderId: anchor.BN, side: Side): TransactionInstruction;
export declare function forceCancelOrdersIx(marketIndex: number, marginAccount: PublicKey, openOrders: PublicKey): TransactionInstruction;
export declare function initializeZetaMarketTxs(marketIndex: number, seedIndex: number, requestQueue: PublicKey, eventQueue: PublicKey, bids: PublicKey, asks: PublicKey, marketIndexes: PublicKey): Promise<[Transaction, Transaction]>;
export declare function initializeZetaGroupIx(underlyingMint: PublicKey, oracle: PublicKey, pricingArgs: InitializeZetaGroupPricingArgs, marginArgs: UpdateMarginParametersArgs): Promise<TransactionInstruction>;
export declare function rebalanceInsuranceVaultIx(remainingAccounts: any[]): TransactionInstruction;
export declare function liquidateIx(liquidator: PublicKey, liquidatorMarginAccount: PublicKey, market: PublicKey, liquidatedMarginAccount: PublicKey, size: number): TransactionInstruction;
export declare function crankMarketIx(market: PublicKey, eventQueue: PublicKey, dexProgram: PublicKey, remainingAccounts: any[]): TransactionInstruction;
export declare function initializeMarketNodeIx(index: number): Promise<TransactionInstruction>;
export declare function retreatMarketNodesIx(expiryIndex: number): TransactionInstruction;
export declare function updatePricingIx(expiryIndex: number): TransactionInstruction;
export declare function updatePricingParametersIx(args: UpdatePricingParametersArgs, admin: PublicKey): TransactionInstruction;
export declare function updateMarginParametersIx(args: UpdateMarginParametersArgs, admin: PublicKey): TransactionInstruction;
export declare function updateVolatilityNodesIx(nodes: Array<anchor.BN>, admin: PublicKey): TransactionInstruction;
export declare function initializeZetaStateIx(stateAddress: PublicKey, stateNonce: number, serumAuthority: PublicKey, serumNonce: number, mintAuthority: PublicKey, mintAuthorityNonce: number, params: StateParams): TransactionInstruction;
export declare function updateZetaStateIx(params: StateParams, admin: PublicKey): TransactionInstruction;
export declare function initializeMarketIndexesIx(marketIndexes: PublicKey, nonce: number): TransactionInstruction;
export declare function addMarketIndexesIx(marketIndexes: PublicKey): TransactionInstruction;
export declare function initializeMarketStrikesIx(): TransactionInstruction;
export declare function initializeWhitelistDepositAccountIx(user: PublicKey, admin: PublicKey): Promise<TransactionInstruction>;
export declare function initializeWhitelistInsuranceAccountIx(user: PublicKey, admin: PublicKey): Promise<TransactionInstruction>;
export declare function initializeWhitelistTradingFeesAccountIx(user: PublicKey, admin: PublicKey): Promise<TransactionInstruction>;
export declare function settlePositionsTxs(expirationTs: anchor.BN, settlementPda: PublicKey, nonce: number, marginAccounts: any[]): Transaction[];
export declare function settlePositionsIx(expirationTs: anchor.BN, settlementPda: PublicKey, nonce: number, marginAccounts: any[]): TransactionInstruction;
export declare function settlePositionsHaltedTxs(marginAccounts: any[], admin: PublicKey): Transaction[];
export declare function settlePositionsHaltedIx(marginAccounts: any[], admin: PublicKey): TransactionInstruction;
export declare function cleanZetaMarketsIx(marketAccounts: any[]): TransactionInstruction;
export declare function cleanZetaMarketsHaltedIx(marketAccounts: any[]): TransactionInstruction;
export declare function updatePricingHaltedIx(expiryIndex: number, admin: PublicKey): TransactionInstruction;
export declare function cleanMarketNodesIx(expiryIndex: number): TransactionInstruction;
export declare function cancelOrderHaltedIx(marketIndex: number, marginAccount: PublicKey, openOrders: PublicKey, orderId: anchor.BN, side: Side): TransactionInstruction;
export declare function haltZetaGroupIx(zetaGroupAddress: PublicKey, admin: PublicKey): TransactionInstruction;
export declare function unhaltZetaGroupIx(zetaGroupAddress: PublicKey, admin: PublicKey): TransactionInstruction;
export declare function updateHaltStateIx(zetaGroupAddress: PublicKey, args: UpdateHaltStateArgs, admin: PublicKey): TransactionInstruction;
export declare function updateVolatilityIx(args: UpdateVolatilityArgs, admin: PublicKey): TransactionInstruction;
export declare function updateInterestRateIx(args: UpdateInterestRateArgs, admin: PublicKey): TransactionInstruction;
export declare function updateAdminIx(admin: PublicKey, newAdmin: PublicKey): TransactionInstruction;
export declare function expireSeriesOverrideIx(admin: PublicKey, settlementAccount: PublicKey, args: ExpireSeriesOverrideArgs): TransactionInstruction;
export interface ExpireSeriesOverrideArgs {
    settlementNonce: number;
    settlementPrice: anchor.BN;
}
export interface UpdateHaltStateArgs {
    spotPrice: anchor.BN;
    timestamp: anchor.BN;
}
export interface UpdateVolatilityArgs {
    expiryIndex: number;
    volatility: Array<anchor.BN>;
}
export interface UpdateInterestRateArgs {
    expiryIndex: number;
    interestRate: anchor.BN;
}
export interface StateParams {
    expiryIntervalSeconds: number;
    newExpiryThresholdSeconds: number;
    strikeInitializationThresholdSeconds: number;
    pricingFrequencySeconds: number;
    liquidatorLiquidationPercentage: number;
    insuranceVaultLiquidationPercentage: number;
    nativeTradeFeePercentage: anchor.BN;
    nativeUnderlyingFeePercentage: anchor.BN;
    nativeWhitelistUnderlyingFeePercentage: anchor.BN;
    nativeDepositLimit: anchor.BN;
    expirationThresholdSeconds: number;
}
export interface UpdatePricingParametersArgs {
    optionTradeNormalizer: anchor.BN;
    futureTradeNormalizer: anchor.BN;
    maxVolatilityRetreat: anchor.BN;
    maxInterestRetreat: anchor.BN;
    maxDelta: anchor.BN;
    minDelta: anchor.BN;
    minInterestRate: anchor.BN;
    maxInterestRate: anchor.BN;
    minVolatility: anchor.BN;
    maxVolatility: anchor.BN;
}
export interface InitializeZetaGroupPricingArgs {
    interestRate: anchor.BN;
    volatility: Array<anchor.BN>;
    optionTradeNormalizer: anchor.BN;
    futureTradeNormalizer: anchor.BN;
    maxVolatilityRetreat: anchor.BN;
    maxInterestRetreat: anchor.BN;
    minDelta: anchor.BN;
    maxDelta: anchor.BN;
    minInterestRate: anchor.BN;
    maxInterestRate: anchor.BN;
    minVolatility: anchor.BN;
    maxVolatility: anchor.BN;
}
export interface UpdateMarginParametersArgs {
    futureMarginInitial: anchor.BN;
    futureMarginMaintenance: anchor.BN;
    optionMarkPercentageLongInitial: anchor.BN;
    optionSpotPercentageLongInitial: anchor.BN;
    optionSpotPercentageShortInitial: anchor.BN;
    optionDynamicPercentageShortInitial: anchor.BN;
    optionMarkPercentageLongMaintenance: anchor.BN;
    optionSpotPercentageLongMaintenance: anchor.BN;
    optionSpotPercentageShortMaintenance: anchor.BN;
    optionDynamicPercentageShortMaintenance: anchor.BN;
    optionShortPutCapPercentage: anchor.BN;
}
