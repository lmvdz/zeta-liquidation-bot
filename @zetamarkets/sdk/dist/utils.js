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
const spl_token_1 = require("@solana/spl-token");
const buffer_layout_1 = __importDefault(require("buffer-layout"));
const BN = anchor.BN;
const bs58 = __importStar(require("bs58"));
const fs = __importStar(require("fs"));
const constants = __importStar(require("./constants"));
const errors_1 = require("./errors");
const exchange_1 = require("./exchange");
const program_instructions_1 = require("./program-instructions");
const decimal_1 = require("./decimal");
async function getState(programId) {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode("state"))], programId);
}
exports.getState = getState;
async function getMarketNode(programId, zetaGroup, marketIndex) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("market-node")),
        zetaGroup.toBuffer(),
        Buffer.from([marketIndex]),
    ], programId);
}
exports.getMarketNode = getMarketNode;
async function getSettlement(programId, underlyingMint, expirationTs) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("settlement")),
        underlyingMint.toBuffer(),
        expirationTs.toArrayLike(Buffer, "le", 8),
    ], programId);
}
exports.getSettlement = getSettlement;
async function getOpenOrders(programId, market, userKey) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("open-orders")),
        constants.DEX_PID[exchange_1.exchange.network].toBuffer(),
        market.toBuffer(),
        userKey.toBuffer(),
    ], programId);
}
exports.getOpenOrders = getOpenOrders;
async function createOpenOrdersAddress(programId, market, userKey, nonce) {
    return await web3_js_1.PublicKey.createProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("open-orders")),
        constants.DEX_PID[exchange_1.exchange.network].toBuffer(),
        market.toBuffer(),
        userKey.toBuffer(),
        Buffer.from([nonce]),
    ], programId);
}
exports.createOpenOrdersAddress = createOpenOrdersAddress;
async function getOpenOrdersMap(programId, openOrders) {
    return await anchor.web3.PublicKey.findProgramAddress([openOrders.toBuffer()], programId);
}
exports.getOpenOrdersMap = getOpenOrdersMap;
async function getSerumAuthority(programId) {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode("serum"))], programId);
}
exports.getSerumAuthority = getSerumAuthority;
async function getMintAuthority(programId) {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode("mint-auth"))], programId);
}
exports.getMintAuthority = getMintAuthority;
async function getVault(programId, zetaGroup) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("vault")),
        zetaGroup.toBuffer(),
    ], programId);
}
exports.getVault = getVault;
async function getSerumVault(programId, mint) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("serum-vault")),
        mint.toBuffer(),
    ], programId);
}
exports.getSerumVault = getSerumVault;
async function getZetaVault(programId, mint) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("zeta-vault")),
        mint.toBuffer(),
    ], programId);
}
exports.getZetaVault = getZetaVault;
async function getZetaInsuranceVault(programId, zetaGroup) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("zeta-insurance-vault")),
        zetaGroup.toBuffer(),
    ], programId);
}
exports.getZetaInsuranceVault = getZetaInsuranceVault;
async function getUserInsuranceDepositAccount(programId, zetaGroup, userKey) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("user-insurance-deposit")),
        zetaGroup.toBuffer(),
        userKey.toBuffer(),
    ], programId);
}
exports.getUserInsuranceDepositAccount = getUserInsuranceDepositAccount;
async function getUserWhitelistDepositAccount(programId, userKey) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("whitelist-deposit")),
        userKey.toBuffer(),
    ], programId);
}
exports.getUserWhitelistDepositAccount = getUserWhitelistDepositAccount;
async function getUserWhitelistInsuranceAccount(programId, userKey) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("whitelist-insurance")),
        userKey.toBuffer(),
    ], programId);
}
exports.getUserWhitelistInsuranceAccount = getUserWhitelistInsuranceAccount;
async function getUserWhitelistTradingFeesAccount(programId, userKey) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("whitelist-trading-fees")),
        userKey.toBuffer(),
    ], programId);
}
exports.getUserWhitelistTradingFeesAccount = getUserWhitelistTradingFeesAccount;
async function getZetaGroup(programId, mint) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("zeta-group")),
        mint.toBuffer(),
    ], programId);
}
exports.getZetaGroup = getZetaGroup;
async function getUnderlying(programId, underlyingIndex) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("underlying")),
        Buffer.from([underlyingIndex]),
    ], programId);
}
exports.getUnderlying = getUnderlying;
async function getGreeks(programId, zetaGroup) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("greeks")),
        zetaGroup.toBuffer(),
    ], programId);
}
exports.getGreeks = getGreeks;
async function getMarketIndexes(programId, zetaGroup) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("market-indexes")),
        zetaGroup.toBuffer(),
    ], programId);
}
exports.getMarketIndexes = getMarketIndexes;
async function getBaseMint(programId, market) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("base-mint")),
        market.toBuffer(),
    ], programId);
}
exports.getBaseMint = getBaseMint;
async function getQuoteMint(programId, market) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("quote-mint")),
        market.toBuffer(),
    ], programId);
}
exports.getQuoteMint = getQuoteMint;
async function getMarginAccount(programId, zetaGroup, userKey) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("margin")),
        zetaGroup.toBuffer(),
        userKey.toBuffer(),
    ], programId);
}
exports.getMarginAccount = getMarginAccount;
async function getMarketUninitialized(programId, zetaGroup, marketIndex) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("market")),
        zetaGroup.toBuffer(),
        Buffer.from([marketIndex]),
    ], programId);
}
exports.getMarketUninitialized = getMarketUninitialized;
async function getSocializedLossAccount(programId, zetaGroup) {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(anchor.utils.bytes.utf8.encode("socialized-loss")),
        zetaGroup.toBuffer(),
    ], programId);
}
exports.getSocializedLossAccount = getSocializedLossAccount;
/**
 * Returns the expected PDA by serum to own the serum vault
 * Serum uses a u64 as nonce which is not the same as
 * normal solana PDA convention and goes 0 -> 255
 */
