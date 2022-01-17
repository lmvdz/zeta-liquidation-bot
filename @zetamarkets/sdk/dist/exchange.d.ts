import * as anchor from "@project-serum/anchor";
import { PublicKey, Connection, ConfirmOptions } from "@solana/web3.js";
import { Greeks, ExpirySeries, State, ZetaGroup } from "./program-types";
import { ZetaGroupMarkets } from "./market";
import { RiskCalculator } from "./risk";
import { EventType } from "./events";
import { Network } from "./network";
import { Oracle } from "./oracle";
import { MarginParams, DummyWallet, Wallet } from "./types";
import * as instructions from "./program-instructions";
export declare class Exchange {
    /**
     * Whether the object has been loaded.
     */
    get isInitialized(): boolean;
    private _isInitialized;
    /**
     * The solana network being used.
     */
    get network(): Network;
    private _network;
    /**
     * Anchor program instance.
     */
    get program(): anchor.Program;
    private _program;
    get programId(): PublicKey;
    /**
     * Anchor provider instance.
     */
    get provider(): anchor.Provider;
    get connection(): Connection;
    private _provider;
    /**
     * Account storing zeta state.
     */
    get state(): State;
    private _state;
    /**
     * Account storing zeta group account info.
     */
    get zetaGroup(): ZetaGroup;
    private _zetaGroup;
    /**
     * Address of state account.
     */
    get stateAddress(): PublicKey;
    private _stateAddress;
    /**
     * Address of zeta group account.
     */
    get zetaGroupAddress(): PublicKey;
    private _zetaGroupAddress;
    /**
     * Zeta PDA for serum market authority
     */
    get serumAuthority(): PublicKey;
    private _serumAuthority;
    /**
     * Zeta PDA for minting serum mints
     */
    get mintAuthority(): PublicKey;
    private _mintAuthority;
    /**
     * Public key used as the stable coin mint.
     */
    get usdcMintAddress(): PublicKey;
    private _usdcMintAddress;
    /**
     * Public key for a given zeta group vault.
     */
    get vaultAddress(): PublicKey;
    private _vaultAddress;
    /**
     * Public key for insurance vault.
     */
    get insuranceVaultAddress(): PublicKey;
    private _insuranceVaultAddress;
    /**
     * Public key for socialized loss account.
     */
    get socializedLossAccountAddress(): PublicKey;
    private _socializedLossAccountAddress;
    /**
     * Returns the markets object.
     */
    get markets(): ZetaGroupMarkets;
    get numMarkets(): number;
    private _markets;
    private _eventEmitters;
    /**
     * Stores the latest timestamp received by websocket subscription
     * to the system clock account.
     */
    get clockTimestamp(): number;
    private _clockTimestamp;
    /**
     * Stores the latest clock slot from clock subscription.
     */
    get clockSlot(): number;
    private _clockSlot;
    /**
     * Websocket subscription id for clock.
     */
    private _clockSubscriptionId;
    /**
     * Account storing all the greeks.
     */
    get greeks(): Greeks;
    private _greeks;
    get greeksAddress(): PublicKey;
    private _greeksAddress;
    get marginParams(): MarginParams;
    private _marginParams;
    /**
     * @param interval   How often to poll zeta group and state in seconds.
     */
    get pollInterval(): number;
    set pollInterval(interval: number);
    private _pollInterval;
    private _lastPollTimestamp;
    get oracle(): Oracle;
    private _oracle;
    /**
     * Risk calculator that holds all margin requirements.
     */
    get riskCalculator(): RiskCalculator;
    private _riskCalculator;
    get frontExpirySeries(): ExpirySeries;
    get halted(): boolean;
    private _programSubscriptionIds;
    private init;
    initialize(programId: PublicKey, network: Network, connection: Connection, wallet: Wallet, params: instructions.StateParams, opts?: ConfirmOptions): Promise<void>;
    /**
     * Loads a fresh instance of the exchange object using on chain state.
     * @param throttle    Whether to sleep on market loading for rate limit reasons.
     */
    load(programId: PublicKey, network: Network, connection: Connection, opts: ConfirmOptions, wallet?: DummyWallet, throttleMs?: number, callback?: (event: EventType, data: any) => void): Promise<void>;
    /**
     * Initializes the market nodes for a zeta group.
     */
    initializeMarketNodes(zetaGroup: PublicKey): Promise<void>;
    /**
     * Initializes a zeta group
     */
    initializeZetaGroup(oracle: PublicKey, pricingArgs: instructions.InitializeZetaGroupPricingArgs, marginArgs: instructions.UpdateMarginParametersArgs, callback?: (type: EventType, data: any) => void): Promise<void>;
    /**
     * Update the expiry state variables for the program.
     */
    updateZetaState(params: instructions.StateParams): Promise<void>;
    /**
     * Update the pricing parameters for a zeta group.
     */
    updatePricingParameters(args: instructions.UpdatePricingParametersArgs): Promise<void>;
    /**
     * Update the margin parameters for a zeta group.
     */
    updateMarginParameters(args: instructions.UpdateMarginParametersArgs): Promise<void>;
    /**
     * Update the volatility nodes for a surface.
     */
    updateVolatilityNodes(nodes: Array<anchor.BN>): Promise<void>;
    /**
     * Initializes the zeta markets for a zeta group.
     */
    initializeZetaMarkets(): Promise<void>;
    /**
     * Will throw if it is not strike initialization time.
     */
    initializeMarketStrikes(): Promise<void>;
    /**
     * Polls the on chain account to update state.
     */
    updateState(): Promise<void>;
    /**
     * Polls the on chain account to update zeta group.
     */
    updateZetaGroup(): Promise<void>;
    /**
     * Update pricing for an expiry index.
     */
    updatePricing(expiryIndex: number): Promise<void>;
    /**
     * Retreat volatility surface and interest rates for an expiry index.
     */
    retreatMarketNodes(expiryIndex: number): Promise<void>;
    assertInitialized(): void;
    private subscribeZetaGroup;
    private setClockData;
    private subscribeClock;
    private subscribeGreeks;
    private subscribeOracle;
    private handlePolling;
    /**
     * @param index   market index to get mark price.
     */
    getMarkPrice(index: number): number;
    /**
     * @param user user pubkey to be whitelisted for uncapped deposit
     */
    whitelistUserForDeposit(user: PublicKey): Promise<void>;
    /**
     * @param user user pubkey to be whitelisted for our insurance vault
     */
    whitelistUserForInsuranceVault(user: PublicKey): Promise<void>;
    /**
     * @param user user pubkey to be whitelisted for trading fees
     */
    whitelistUserForTradingFees(user: PublicKey): Promise<void>;
    /**
     *
     * @param marginAccounts an array of remaining accounts (margin accounts) that will be rebalanced
     */
    rebalanceInsuranceVault(marginAccounts: any[]): Promise<void>;
    /**
     * Helper function to get the deposit limits
     */
    getDepositLimit(): Promise<number>;
    addProgramSubscriptionId(id: number): void;
    /**
     * Close the websockets.
     */
    close(): Promise<void>;
    updateMarginParams(): void;
    /**
     * Halt zeta group functionality.
     */
    assertHalted(): void;
    haltZetaGroup(zetaGroupAddress: PublicKey): Promise<void>;
    unhaltZetaGroup(zetaGroupAddress: PublicKey): Promise<void>;
    updateHaltState(zetaGroupAddress: PublicKey, args: instructions.UpdateHaltStateArgs): Promise<void>;
    settlePositionsHalted(marginAccounts: any[]): Promise<void>;
    cancelAllOrdersHalted(): Promise<void>;
    cleanZetaMarketsHalted(): Promise<void>;
    updatePricingHalted(expiryIndex: number): Promise<void>;
    cleanMarketNodes(expiryIndex: number): Promise<void>;
    updateVolatility(args: instructions.UpdateVolatilityArgs): Promise<void>;
    updateInterestRate(args: instructions.UpdateInterestRateArgs): Promise<void>;
}
export declare const exchange: Exchange;
