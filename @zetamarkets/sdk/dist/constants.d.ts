import { PublicKey } from "@solana/web3.js";
export declare const MINTS: {
    SOL: PublicKey;
};
export declare const UNDERLYINGS: PublicKey[];
export declare const DEX_PID: {
    localnet: PublicKey;
    devnet: PublicKey;
    mainnet: PublicKey;
};
export declare const MAX_CANCELS_PER_TX = 4;
export declare const MAX_GREEK_UPDATES_PER_TX = 20;
export declare const MAX_SETTLEMENT_ACCOUNTS = 20;
export declare const MAX_REBALANCE_ACCOUNTS = 20;
export declare const MARKET_INDEX_LIMIT = 40;
export declare const CLEAN_MARKET_LIMIT = 9;
export declare const CRANK_ACCOUNT_LIMIT = 12;
export declare const MARKET_LOAD_LIMIT = 12;
export declare const DEFAULT_ORDERBOOK_DEPTH = 5;
export declare const PYTH_PRICE_FEEDS: {
    localnet: {
        "SOL/USD": PublicKey;
    };
    devnet: {
        "SOL/USD": PublicKey;
    };
    mainnet: {
        "SOL/USD": PublicKey;
    };
};
export declare const USDC_MINT_ADDRESS: {
    localnet: PublicKey;
    devnet: PublicKey;
    mainnet: PublicKey;
};
export declare const CLUSTER_URLS: {
    localnet: string;
    devnet: string;
    mainnet: string;
};
export declare const NUM_STRIKES = 11;
export declare const PRODUCTS_PER_EXPIRY: number;
export declare const ACTIVE_EXPIRIES = 2;
export declare const ACTIVE_MARKETS: number;
export declare const TOTAL_EXPIRIES = 6;
export declare const TOTAL_MARKETS: number;
export declare const DEFAULT_EXCHANGE_POLL_INTERVAL = 30;
export declare const DEFAULT_MARKET_POLL_INTERVAL = 5;
export declare const DEFAULT_CLIENT_POLL_INTERVAL = 20;
export declare const DEFAULT_CLIENT_TIMER_INTERVAL = 1;
export declare const VOLATILITY_POINTS = 5;
export declare const PLATFORM_PRECISION = 6;
export declare const PRICING_PRECISION = 12;
export declare const MARGIN_PRECISION = 8;
export declare const POSITION_PRECISION = 3;