async function getSerumVaultOwnerAndNonce(market, dexPid) {
    const nonce = new BN(0);
    while (nonce.toNumber() < 255) {
        try {
            const vaultOwner = await web3_js_1.PublicKey.createProgramAddress([market.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)], dexPid);
            return [vaultOwner, nonce];
        }
        catch (e) {
            nonce.iaddn(1);
        }
    }
    throw new Error("Unable to find nonce");
}
exports.getSerumVaultOwnerAndNonce = getSerumVaultOwnerAndNonce;
/**
 * Serum interprets publickeys as [u64; 4]
 * Which requires swap64 sorting.
 */
function sortOpenOrderKeys(keys) {
    return keys.sort((a, b) => a.toBuffer().swap64().compare(b.toBuffer().swap64()));
}
exports.sortOpenOrderKeys = sortOpenOrderKeys;
/**
 * Normal sorting of keys
 */
function sortMarketKeys(keys) {
    return keys.sort((a, b) => a.toBuffer().compare(b.toBuffer()));
}
exports.sortMarketKeys = sortMarketKeys;
/**
 * Converts a decimal number to native fixed point integer of precision 6.
 */
function convertDecimalToNativeInteger(amount) {
    return parseInt((amount * Math.pow(10, constants.PLATFORM_PRECISION)).toFixed(0));
}
exports.convertDecimalToNativeInteger = convertDecimalToNativeInteger;
/**
 * Returns the trade event price. This may return a number that
 * does not divide perfectly by tick size (0.0001) if your order traded
 * against orders at different prices.
 */
function getTradeEventPrice(event) {
    let decimalCostOfTrades = convertNativeBNToDecimal(event.costOfTrades);
    let decimalSize = convertNativeLotSizeToDecimal(event.size.toNumber());
    return decimalCostOfTrades / decimalSize;
}
exports.getTradeEventPrice = getTradeEventPrice;
/**
 * Converts a native fixed point integer of precision 6 to decimal.
 */
function convertNativeIntegerToDecimal(amount) {
    return amount / Math.pow(10, constants.PLATFORM_PRECISION);
}
exports.convertNativeIntegerToDecimal = convertNativeIntegerToDecimal;
/**
 * Converts a program BN to a decimal number.
 * @param pricing   whether the BN you are converting is a pricing BN - defaults to false.
 */
