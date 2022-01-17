"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const oracle_utils_1 = require("./oracle-utils");
const exchange_1 = require("./exchange");
const constants = __importStar(require("./constants"));
class Oracle {
    constructor(network, connection) {
        this._network = network;
        this._connection = connection;
        this._subscriptionIds = new Map();
        this._data = new Map();
        this._callback = undefined;
    }
    getAvailablePriceFeeds() {
        return Object.keys(constants.PYTH_PRICE_FEEDS[this._network]);
    }
    getPrice(feed) {
        if (!this._data.has(feed)) {
            return null;
        }
        return this._data.get(feed);
    }
    // Allows fetching of any pyth oracle price.
    async fetchPrice(oracleKey) {
        let accountInfo = await this._connection.getAccountInfo(oracleKey);
        let priceData = oracle_utils_1.parsePythData(accountInfo.data);
        return priceData.price;
    }
    async subscribePriceFeeds(callback) {
        if (this._callback != undefined) {
            throw Error("Oracle price feeds already subscribed to!");
        }
        this._callback = callback;
        let feeds = Object.keys(constants.PYTH_PRICE_FEEDS[this._network]);
        for (var i = 0; i < feeds.length; i++) {
            let feed = feeds[i];
            console.log(`Oracle subscribing to feed ${feed}`);
            let priceAddress = constants.PYTH_PRICE_FEEDS[this._network][feed];
            let subscriptionId = this._connection.onAccountChange(priceAddress, (accountInfo, _context) => {
                let priceData = oracle_utils_1.parsePythData(accountInfo.data);
                let currPrice = this._data.get(feed);
                if (currPrice !== undefined && currPrice.price === priceData.price) {
                    return;
                }
                let oracleData = {
                    feed,
                    price: priceData.price,
                };
                this._data.set(feed, oracleData);
                this._callback(oracleData);
            }, exchange_1.exchange.provider.connection.commitment);
            this._subscriptionIds.set(feed, subscriptionId);
            // TODO set this so localnet has data for the oracle
            // Remove once there is an oracle simulator.
            let accountInfo = await this._connection.getAccountInfo(priceAddress);
            let priceData = oracle_utils_1.parsePythData(accountInfo.data);
            let oracleData = {
                feed,
                price: priceData.price,
            };
            this._data.set(feed, oracleData);
        }
    }
    async close() {
        for (let subscriptionId of this._subscriptionIds.values()) {
            await this._connection.removeAccountChangeListener(subscriptionId);
        }
    }
}
exports.Oracle = Oracle;
