"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
exports.MINTS = {
    SOL: new web3_js_1.PublicKey("So11111111111111111111111111111111111111112"),
};
exports.UNDERLYINGS = [exports.MINTS["SOL"]];
exports.DEX_PID = {
    localnet: new web3_js_1.PublicKey("5CmWtUihvSrJpaUrpJ3H1jUa9DRjYz4v2xs6c3EgQWMf"),
    devnet: new web3_js_1.PublicKey("5CmWtUihvSrJpaUrpJ3H1jUa9DRjYz4v2xs6c3EgQWMf"),
    mainnet: new web3_js_1.PublicKey("zDEXqXEG7gAyxb1Kg9mK5fPnUdENCGKzWrM21RMdWRq"),
};
exports.MAX_CANCELS_PER_TX = 4;
exports.MAX_GREEK_UPDATES_PER_TX = 20;
exports.MAX_SETTLEMENT_ACCOUNTS = 20;
exports.MAX_REBALANCE_ACCOUNTS = 20;
exports.MARKET_INDEX_LIMIT = 40;
// 3 accounts per set * 9 = 27 + 2 = 29 accounts.
exports.CLEAN_MARKET_LIMIT = 9;
exports.CRANK_ACCOUNT_LIMIT = 12;
// This is the most we can load per iteration without
// hitting the rate limit.
exports.MARKET_LOAD_LIMIT = 12;
exports.DEFAULT_ORDERBOOK_DEPTH = 5;
exports.PYTH_PRICE_FEEDS = {
    localnet: {
        "SOL/USD": new web3_js_1.PublicKey("2pRCJksgaoKRMqBfa7NTdd6tLYe9wbDFGCcCCZ6si3F7"),
    },
    devnet: {
        "SOL/USD": new web3_js_1.PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"),
    },
    mainnet: {
        "SOL/USD": new web3_js_1.PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"),
    },
};
exports.USDC_MINT_ADDRESS = {
    localnet: new web3_js_1.PublicKey("6PEh8n3p7BbCTykufbq1nSJYAZvUp6gSwEANAs1ZhsCX"),
    devnet: new web3_js_1.PublicKey("6PEh8n3p7BbCTykufbq1nSJYAZvUp6gSwEANAs1ZhsCX"),
    mainnet: new web3_js_1.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
};
exports.CLUSTER_URLS = {
    localnet: "http://127.0.0.1:8899",
    devnet: "https://api.devnet.solana.com",
    mainnet: "https://api.mainnet-beta.solana.com",
};
// These are fixed and shouldn't change in the future.
exports.NUM_STRIKES = 11;
exports.PRODUCTS_PER_EXPIRY = exports.NUM_STRIKES * 2 + 1; // +1 for the future.
exports.ACTIVE_EXPIRIES = 2;
exports.ACTIVE_MARKETS = exports.ACTIVE_EXPIRIES * exports.PRODUCTS_PER_EXPIRY;
exports.TOTAL_EXPIRIES = 6;
exports.TOTAL_MARKETS = exports.PRODUCTS_PER_EXPIRY * exports.TOTAL_EXPIRIES;
exports.DEFAULT_EXCHANGE_POLL_INTERVAL = 30;
exports.DEFAULT_MARKET_POLL_INTERVAL = 5;
exports.DEFAULT_CLIENT_POLL_INTERVAL = 20;
exports.DEFAULT_CLIENT_TIMER_INTERVAL = 1;
exports.VOLATILITY_POINTS = 5;
// Numbers represented in BN are generally fixed point integers with precision of 6.
exports.PLATFORM_PRECISION = 6;
exports.PRICING_PRECISION = 12;
exports.MARGIN_PRECISION = 8;
exports.POSITION_PRECISION = 3;