function convertNativeBNToDecimal(number, precision = constants.PLATFORM_PRECISION) {
    // Note 53 bits - max number is slightly larger than 9 * 10 ^ 9 with decimals.
    let precisionBn = new anchor.BN(Math.pow(10, precision));
    return (
    // Integer
    number.div(precisionBn).toNumber() +
        // Decimal
        number.mod(precisionBn).toNumber() / precisionBn.toNumber());
}
exports.convertNativeBNToDecimal = convertNativeBNToDecimal;
/**
 * Converts a native lot size where 1 unit = 0.001 lots to human readable decimal
 * @param amount
 */
function convertNativeLotSizeToDecimal(amount) {
    return amount / Math.pow(10, constants.POSITION_PRECISION);
}
exports.convertNativeLotSizeToDecimal = convertNativeLotSizeToDecimal;
/**
 * Converts a native lot size where 1 unit = 0.001 lots to human readable decimal
 * @param amount
 */
function convertDecimalToNativeLotSize(amount) {
    return parseInt((amount * Math.pow(10, constants.POSITION_PRECISION)).toFixed(0));
}
exports.convertDecimalToNativeLotSize = convertDecimalToNativeLotSize;
async function getTokenMint(connection, key) {
    let info = await getTokenAccountInfo(connection, key);
    return new web3_js_1.PublicKey(info.mint);
}
exports.getTokenMint = getTokenMint;
/**
 * Copied from @solana/spl-token but their version requires you to
 * construct a Token object which is completely unnecessary
 */
