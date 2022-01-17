"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@project-serum/anchor"));
const web3_js_1 = require("@solana/web3.js");
const utils = __importStar(require("./utils"));
const constants = __importStar(require("./constants"));
const market_1 = require("./market");
const risk_1 = require("./risk");
const events_1 = require("./events");
const network_1 = require("./network");
const oracle_1 = require("./oracle");
const zeta_json_1 = __importDefault(require("./idl/zeta.json"));
const types_1 = require("./types");
const instructions = __importStar(require("./program-instructions"));
class Exchange {
    constructor() {
        this._isInitialized = false;
        this._eventEmitters = [];
        this._pollInterval = constants.DEFAULT_EXCHANGE_POLL_INTERVAL;
        this._programSubscriptionIds = [];
    }
    /**
     * Whether the object has been loaded.
     */
    get isInitialized() {
        return this._isInitialized;
    }
    /**
     * The solana network being used.
     */
    get network() {
        return this._network;
    }
    /**
     * Anchor program instance.
     */
    get program() {
        return this._program;
    }
    get programId() {
        return this._program.programId;
    }
    /**
     * Anchor provider instance.
     */
    get provider() {
        return this._provider;
    }
    get connection() {
        return this._provider.connection;
    }
    /**
     * Account storing zeta state.
     */
    get state() {
        return this._state;
    }
    /**
     * Account storing zeta group account info.
     */
    get zetaGroup() {
        return this._zetaGroup;
    }
    // Program global addresses that will remain constant.
    /**
     * Address of state account.
     */
    get stateAddress() {
        return this._stateAddress;
    }
    /**
     * Address of zeta group account.
     */
    get zetaGroupAddress() {
        return this._zetaGroupAddress;
    }
    /**
     * Zeta PDA for serum market authority
     */
    get serumAuthority() {
        return this._serumAuthority;
    }
    /**
     * Zeta PDA for minting serum mints
     */
    get mintAuthority() {
        return this._mintAuthority;
    }
    /**
     * Public key used as the stable coin mint.
     */
    get usdcMintAddress() {
        return this._usdcMintAddress;
    }
    /**
     * Public key for a given zeta group vault.
     */
    get vaultAddress() {
        return this._vaultAddress;
    }
    /**
     * Public key for insurance vault.
     */
    get insuranceVaultAddress() {
        return this._insuranceVaultAddress;
    }
    /**
     * Public key for socialized loss account.
     */
    get socializedLossAccountAddress() {
        return this._socializedLossAccountAddress;
    }
    /**
     * Returns the markets object.
     */
    get markets() {
        return this._markets;
    }
    get numMarkets() {
        return this._markets.markets.length;
    }
    /**
     * Stores the latest timestamp received by websocket subscription
     * to the system clock account.
     */
    get clockTimestamp() {
        return this._clockTimestamp;
    }
    /**
     * Stores the latest clock slot from clock subscription.
     */
    get clockSlot() {
        return this._clockSlot;
    }
    /**
     * Account storing all the greeks.
     */
    get greeks() {
        return this._greeks;
    }
    get greeksAddress() {
        return this._greeksAddress;
    }
    get marginParams() {
        return this._marginParams;
    }
    /**
     * @param interval   How often to poll zeta group and state in seconds.
     */
    get pollInterval() {
        return this._pollInterval;
    }
    set pollInterval(interval) {
        if (interval < 0) {
            throw Error("Invalid polling interval");
        }
        this._pollInterval = interval;
    }
    /*
     * Oracle object that holds all oracle prices.
     */
    get oracle() {
        return this._oracle;
    }
    /**
     * Risk calculator that holds all margin requirements.
     */
    get riskCalculator() {
        return this._riskCalculator;
    }
    get frontExpirySeries() {
        return this._zetaGroup.expirySeries[this._zetaGroup.frontExpiryIndex];
    }
    get halted() {
        return this._zetaGroup.haltState.halted;
    }
    init(programId, network, connection, wallet, opts) {
        if (exports.exchange.isInitialized) {
            throw "Exchange already initialized";
        }
        this._provider = new anchor.Provider(connection, wallet, opts || utils.commitmentConfig(connection.commitment));
        this._network = network;
        this._program = new anchor.Program(zeta_json_1.default, programId, this._provider);
        this._oracle = new oracle_1.Oracle(this._network, connection);
        this._riskCalculator = new risk_1.RiskCalculator();
        this._lastPollTimestamp = 0;
    }
    async initialize(programId, network, connection, wallet, params, opts) {
        exports.exchange.init(programId, network, connection, wallet, opts);
        const [mintAuthority, mintAuthorityNonce] = await utils.getMintAuthority(programId);
        const [state, stateNonce] = await utils.getState(programId);
        const [serumAuthority, serumNonce] = await utils.getSerumAuthority(programId);
        let tx = new web3_js_1.Transaction().add(instructions.initializeZetaStateIx(state, stateNonce, serumAuthority, serumNonce, mintAuthority, mintAuthorityNonce, params));
        try {
            await utils.processTransaction(this._provider, tx);
        }
        catch (e) {
            console.error(`Initialize zeta state failed: ${e}`);
        }
        exports.exchange._stateAddress = state;
        exports.exchange._serumAuthority = serumAuthority;
        exports.exchange._mintAuthority = mintAuthority;
        exports.exchange._usdcMintAddress = constants.USDC_MINT_ADDRESS[network];
        await exports.exchange.updateState();
        console.log(`Initialized zeta state!`);
        console.log(`Params:
expiryIntervalSeconds=${params.expiryIntervalSeconds},
newExpiryThresholdSeconds=${params.newExpiryThresholdSeconds},
strikeInitializationThresholdSeconds=${params.strikeInitializationThresholdSeconds}
pricingFrequencySeconds=${params.pricingFrequencySeconds}
insuranceVaultLiquidationPercentage=${params.insuranceVaultLiquidationPercentage}
expirationThresholdSeconds=${params.expirationThresholdSeconds}`);
    }
    /**
     * Loads a fresh instance of the exchange object using on chain state.
     * @param throttle    Whether to sleep on market loading for rate limit reasons.
     */
    async load(programId, network, connection, opts, wallet = new types_1.DummyWallet(), throttleMs = 0, callback) {
        console.info(`Loading exchange.`);
        if (exports.exchange.isInitialized) {
            throw "Exchange already loaded.";
        }
        exports.exchange.init(programId, network, connection, wallet, opts);
        // Load variables from state.
        const [mintAuthority, _mintAuthorityNonce] = await utils.getMintAuthority(programId);
        const [state, _stateNonce] = await utils.getState(programId);
        const [serumAuthority, _serumNonce] = await utils.getSerumAuthority(programId);
        exports.exchange._mintAuthority = mintAuthority;
        exports.exchange._stateAddress = state;
        exports.exchange._serumAuthority = serumAuthority;
        // Load zeta group.
        // TODO: Use constants since we only have 1 underlying for now.
        const [underlying, _underlyingNonce] = await utils.getUnderlying(programId, 0);
        let underlyingAccount = await exports.exchange._program.account.underlying.fetch(underlying);
        const [zetaGroup, _zetaGroupNonce] = await utils.getZetaGroup(programId, underlyingAccount.mint);
        exports.exchange._zetaGroupAddress = zetaGroup;
        await exports.exchange.subscribeOracle(callback);
        await exports.exchange.updateState();
        await exports.exchange.updateZetaGroup();
        const [vaultAddress, _vaultNonce] = await utils.getVault(exports.exchange.programId, zetaGroup);
        const [insuranceVaultAddress, _insuranceNonce] = await utils.getZetaInsuranceVault(exports.exchange.programId, exports.exchange.zetaGroupAddress);
        const [socializedLossAccount, _socializedLossAccountNonce] = await utils.getSocializedLossAccount(exports.exchange.programId, exports.exchange._zetaGroupAddress);
        exports.exchange._vaultAddress = vaultAddress;
        exports.exchange._insuranceVaultAddress = insuranceVaultAddress;
        exports.exchange._socializedLossAccountAddress = socializedLossAccount;
        exports.exchange._usdcMintAddress = constants.USDC_MINT_ADDRESS[network];
        if (exports.exchange.zetaGroup.products[exports.exchange.zetaGroup.products.length - 1].market.equals(web3_js_1.PublicKey.default)) {
            throw "Zeta group markets are uninitialized!";
        }
        let [greeks, _greeksNonce] = await utils.getGreeks(exports.exchange.programId, exports.exchange.zetaGroupAddress);
        exports.exchange._greeksAddress = greeks;
        exports.exchange._markets = await market_1.ZetaGroupMarkets.load(opts, throttleMs);
        exports.exchange._greeks = (await exports.exchange.program.account.greeks.fetch(greeks));
        exports.exchange._riskCalculator.updateMarginRequirements();
        // Set callbacks.
        exports.exchange.subscribeZetaGroup(callback);
        exports.exchange.subscribeGreeks(callback);
        await exports.exchange.subscribeClock(callback);
        exports.exchange._isInitialized = true;
        console.log(`Exchange loaded @ ${new Date(exports.exchange.clockTimestamp * 1000)}`);
    }
    /**
     * Initializes the market nodes for a zeta group.
     */
    async initializeMarketNodes(zetaGroup) {
        let indexes = [...Array(constants.ACTIVE_MARKETS).keys()];
        await Promise.all(indexes.map(async (index) => {
            let tx = new web3_js_1.Transaction().add(await instructions.initializeMarketNodeIx(index));
            await utils.processTransaction(this._provider, tx);
        }));
    }
    /**
     * Initializes a zeta group
     */
    async initializeZetaGroup(oracle, pricingArgs, marginArgs, callback) {
        // TODO fix to be dynamic once we support more than 1 underlying.
        // TODO if deployment breaks midway, this won't necessarily represent the index you want to initialize.
        // let underlyingIndex = this.state.numUnderlyings;
        let underlyingMint = constants.UNDERLYINGS[0];
        const [zetaGroup, _zetaGroupNonce] = await utils.getZetaGroup(this.program.programId, underlyingMint);
        this._zetaGroupAddress = zetaGroup;
        let [greeks, _greeksNonce] = await utils.getGreeks(this.programId, this._zetaGroupAddress);
        this._greeksAddress = greeks;
        const [vaultAddress, _vaultNonce] = await utils.getVault(exports.exchange.programId, zetaGroup);
        this._vaultAddress = vaultAddress;
        const [insuranceVaultAddress, _insuranceNonce] = await utils.getZetaInsuranceVault(exports.exchange.programId, exports.exchange.zetaGroupAddress);
        this._insuranceVaultAddress = insuranceVaultAddress;
        const [socializedLossAccount, _socializedLossAccountNonce] = await utils.getSocializedLossAccount(exports.exchange.programId, exports.exchange._zetaGroupAddress);
        this._socializedLossAccountAddress = socializedLossAccount;
        let tx = new web3_js_1.Transaction().add(await instructions.initializeZetaGroupIx(underlyingMint, oracle, pricingArgs, marginArgs));
        try {
            await utils.processTransaction(this._provider, tx);
        }
        catch (e) {
            console.error(`Initialize zeta group failed: ${e}`);
        }
        await this.updateZetaGroup();
        await this.updateState();
        this._greeks = (await exports.exchange.program.account.greeks.fetch(greeks));
        this.subscribeZetaGroup(callback);
        this.subscribeClock(callback);
        this.subscribeGreeks(callback);
        await this.subscribeOracle(callback);
    }
    /**
     * Update the expiry state variables for the program.
     */
    async updateZetaState(params) {
        let tx = new web3_js_1.Transaction().add(instructions.updateZetaStateIx(params, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
        await this.updateState();
    }
    /**
     * Update the pricing parameters for a zeta group.
     */
    async updatePricingParameters(args) {
        let tx = new web3_js_1.Transaction().add(instructions.updatePricingParametersIx(args, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
        await this.updateZetaGroup();
    }
    /**
     * Update the margin parameters for a zeta group.
     */
    async updateMarginParameters(args) {
        let tx = new web3_js_1.Transaction().add(instructions.updateMarginParametersIx(args, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
        await this.updateZetaGroup();
    }
    /**
     * Update the volatility nodes for a surface.
     */
    async updateVolatilityNodes(nodes) {
        if (nodes.length != constants.VOLATILITY_POINTS) {
            throw Error(`Invalid number of nodes. Expected ${constants.VOLATILITY_POINTS}.`);
        }
        let tx = new web3_js_1.Transaction().add(instructions.updateVolatilityNodesIx(nodes, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    /**
     * Initializes the zeta markets for a zeta group.
     */
    async initializeZetaMarkets() {
        // Initialize market indexes.
        let [marketIndexes, marketIndexesNonce] = await utils.getMarketIndexes(this.programId, this._zetaGroupAddress);
        console.log("Initializing market indexes.");
        let tx = new web3_js_1.Transaction().add(instructions.initializeMarketIndexesIx(marketIndexes, marketIndexesNonce));
        try {
            await utils.processTransaction(this._provider, tx);
        }
        catch (e) {
            console.error(`Initialize market indexes failed: ${e}`);
        }
        // We initialize 50 indexes at a time in the program.
        let tx2 = new web3_js_1.Transaction().add(instructions.addMarketIndexesIx(marketIndexes));
        for (var i = 0; i < constants.TOTAL_MARKETS; i += constants.MARKET_INDEX_LIMIT) {
            try {
                await utils.processTransaction(this._provider, tx2);
            }
            catch (e) {
                console.error(`Add market indexes failed: ${e}`);
            }
        }
        let marketIndexesAccount = (await this._program.account.marketIndexes.fetch(marketIndexes));
        if (!marketIndexesAccount.initialized) {
            throw Error("Market indexes are not initialized!");
        }
        let indexes = [...Array(this.zetaGroup.products.length).keys()];
        await Promise.all(indexes.map(async (i) => {
            console.log(`Initializing zeta market ${i + 1}/${this.zetaGroup.products.length}`);
            const requestQueue = anchor.web3.Keypair.generate();
            const eventQueue = anchor.web3.Keypair.generate();
            const bids = anchor.web3.Keypair.generate();
            const asks = anchor.web3.Keypair.generate();
            // Store the keypairs locally.
            utils.writeKeypair(`keys/rq-${i}.json`, requestQueue);
            utils.writeKeypair(`keys/eq-${i}.json`, eventQueue);
            utils.writeKeypair(`keys/bids-${i}.json`, bids);
            utils.writeKeypair(`keys/asks-${i}.json`, asks);
            let [tx, tx2] = await instructions.initializeZetaMarketTxs(i, marketIndexesAccount.indexes[i], requestQueue.publicKey, eventQueue.publicKey, bids.publicKey, asks.publicKey, marketIndexes);
            let initialized = false;
            if (this.network != network_1.Network.LOCALNET) {
                // Validate that the market hasn't already been initialized
                // So no sol is wasted on unnecessary accounts.
                const [market, _marketNonce] = await utils.getMarketUninitialized(this.programId, this._zetaGroupAddress, marketIndexesAccount.indexes[i]);
                let info = await this.provider.connection.getAccountInfo(market);
                if (info !== null) {
                    initialized = true;
                }
            }
            if (initialized) {
                console.log(`Market ${i} already initialized. Skipping...`);
            }
            else {
                try {
                    await this.provider.send(tx, [
                        requestQueue,
                        eventQueue,
                        bids,
                        asks,
                    ]);
                    await this.provider.send(tx2);
                }
                catch (e) {
                    console.error(`Initialize zeta market ${i} failed: ${e}`);
                }
            }
        }));
        console.log("Market initialization complete!");
        await this.updateZetaGroup();
        this._markets = await market_1.ZetaGroupMarkets.load(utils.defaultCommitment(), 0);
        this._isInitialized = true;
    }
    /**
     * Will throw if it is not strike initialization time.
     */
    async initializeMarketStrikes() {
        let tx = new web3_js_1.Transaction().add(instructions.initializeMarketStrikesIx());
        await utils.processTransaction(this._provider, tx);
    }
    /**
     * Polls the on chain account to update state.
     */
    async updateState() {
        this._state = (await this.program.account.state.fetch(this.stateAddress));
    }
    /**
     * Polls the on chain account to update zeta group.
     */
    async updateZetaGroup() {
        this._zetaGroup = (await this.program.account.zetaGroup.fetch(this.zetaGroupAddress));
        this.updateMarginParams();
    }
    /**
     * Update pricing for an expiry index.
     */
    async updatePricing(expiryIndex) {
        let tx = new web3_js_1.Transaction().add(instructions.updatePricingIx(expiryIndex));
        await utils.processTransaction(this._provider, tx);
    }
    /**
     * Retreat volatility surface and interest rates for an expiry index.
     */
    async retreatMarketNodes(expiryIndex) {
        let tx = new web3_js_1.Transaction().add(instructions.retreatMarketNodesIx(expiryIndex));
        await utils.processTransaction(this._provider, tx);
    }
    assertInitialized() {
        if (!this.isInitialized) {
            throw "Exchange uninitialized";
        }
    }
    subscribeZetaGroup(callback) {
        let eventEmitter = this._program.account.zetaGroup.subscribe(this._zetaGroupAddress, this._provider.connection.commitment);
        eventEmitter.on("change", async (zetaGroup) => {
            let expiry = this._zetaGroup !== undefined &&
                this._zetaGroup.frontExpiryIndex !== zetaGroup.frontExpiryIndex;
            this._zetaGroup = zetaGroup;
            if (this._markets !== undefined) {
                this._markets.updateExpirySeries();
            }
            this.updateMarginParams();
            if (callback !== undefined) {
                if (expiry) {
                    callback(events_1.EventType.EXPIRY, null);
                }
                else {
                    callback(events_1.EventType.EXCHANGE, null);
                }
            }
        });
        this._eventEmitters.push(eventEmitter);
    }
    setClockData(data) {
        this._clockTimestamp = data.timestamp;
        this._clockSlot = data.slot;
    }
    async subscribeClock(callback) {
        if (this._clockSubscriptionId !== undefined) {
            throw Error("Clock already subscribed to.");
        }
        this._clockSubscriptionId = this._provider.connection.onAccountChange(web3_js_1.SYSVAR_CLOCK_PUBKEY, async (accountInfo, _context) => {
            this.setClockData(utils.getClockData(accountInfo));
            if (callback !== undefined) {
                callback(events_1.EventType.CLOCK, null);
            }
            try {
                await this.handlePolling(callback);
            }
            catch (e) {
                console.log(`Exchange polling failed. Error: ${e}`);
            }
        }, this._provider.connection.commitment);
        let accountInfo = await this._provider.connection.getAccountInfo(web3_js_1.SYSVAR_CLOCK_PUBKEY);
        this.setClockData(utils.getClockData(accountInfo));
    }
    subscribeGreeks(callback) {
        if (this._zetaGroup === null) {
            throw Error("Cannot subscribe greeks. ZetaGroup is null.");
        }
        let eventEmitter = this._program.account.greeks.subscribe(this._zetaGroup.greeks, this._provider.connection.commitment);
        eventEmitter.on("change", async (greeks) => {
            this._greeks = greeks;
            if (callback !== undefined) {
                callback(events_1.EventType.GREEKS, null);
            }
            this._riskCalculator.updateMarginRequirements();
        });
        this._eventEmitters.push(eventEmitter);
    }
    async subscribeOracle(callback) {
        await this._oracle.subscribePriceFeeds((price) => {
            if (callback !== undefined) {
                callback(events_1.EventType.ORACLE, price);
            }
            if (this._isInitialized) {
                this._riskCalculator.updateMarginRequirements();
            }
        });
    }
    async handlePolling(callback) {
        if (!this._isInitialized) {
            return;
        }
        if (this._clockTimestamp > this._lastPollTimestamp + this._pollInterval) {
            this._lastPollTimestamp = this._clockTimestamp;
            await this.updateState();
            await this.updateZetaGroup();
            this._markets.updateExpirySeries();
            if (callback !== undefined) {
                callback(events_1.EventType.EXCHANGE, null);
            }
        }
        await this._markets.handlePolling(callback);
    }
    /**
     * @param index   market index to get mark price.
     */
    getMarkPrice(index) {
        return utils.convertNativeBNToDecimal(this._greeks.markPrices[index], constants.PLATFORM_PRECISION);
    }
    /**
     * @param user user pubkey to be whitelisted for uncapped deposit
     */
    async whitelistUserForDeposit(user) {
        let tx = new web3_js_1.Transaction().add(await instructions.initializeWhitelistDepositAccountIx(user, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    /**
     * @param user user pubkey to be whitelisted for our insurance vault
     */
    async whitelistUserForInsuranceVault(user) {
        let tx = new web3_js_1.Transaction().add(await instructions.initializeWhitelistInsuranceAccountIx(user, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    /**
     * @param user user pubkey to be whitelisted for trading fees
     */
    async whitelistUserForTradingFees(user) {
        let tx = new web3_js_1.Transaction().add(await instructions.initializeWhitelistTradingFeesAccountIx(user, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    /**
     *
     * @param marginAccounts an array of remaining accounts (margin accounts) that will be rebalanced
     */
    async rebalanceInsuranceVault(marginAccounts) {
        let txs = [];
        for (var i = 0; i < marginAccounts.length; i += constants.MAX_REBALANCE_ACCOUNTS) {
            let tx = new web3_js_1.Transaction();
            let slice = marginAccounts.slice(i, i + constants.MAX_REBALANCE_ACCOUNTS);
            tx.add(instructions.rebalanceInsuranceVaultIx(slice));
            txs.push(tx);
        }
        try {
            await Promise.all(txs.map(async (tx) => {
                let txSig = await utils.processTransaction(this._provider, tx);
                console.log(`[REBALANCE INSURANCE VAULT]: ${txSig}`);
            }));
        }
        catch (e) {
            console.log(`Error in rebalancing the insurance vault ${e}`);
        }
    }
    /**
     * Helper function to get the deposit limits
     */
    async getDepositLimit() {
        return utils.convertNativeBNToDecimal(this.state.nativeDepositLimit);
    }
    addProgramSubscriptionId(id) {
        this._programSubscriptionIds.push(id);
    }
    /**
     * Close the websockets.
     */
    async close() {
        await this._program.account.zetaGroup.unsubscribe(this._zetaGroupAddress);
        await this._program.account.greeks.unsubscribe(this._zetaGroup.greeks);
        for (var i = 0; i < this._eventEmitters.length; i++) {
            this._eventEmitters[i].removeListener("change");
        }
        this._eventEmitters = [];
        if (this._clockSubscriptionId !== undefined) {
            await this.connection.removeAccountChangeListener(this._clockSubscriptionId);
            this._clockSubscriptionId = undefined;
        }
        await this._oracle.close();
        for (var i = 0; i < this._programSubscriptionIds.length; i++) {
            await this.connection.removeProgramAccountChangeListener(this._programSubscriptionIds[i]);
        }
        this._programSubscriptionIds = [];
    }
    updateMarginParams() {
        if (this.zetaGroup === undefined) {
            return;
        }
        this._marginParams = {
            futureMarginInitial: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.futureMarginInitial, constants.MARGIN_PRECISION),
            futureMarginMaintenance: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.futureMarginMaintenance, constants.MARGIN_PRECISION),
            optionMarkPercentageLongInitial: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionMarkPercentageLongInitial, constants.MARGIN_PRECISION),
            optionSpotPercentageLongInitial: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionSpotPercentageLongInitial, constants.MARGIN_PRECISION),
            optionSpotPercentageShortInitial: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionSpotPercentageShortInitial, constants.MARGIN_PRECISION),
            optionDynamicPercentageShortInitial: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionDynamicPercentageShortInitial, constants.MARGIN_PRECISION),
            optionMarkPercentageLongMaintenance: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionMarkPercentageLongMaintenance, constants.MARGIN_PRECISION),
            optionSpotPercentageLongMaintenance: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionSpotPercentageLongMaintenance, constants.MARGIN_PRECISION),
            optionSpotPercentageShortMaintenance: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionSpotPercentageShortMaintenance, constants.MARGIN_PRECISION),
            optionDynamicPercentageShortMaintenance: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionDynamicPercentageShortMaintenance, constants.MARGIN_PRECISION),
            optionShortPutCapPercentage: utils.convertNativeBNToDecimal(this.zetaGroup.marginParameters.optionShortPutCapPercentage, constants.MARGIN_PRECISION),
        };
    }
    /**
     * Halt zeta group functionality.
     */
    assertHalted() {
        if (!this.zetaGroup.haltState.halted) {
            throw "Zeta group not halted.";
        }
    }
    async haltZetaGroup(zetaGroupAddress) {
        let tx = new web3_js_1.Transaction().add(instructions.haltZetaGroupIx(zetaGroupAddress, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    async unhaltZetaGroup(zetaGroupAddress) {
        let tx = new web3_js_1.Transaction().add(instructions.unhaltZetaGroupIx(zetaGroupAddress, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    async updateHaltState(zetaGroupAddress, args) {
        let tx = new web3_js_1.Transaction().add(instructions.updateHaltStateIx(zetaGroupAddress, args, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    async settlePositionsHalted(marginAccounts) {
        let txs = instructions.settlePositionsHaltedTxs(marginAccounts, this._provider.wallet.publicKey);
        await Promise.all(txs.map(async (tx) => {
            await utils.processTransaction(this._provider, tx);
        }));
    }
    async cancelAllOrdersHalted() {
        this.assertHalted();
        await Promise.all(this._markets.markets.map(async (market) => {
            await market.cancelAllOrdersHalted();
        }));
    }
    async cleanZetaMarketsHalted() {
        this.assertHalted();
        let marketAccounts = await Promise.all(this._markets.markets.map(async (market) => {
            return utils.getMutMarketAccounts(market.marketIndex);
        }));
        await utils.cleanZetaMarketsHalted(marketAccounts);
    }
    async updatePricingHalted(expiryIndex) {
        let tx = new web3_js_1.Transaction().add(instructions.updatePricingHaltedIx(expiryIndex, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    async cleanMarketNodes(expiryIndex) {
        let tx = new web3_js_1.Transaction().add(instructions.cleanMarketNodesIx(expiryIndex));
        await utils.processTransaction(this._provider, tx);
    }
    async updateVolatility(args) {
        let tx = new web3_js_1.Transaction().add(instructions.updateVolatilityIx(args, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
    async updateInterestRate(args) {
        let tx = new web3_js_1.Transaction().add(instructions.updateInterestRateIx(args, this._provider.wallet.publicKey));
        await utils.processTransaction(this._provider, tx);
    }
}
exports.Exchange = Exchange;
// Exchange singleton.
exports.exchange = new Exchange();
