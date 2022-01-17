"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@project-serum/anchor"));
const serum_1 = require("@project-serum/serum");
const web3_js_1 = require("@solana/web3.js");
const exchange_1 = require("./exchange");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const types_1 = require("./types");
const events_1 = require("./events");
class ZetaGroupMarkets {
    constructor() {
        this._pollInterval = constants_1.DEFAULT_MARKET_POLL_INTERVAL;
        this._expirySeries = new Array(exchange_1.exchange.zetaGroup.expirySeries.length);
        this._markets = new Array(exchange_1.exchange.zetaGroup.products.length);
        this._subscribedMarketIndexes = new Set();
        this._lastPollTimestamp = 0;
    }
    /**
     * Returns the index for the front expiry in expiry series.
     */
    get frontExpiryIndex() {
        return this._frontExpiryIndex;
    }
    /**
     * Returns the expiry series for this zeta group.
     */
    get expirySeries() {
        return this._expirySeries;
    }
    /**
     * The list of markets in the same ordering as the zeta group account
     * They are in sorted order by market address.
     */
    get markets() {
        return this._markets;
    }
    set pollInterval(interval) {
        if (interval < 0) {
            throw Error("Invalid poll interval");
        }
        this._pollInterval = interval;
    }
    get pollInterval() {
        return this._pollInterval;
    }
    /**
     * Returns the market's index.
     */
    getMarketsByExpiryIndex(expiryIndex) {
        let head = expiryIndex * this.productsPerExpiry();
        return this._markets.slice(head, head + this.productsPerExpiry());
    }
    /**
     * Returns the options market given an expiry index and options kind.
     */
    getOptionsMarketByExpiryIndex(expiryIndex, kind) {
        let markets = this.getMarketsByExpiryIndex(expiryIndex);
        switch (kind) {
            case types_1.Kind.CALL:
                return markets.slice(0, constants_1.NUM_STRIKES);
            case types_1.Kind.PUT:
                return markets.slice(constants_1.NUM_STRIKES, 2 * constants_1.NUM_STRIKES);
            default:
                throw Error("Options market kind not supported, must be CALL or PUT");
        }
    }
    /**
     * Returns the futures market given an expiry index.
     */
    getFuturesMarketByExpiryIndex(expiryIndex) {
        let markets = this.getMarketsByExpiryIndex(expiryIndex);
        let market = markets[markets.length - 1];
        if (market.kind != types_1.Kind.FUTURE) {
            throw Error("Futures market kind error");
        }
        return market;
    }
    getMarketByExpiryKindStrike(expiryIndex, kind, strike) {
        let markets = this.getMarketsByExpiryIndex(expiryIndex);
        let marketsKind;
        if (kind === types_1.Kind.CALL || kind === types_1.Kind.PUT) {
            if (strike === undefined) {
                throw new Error("Strike must be specified for options markets");
            }
            marketsKind = this.getOptionsMarketByExpiryIndex(expiryIndex, kind);
        }
        else if (kind === types_1.Kind.FUTURE) {
            return this.getFuturesMarketByExpiryIndex(expiryIndex);
        }
        else {
            throw new Error("Only CALL, PUT, FUTURE kinds are supported");
        }
        let market = marketsKind.filter((x) => x.strike == strike);
        return markets.length == 0 ? undefined : markets[0];
    }
    subscribeMarket(marketIndex) {
        if (marketIndex >= this._markets.length) {
            throw Error(`Market index ${marketIndex} doesn't exist.`);
        }
        this._subscribedMarketIndexes.add(marketIndex);
    }
    unsubscribeMarket(marketIndex) {
        return this._subscribedMarketIndexes.delete(marketIndex);
    }
    async handlePolling(callback) {
        if (exchange_1.exchange.clockTimestamp >
            this._lastPollTimestamp + this._pollInterval) {
            this._lastPollTimestamp = exchange_1.exchange.clockTimestamp;
            let indexes = Array.from(this._subscribedMarketIndexes);
            await Promise.all(indexes.map(async (index) => {
                try {
                    await this._markets[index].updateOrderbook();
                }
                catch (e) {
                    console.error(`Orderbook poll failed: ${e}`);
                }
                if (callback !== undefined) {
                    let data = { marketIndex: index };
                    callback(events_1.EventType.ORDERBOOK, data);
                }
            }));
        }
    }
    /**
     * Will load a new instance of ZetaGroupMarkets
     * Should not be called outside of Exchange.
     */
    static async load(opts, throttleMs) {
        let instance = new ZetaGroupMarkets();
        let productsPerExpiry = Math.floor(exchange_1.exchange.zetaGroup.products.length /
            exchange_1.exchange.zetaGroup.expirySeries.length);
        let indexes = [...Array(constants_1.ACTIVE_MARKETS).keys()];
        for (var i = 0; i < indexes.length; i += constants_1.MARKET_LOAD_LIMIT) {
            let slice = indexes.slice(i, i + constants_1.MARKET_LOAD_LIMIT);
            await Promise.all(slice.map(async (index) => {
                let marketAddr = exchange_1.exchange.zetaGroup.products[index].market;
                let serumMarket = await serum_1.Market.load(exchange_1.exchange.connection, marketAddr, { commitment: opts.commitment, skipPreflight: opts.skipPreflight }, constants_1.DEX_PID[exchange_1.exchange.network]);
                let [baseVaultAddr, _baseVaultNonce] = await utils_1.getZetaVault(exchange_1.exchange.programId, serumMarket.baseMintAddress);
                let [quoteVaultAddr, _quoteVaultNonce] = await utils_1.getZetaVault(exchange_1.exchange.programId, serumMarket.quoteMintAddress);
                let expiryIndex = Math.floor(index / productsPerExpiry);
                instance._markets[index] = new Market(index, expiryIndex, types_1.toProductKind(exchange_1.exchange.zetaGroup.products[index].kind), marketAddr, exchange_1.exchange.zetaGroupAddress, quoteVaultAddr, baseVaultAddr, serumMarket);
            }));
            await utils_1.sleep(throttleMs);
        }
        instance.updateExpirySeries();
        return instance;
    }
    /**
     * Updates the option series state based off state in Exchange.
     */
    async updateExpirySeries() {
        for (var i = 0; i < exchange_1.exchange.zetaGroup.products.length; i++) {
            this._markets[i].updateStrike();
        }
        this._frontExpiryIndex = exchange_1.exchange.zetaGroup.frontExpiryIndex;
        for (var i = 0; i < exchange_1.exchange.zetaGroup.expirySeries.length; i++) {
            let strikesInitialized = this._markets[i * this.productsPerExpiry()].strike != null;
            this._expirySeries[i] = new ExpirySeries(i, exchange_1.exchange.zetaGroup.expirySeries[i].activeTs.toNumber(), exchange_1.exchange.zetaGroup.expirySeries[i].expiryTs.toNumber(), exchange_1.exchange.zetaGroup.expirySeries[i].dirty, strikesInitialized);
        }
    }
    /**
     * Returns the market object for a given index.
     */
    getMarket(market) {
        let index = this.getMarketIndex(market);
        return this._markets[index];
    }
    /**
     * Returns the market index for a given market address.
     */
    getMarketIndex(market) {
        let compare = (a, b) => a.toBuffer().compare(b.toBuffer());
        let m = 0;
        let n = this._markets.length - 1;
        while (m <= n) {
            let k = (n + m) >> 1;
            let cmp = compare(market, this._markets[k].address);
            if (cmp > 0) {
                m = k + 1;
            }
            else if (cmp < 0) {
                n = k - 1;
            }
            else {
                return k;
            }
        }
        throw Error("Market doesn't exist!");
    }
    /**
     * Returns the index of expiry series that are tradeable.
     */
    getTradeableExpiryIndices() {
        let result = [];
        for (var i = 0; i < this._expirySeries.length; i++) {
            let expirySeries = this._expirySeries[i];
            if (expirySeries.isLive()) {
                result.push(i);
            }
        }
        return result;
    }
    productsPerExpiry() {
        return Math.floor(this._markets.length / this.expirySeries.length);
    }
}
exports.ZetaGroupMarkets = ZetaGroupMarkets;
class ExpirySeries {
    constructor(expiryIndex, activeTs, expiryTs, dirty, strikesInitialized) {
        this.expiryIndex = expiryIndex;
        this.activeTs = activeTs;
        this.expiryTs = expiryTs;
        this.dirty = dirty;
        this.strikesInitialized = strikesInitialized;
    }
    isLive() {
        return (exchange_1.exchange.clockTimestamp >= this.activeTs &&
            exchange_1.exchange.clockTimestamp < this.expiryTs &&
            this.strikesInitialized &&
            !this.dirty);
    }
}
exports.ExpirySeries = ExpirySeries;
/**
 * Wrapper class for a zeta market on serum.
 */