async function getTokenAccountInfo(connection, key) {
    let info = await connection.getAccountInfo(key);
    if (info === null) {
        throw Error(`Token account ${key.toString()} doesn't exist.`);
    }
    if (info.data.length != spl_token_1.AccountLayout.span) {
        throw new Error(`Invalid account size`);
    }
    const data = Buffer.from(info.data);
    const accountInfo = spl_token_1.AccountLayout.decode(data);
    accountInfo.address = key;
    accountInfo.mint = new web3_js_1.PublicKey(accountInfo.mint);
    accountInfo.owner = new web3_js_1.PublicKey(accountInfo.owner);
    accountInfo.amount = spl_token_1.u64.fromBuffer(accountInfo.amount);
    if (accountInfo.delegateOption === 0) {
        accountInfo.delegate = null;
        accountInfo.delegatedAmount = new spl_token_1.u64(0);
    }
    else {
        accountInfo.delegate = new web3_js_1.PublicKey(accountInfo.delegate);
        accountInfo.delegatedAmount = spl_token_1.u64.fromBuffer(accountInfo.delegatedAmount);
    }
    accountInfo.isInitialized = accountInfo.state !== 0;
    accountInfo.isFrozen = accountInfo.state === 2;
    if (accountInfo.isNativeOption === 1) {
        accountInfo.rentExemptReserve = spl_token_1.u64.fromBuffer(accountInfo.isNative);
        accountInfo.isNative = true;
    }
    else {
        accountInfo.rentExemptReserve = null;
        accountInfo.isNative = false;
    }
    if (accountInfo.closeAuthorityOption === 0) {
        accountInfo.closeAuthority = null;
    }
    else {
        accountInfo.closeAuthority = new web3_js_1.PublicKey(accountInfo.closeAuthority);
    }
    return accountInfo;
}
exports.getTokenAccountInfo = getTokenAccountInfo;
async function getAssociatedTokenAddress(mint, owner) {
    return (await web3_js_1.PublicKey.findProgramAddress([owner.toBuffer(), spl_token_1.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID))[0];
}
exports.getAssociatedTokenAddress = getAssociatedTokenAddress;
function defaultCommitment() {
    return {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
    };
}
exports.defaultCommitment = defaultCommitment;
function commitmentConfig(commitment) {
    return {
        skipPreflight: false,
        preflightCommitment: commitment,
        commitment,
    };
}
exports.commitmentConfig = commitmentConfig;
async function processTransaction(provider, tx, signers, opts) {
    const blockhash = await provider.connection.getRecentBlockhash();
    tx.recentBlockhash = blockhash.blockhash;
    tx.feePayer = provider.wallet.publicKey;
    tx = await provider.wallet.signTransaction(tx);
    if (signers === undefined) {
        signers = [];
    }
    signers
        .filter((s) => s !== undefined)
        .forEach((kp) => {
        tx.partialSign(kp);
    });
    try {
        let txSig = await web3_js_1.sendAndConfirmRawTransaction(provider.connection, tx.serialize(), opts || commitmentConfig(provider.connection.commitment));
        return txSig;
    }
    catch (err) {
        let translatedErr = anchor.ProgramError.parse(err, errors_1.idlErrors);
        if (translatedErr !== null) {
            throw translatedErr;
        }
        let customErr = errors_1.parseCustomError(err);
        if (customErr != null) {
            throw customErr;
        }
        throw err;
    }
}
exports.processTransaction = processTransaction;
const uint64 = (property = "uint64") => {
    return buffer_layout_1.default.blob(8, property);
};
const int64 = (property = "int64") => {
    return buffer_layout_1.default.blob(8, property);
};
const SystemClockLayout = buffer_layout_1.default.struct([
    uint64("slot"),
    int64("epochStartTimestamp"),
    uint64("epoch"),
    uint64("leaderScheduleEpoch"),
    int64("unixTimestamp"),
]);
function getClockData(accountInfo) {
    let info = SystemClockLayout.decode(accountInfo.data);
    return {
        timestamp: Number(info.unixTimestamp.readBigInt64LE(0)),
        slot: Number(info.slot.readBigInt64LE(0)),
    };
}
exports.getClockData = getClockData;
function getPriceFromSerumOrderKey(key) {
    return key.ushrn(64);
}
exports.getPriceFromSerumOrderKey = getPriceFromSerumOrderKey;
function splitIxsIntoTx(ixs, ixsPerTx) {
    let txs = [];
    for (var i = 0; i < ixs.length; i += ixsPerTx) {
        let tx = new web3_js_1.Transaction();
        let slice = ixs.slice(i, i + ixsPerTx);
        slice.forEach((ix) => tx.add(ix));
        txs.push(tx);
    }
    return txs;
}
exports.splitIxsIntoTx = splitIxsIntoTx;
async function sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms, undefined));
}
exports.sleep = sleep;
// Returns the market indices ordered such that front expiry indexes are first.
function getOrderedMarketIndexes() {
    let indexes = Array.from(Array(exchange_1.exchange.zetaGroup.products.length).keys());
    let frontExpiryIndex = exchange_1.exchange.zetaGroup.frontExpiryIndex;
    let backExpiryIndex = (frontExpiryIndex + 1) % 2;
    let frontStart = frontExpiryIndex * constants.PRODUCTS_PER_EXPIRY;
    let backStart = backExpiryIndex * constants.PRODUCTS_PER_EXPIRY;
    indexes = indexes
        .slice(frontStart, frontStart + constants.PRODUCTS_PER_EXPIRY)
        .concat(indexes.slice(backStart, backStart + constants.PRODUCTS_PER_EXPIRY));
    return indexes;
}
exports.getOrderedMarketIndexes = getOrderedMarketIndexes;
function getDirtySeriesIndices() {
    let dirtyIndices = [];
    for (var i = 0; i < exchange_1.exchange.zetaGroup.expirySeries.length; i++) {
        if (exchange_1.exchange.zetaGroup.expirySeries[i].dirty) {
            dirtyIndices.push(i);
        }
    }
    return dirtyIndices;
}
exports.getDirtySeriesIndices = getDirtySeriesIndices;
/**
 * Given a market index, return the index to access the greeks.productGreeks.
 */
function getGreeksIndex(marketIndex) {
    let expirySeries = Math.floor(marketIndex / constants.PRODUCTS_PER_EXPIRY);
    let modIndex = marketIndex % constants.PRODUCTS_PER_EXPIRY;
    return (expirySeries * constants.NUM_STRIKES + (modIndex % constants.NUM_STRIKES));
}
exports.getGreeksIndex = getGreeksIndex;
function displayState() {
    let orderedIndexes = [
        exchange_1.exchange.zetaGroup.frontExpiryIndex,
        getMostRecentExpiredIndex(),
    ];
    console.log(`[EXCHANGE] Display market state...`);
    for (var i = 0; i < orderedIndexes.length; i++) {
        let index = orderedIndexes[i];
        let expirySeries = exchange_1.exchange.markets.expirySeries[index];
        console.log(`Expiration @ ${new Date(expirySeries.expiryTs * 1000)} Live: ${expirySeries.isLive()}`);
        let interestRate = convertNativeBNToDecimal(exchange_1.exchange.greeks.interestRate[index], constants.PRICING_PRECISION);
        console.log(`Interest rate: ${interestRate}`);
        let markets = exchange_1.exchange.markets.getMarketsByExpiryIndex(index);
        for (var j = 0; j < markets.length; j++) {
            let market = markets[j];
            let greeksIndex = getGreeksIndex(market.marketIndex);
            let markPrice = convertNativeBNToDecimal(exchange_1.exchange.greeks.markPrices[market.marketIndex]);
            let delta = convertNativeBNToDecimal(exchange_1.exchange.greeks.productGreeks[greeksIndex].delta, constants.PRICING_PRECISION);
            let sigma = decimal_1.Decimal.fromAnchorDecimal(exchange_1.exchange.greeks.productGreeks[greeksIndex].volatility).toNumber();
            let vega = decimal_1.Decimal.fromAnchorDecimal(exchange_1.exchange.greeks.productGreeks[greeksIndex].vega).toNumber();
            console.log(`[MARKET] INDEX: ${market.marketIndex} KIND: ${market.kind} STRIKE: ${market.strike} MARK_PRICE: ${markPrice.toFixed(6)} DELTA: ${delta.toFixed(2)} IV: ${sigma.toFixed(6)} VEGA: ${vega.toFixed(6)}`);
        }
    }
}
exports.displayState = displayState;
async function getMarginFromOpenOrders(openOrders, marketIndex) {
    const [openOrdersMap, _openOrdersMapNonce] = await getOpenOrdersMap(exchange_1.exchange.programId, openOrders);
    let openOrdersMapInfo = (await exchange_1.exchange.program.account.openOrdersMap.fetch(openOrdersMap));
    const [marginAccount, _marginNonce] = await getMarginAccount(exchange_1.exchange.programId, exchange_1.exchange.markets.markets[marketIndex].zetaGroup, openOrdersMapInfo.userKey);
    return marginAccount;
}
exports.getMarginFromOpenOrders = getMarginFromOpenOrders;
function getNextStrikeInitialisationTs() {
    // If front expiration index is uninitialized
    let frontExpirySeries = exchange_1.exchange.markets.expirySeries[exchange_1.exchange.markets.frontExpiryIndex];
    if (!frontExpirySeries.strikesInitialized) {
        return (frontExpirySeries.activeTs -
            exchange_1.exchange.state.strikeInitializationThresholdSeconds);
    }
    // Checks for the first uninitialized back expiry series after our front expiry index
    let backExpiryTs = 0;
    let expiryIndex = exchange_1.exchange.markets.frontExpiryIndex;
    for (var i = 0; i < exchange_1.exchange.markets.expirySeries.length; i++) {
        // Wrap around
        if (expiryIndex == exchange_1.exchange.markets.expirySeries.length) {
            expiryIndex = 0;
        }
        if (!exchange_1.exchange.markets.expirySeries[expiryIndex].strikesInitialized) {
            return (exchange_1.exchange.markets.expirySeries[expiryIndex].activeTs -
                exchange_1.exchange.state.strikeInitializationThresholdSeconds);
        }
        backExpiryTs = Math.max(backExpiryTs, exchange_1.exchange.markets.expirySeries[expiryIndex].expiryTs);
        expiryIndex++;
    }
    return (backExpiryTs -
        exchange_1.exchange.state.strikeInitializationThresholdSeconds -
        exchange_1.exchange.state.newExpiryThresholdSeconds);
}
exports.getNextStrikeInitialisationTs = getNextStrikeInitialisationTs;
async function cleanZetaMarkets(marketAccountTuples) {
    let txs = [];
    for (var i = 0; i < marketAccountTuples.length; i += constants.CLEAN_MARKET_LIMIT) {
        let tx = new web3_js_1.Transaction();
        let slice = marketAccountTuples.slice(i, i + constants.CLEAN_MARKET_LIMIT);
        tx.add(program_instructions_1.cleanZetaMarketsIx(slice.flat()));
        txs.push(tx);
    }
    await Promise.all(txs.map(async (tx) => {
        await processTransaction(exchange_1.exchange.provider, tx);
    }));
}
exports.cleanZetaMarkets = cleanZetaMarkets;
async function cleanZetaMarketsHalted(marketAccountTuples) {
    let txs = [];
    for (var i = 0; i < marketAccountTuples.length; i += constants.CLEAN_MARKET_LIMIT) {
        let tx = new web3_js_1.Transaction();
        let slice = marketAccountTuples.slice(i, i + constants.CLEAN_MARKET_LIMIT);
        tx.add(program_instructions_1.cleanZetaMarketsHaltedIx(slice.flat()));
        txs.push(tx);
    }
    await Promise.all(txs.map(async (tx) => {
        await processTransaction(exchange_1.exchange.provider, tx);
    }));
}
exports.cleanZetaMarketsHalted = cleanZetaMarketsHalted;
async function settleUsers(userAccounts, expiryTs) {
    let [settlement, settlementNonce] = await getSettlement(exchange_1.exchange.programId, exchange_1.exchange.zetaGroup.underlyingMint, expiryTs);
    // TODO this is naive, the program will throw if user has active
    // orders for this expiration timestamp.
    // Maybe add a check, otherwise, make sure clean option markets works.
    let remainingAccounts = userAccounts.map((acc) => {
        return { pubkey: acc.publicKey, isSigner: false, isWritable: true };
    });
    let txs = [];
    for (var i = 0; i < remainingAccounts.length; i += constants.MAX_SETTLEMENT_ACCOUNTS) {
        let tx = new web3_js_1.Transaction();
        let slice = remainingAccounts.slice(i, i + constants.MAX_SETTLEMENT_ACCOUNTS);
        tx.add(exchange_1.exchange.program.instruction.settlePositions(expiryTs, settlementNonce, {
            accounts: {
                zetaGroup: exchange_1.exchange.zetaGroupAddress,
                settlementAccount: settlement,
            },
            remainingAccounts: slice,
        }));
        txs.push(tx);
    }
    await Promise.all(txs.map(async (tx) => {
        let txSig = await processTransaction(exchange_1.exchange.provider, tx);
        console.log(`Settling users - TxId: ${txSig}`);
    }));
}
exports.settleUsers = settleUsers;
/*
 * Allows you to pass in a map that may have cached values for openOrdersAccounts
 */