class Market {
    constructor(marketIndex, expiryIndex, kind, address, zetaGroup, quoteVault, baseVault, serumMarket) {
        this._marketIndex = marketIndex;
        this._expiryIndex = expiryIndex;
        this._kind = kind;
        this._address = address;
        this._zetaGroup = zetaGroup;
        this._quoteVault = quoteVault;
        this._baseVault = baseVault;
        this._serumMarket = serumMarket;
        this._strike = 0;
        this._orderbook = { bids: [], asks: [] };
    }
    /**
     * The market index corresponding to the zeta group account.
     */
    get marketIndex() {
        return this._marketIndex;
    }
    /**
     * The expiry series index this market belongs to.
     */
    get expiryIndex() {
        return this._expiryIndex;
    }
    get expirySeries() {
        return exchange_1.exchange.markets.expirySeries[this.expiryIndex];
    }
    /**
     * The type of product this market represents.
     */
    get kind() {
        return this._kind;
    }
    /**
     * The serum market address.
     */
    get address() {
        return this._address;
    }
    /**
     * The zeta group this market belongs to.
     * TODO currently there exists only one zeta group.
     */
    get zetaGroup() {
        return this._zetaGroup;
    }
    /**
     * The zeta vault for the quote mint.
     */
    get quoteVault() {
        return this._quoteVault;
    }
    /**
     * The zeta vault for the base mint.
     */
    get baseVault() {
        return this._baseVault;
    }
    /**
     * The serum Market object from @project-serum/ts
     */
    get serumMarket() {
        return this._serumMarket;
    }
    /**
     * Returns the best N levels for bids and asks
     */
    get orderbook() {
        return this._orderbook;
    }
    /**
     * The strike of this option, modified on new expiry.
     */
    get strike() {
        return this._strike;
    }
    updateStrike() {
        let strike = exchange_1.exchange.zetaGroup.products[this._marketIndex].strike;
        if (!strike.isSet) {
            this._strike = null;
        }
        else {
            this._strike = utils_1.convertNativeBNToDecimal(strike.value);
        }
    }
    // TODO make this call on interval
    async updateOrderbook() {
        [this._bids, this._asks] = await Promise.all([
            this._serumMarket.loadBids(exchange_1.exchange.provider.connection),
            this._serumMarket.loadAsks(exchange_1.exchange.provider.connection),
        ]);
        [this._bids, this._asks].map((orderbookSide) => {
            const descending = orderbookSide.isBids ? true : false;
            const levels = []; // (price, size)
            for (const { key, quantity } of orderbookSide.slab.items(descending)) {
                const price = utils_1.getPriceFromSerumOrderKey(key);
                if (levels.length > 0 && levels[levels.length - 1][0].eq(price)) {
                    levels[levels.length - 1][1].iadd(quantity);
                }
                else {
                    levels.push([price, new anchor.BN(quantity.toNumber())]);
                }
            }
            this._orderbook[orderbookSide.isBids ? "bids" : "asks"] = levels.map(([priceLots, sizeLots]) => {
                return {
                    price: this._serumMarket.priceLotsToNumber(priceLots),
                    size: utils_1.convertNativeLotSizeToDecimal(this._serumMarket.baseSizeLotsToNumber(sizeLots)),
                };
            });
        });
    }
    getTopLevel() {
        let topLevel = { bid: null, ask: null };
        if (this._orderbook.bids.length != 0) {
            topLevel.bid = this._orderbook.bids[0];
        }
        if (this._orderbook.asks.length != 0) {
            topLevel.ask = this._orderbook.asks[0];
        }
        return topLevel;
    }
    static convertOrder(market, order) {
        return {
            marketIndex: market.marketIndex,
            market: market.address,
            price: order.price,
            size: utils_1.convertNativeLotSizeToDecimal(order.size),
            side: order.side == "buy" ? types_1.Side.BID : types_1.Side.ASK,
            orderId: order.orderId,
            owner: order.openOrdersAddress,
            clientOrderId: order.clientId,
        };
    }
    getOrdersForAccount(openOrdersAddress) {
        let orders = [...this._bids, ...this._asks].filter((order) => order.openOrdersAddress.equals(openOrdersAddress));
        return orders.map((order) => {
            return Market.convertOrder(this, order);
        });
    }
    getMarketOrders() {
        return [...this._bids, ...this._asks].map((order) => {
            return Market.convertOrder(this, order);
        });
    }
    getBidOrders() {
        console.log("*");
        return [...this._bids].map((order) => {
            return Market.convertOrder(this, order);
        });
    }
    getAskOrders() {
        return [...this._asks].map((order) => {
            return Market.convertOrder(this, order);
        });
    }
    async cancelAllExpiredOrders() {
        await this.updateOrderbook();
        let orders = this.getMarketOrders();
        // Assumption of similar MAX number of instructions as regular cancel
        let ixs = await utils_1.getCancelAllIxs(orders, true);
        let txs = [];
        for (var i = 0; i < ixs.length; i += constants_1.MAX_CANCELS_PER_TX) {
            let tx = new web3_js_1.Transaction();
            let slice = ixs.slice(i, i + constants_1.MAX_CANCELS_PER_TX);
            slice.forEach((ix) => tx.add(ix));
            txs.push(tx);
        }
        await Promise.all(txs.map(async (tx) => {
            await utils_1.processTransaction(exchange_1.exchange.provider, tx);
        }));
    }
    async cancelAllOrdersHalted() {
        exchange_1.exchange.assertHalted();
        await this.updateOrderbook();
        let orders = this.getMarketOrders();
        let ixs = await utils_1.getCancelAllIxs(orders, false);
        let txs = [];
        for (var i = 0; i < ixs.length; i += constants_1.MAX_CANCELS_PER_TX) {
            let tx = new web3_js_1.Transaction();
            let slice = ixs.slice(i, i + constants_1.MAX_CANCELS_PER_TX);
            slice.forEach((ix) => tx.add(ix));
            txs.push(tx);
        }
        await Promise.all(txs.map(async (tx) => {
            await utils_1.processTransaction(exchange_1.exchange.provider, tx);
        }));
    }
}
exports.Market = Market;