async function crankMarket(marketIndex, openOrdersToMargin) {
    let market = exchange_1.exchange.markets.markets[marketIndex];
    let eventQueue = await market.serumMarket.loadEventQueue(exchange_1.exchange.connection);
    if (eventQueue.length == 0) {
        return;
    }
    const openOrdersSet = new Set();
    for (var i = 0; i < eventQueue.length; i++) {
        openOrdersSet.add(eventQueue[i].openOrders.toString());
        if (openOrdersSet.size == constants.CRANK_ACCOUNT_LIMIT) {
            break;
        }
    }
    const uniqueOpenOrders = sortOpenOrderKeys([...openOrdersSet].map((s) => new web3_js_1.PublicKey(s)));
    let remainingAccounts = new Array(uniqueOpenOrders.length * 2);
    await Promise.all(uniqueOpenOrders.map(async (openOrders, index) => {
        let marginAccount;
        if (openOrdersToMargin && !openOrdersToMargin.has(openOrders)) {
            marginAccount = await getMarginFromOpenOrders(openOrders, marketIndex);
            openOrdersToMargin.set(openOrders, marginAccount);
        }
        else if (openOrdersToMargin && openOrdersToMargin.has(openOrders)) {
            marginAccount = openOrdersToMargin.get(openOrders);
        }
        else {
            marginAccount = await getMarginFromOpenOrders(openOrders, marketIndex);
        }
        let openOrdersIndex = index * 2;
        remainingAccounts[openOrdersIndex] = {
            pubkey: openOrders,
            isSigner: false,
            isWritable: true,
        };
        remainingAccounts[openOrdersIndex + 1] = {
            pubkey: marginAccount,
            isSigner: false,
            isWritable: true,
        };
    }));
    let tx = new web3_js_1.Transaction().add(program_instructions_1.crankMarketIx(market.address, market.serumMarket.decoded.eventQueue, constants.DEX_PID[exchange_1.exchange.network], remainingAccounts));
    await processTransaction(exchange_1.exchange.provider, tx);
}
exports.crankMarket = crankMarket;
async function expireSeries(expiryTs) {
    let [settlement, settlementNonce] = await getSettlement(exchange_1.exchange.programId, exchange_1.exchange.zetaGroup.underlyingMint, expiryTs);
    // TODO add some looping mechanism if called early.
    let ix = exchange_1.exchange.program.instruction.expireSeries(settlementNonce, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            oracle: exchange_1.exchange.zetaGroup.oracle,
            settlementAccount: settlement,
            payer: exchange_1.exchange.provider.wallet.publicKey,
            systemProgram: web3_js_1.SystemProgram.programId,
            greeks: exchange_1.exchange.zetaGroup.greeks,
        },
    });
    let tx = new web3_js_1.Transaction().add(ix);
    await processTransaction(exchange_1.exchange.provider, tx);
}
exports.expireSeries = expireSeries;
/**
 * Get the most recently expired index
 */
function getMostRecentExpiredIndex() {
    if (exchange_1.exchange.markets.frontExpiryIndex - 1 < 0) {
        return constants.ACTIVE_EXPIRIES - 1;
    }
    else {
        return exchange_1.exchange.markets.frontExpiryIndex - 1;
    }
}
exports.getMostRecentExpiredIndex = getMostRecentExpiredIndex;
function getMutMarketAccounts(marketIndex) {
    let market = exchange_1.exchange.markets.markets[marketIndex];
    return [
        { pubkey: market.address, isSigner: false, isWritable: false },
        {
            pubkey: market.serumMarket.decoded.bids,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: market.serumMarket.decoded.asks,
            isSigner: false,
            isWritable: false,
        },
    ];
}
exports.getMutMarketAccounts = getMutMarketAccounts;
async function getCancelAllIxs(orders, expiration) {
    let ixs = [];
    await Promise.all(orders.map(async (order) => {
        const [openOrdersMap, _openOrdersMapNonce] = await getOpenOrdersMap(exchange_1.exchange.programId, order.owner);
        let openOrdersMapInfo = (await exchange_1.exchange.program.account.openOrdersMap.fetch(openOrdersMap));
        const [marginAccount, _marginNonce] = await getMarginAccount(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress, openOrdersMapInfo.userKey);
        let ix = expiration
            ? program_instructions_1.cancelExpiredOrderIx(order.marketIndex, marginAccount, order.owner, order.orderId, order.side)
            : program_instructions_1.cancelOrderHaltedIx(order.marketIndex, marginAccount, order.owner, order.orderId, order.side);
        ixs.push(ix);
    }));
    return ixs;
}
exports.getCancelAllIxs = getCancelAllIxs;
async function writeKeypair(filename, keypair) {
    let secret = "[" + keypair.secretKey.toString() + "]";
    fs.writeFileSync(filename, secret);
}
exports.writeKeypair = writeKeypair;
async function getAllProgramAccountAddresses(accountType) {
    let noDataAccounts = await exchange_1.exchange.provider.connection.getProgramAccounts(exchange_1.exchange.programId, {
        commitment: exchange_1.exchange.provider.connection.commitment,
        dataSlice: {
            offset: 0,
            length: 0,
        },
        filters: [
            {
                memcmp: {
                    offset: 0,
                    bytes: bs58.encode(anchor.AccountsCoder.accountDiscriminator(accountType)),
                },
            },
        ],
    });
    let pubkeys = [];
    for (let i = 0; i < noDataAccounts.length; i++) {
        pubkeys.push(noDataAccounts[i].pubkey);
    }
    return pubkeys;
}
exports.getAllProgramAccountAddresses = getAllProgramAccountAddresses;
