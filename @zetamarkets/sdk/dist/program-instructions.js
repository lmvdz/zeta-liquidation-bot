"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const exchange_1 = require("./exchange");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const utils = __importStar(require("./utils"));
const anchor = __importStar(require("@project-serum/anchor"));
const types_1 = require("./types");
const constants = __importStar(require("./constants"));
async function initializeMarginAccountTx(userKey) {
    let tx = new web3_js_1.Transaction();
    const [marginAccount, nonce] = await utils.getMarginAccount(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress, userKey);
    tx.add(exchange_1.exchange.program.instruction.initializeMarginAccount(nonce, {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            marginAccount: marginAccount,
            authority: userKey,
            zetaProgram: exchange_1.exchange.programId,
            systemProgram: web3_js_1.SystemProgram.programId,
        },
    }));
    return tx;
}
exports.initializeMarginAccountTx = initializeMarginAccountTx;
async function initializeInsuranceDepositAccountIx(userKey, userWhitelistInsuranceKey) {
    let [insuranceDepositAccount, nonce] = await utils.getUserInsuranceDepositAccount(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress, userKey);
    return exchange_1.exchange.program.instruction.initializeInsuranceDepositAccount(nonce, {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            insuranceDepositAccount,
            authority: userKey,
            systemProgram: web3_js_1.SystemProgram.programId,
            whitelistInsuranceAccount: userWhitelistInsuranceKey,
        },
    });
}
exports.initializeInsuranceDepositAccountIx = initializeInsuranceDepositAccountIx;
/**
 * @param amount the native amount to deposit (6dp)
 */
async function depositIx(amount, marginAccount, usdcAccount, userKey, whitelistDepositAccount) {
    let remainingAccounts = whitelistDepositAccount !== undefined
        ? [
            {
                pubkey: whitelistDepositAccount,
                isSigner: false,
                isWritable: false,
            },
        ]
        : [];
    // TODO: Probably use mint to find decimal places in future.
    return exchange_1.exchange.program.instruction.deposit(new anchor.BN(amount), {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            marginAccount: marginAccount,
            vault: exchange_1.exchange.vaultAddress,
            userTokenAccount: usdcAccount,
            socializedLossAccount: exchange_1.exchange.socializedLossAccountAddress,
            authority: userKey,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            state: exchange_1.exchange.stateAddress,
            greeks: exchange_1.exchange.zetaGroup.greeks,
        },
        remainingAccounts,
    });
}
exports.depositIx = depositIx;
/**
 * @param amount
 * @param insuranceDepositAccount
 * @param usdcAccount
 * @param userKey
 */
function depositInsuranceVaultIx(amount, insuranceDepositAccount, usdcAccount, userKey) {
    return exchange_1.exchange.program.instruction.depositInsuranceVault(new anchor.BN(amount), {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            insuranceVault: exchange_1.exchange.insuranceVaultAddress,
            insuranceDepositAccount,
            userTokenAccount: usdcAccount,
            zetaVault: exchange_1.exchange.vaultAddress,
            socializedLossAccount: exchange_1.exchange.socializedLossAccountAddress,
            authority: userKey,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        },
    });
}
exports.depositInsuranceVaultIx = depositInsuranceVaultIx;
function withdrawInsuranceVaultIx(percentageAmount, insuranceDepositAccount, usdcAccount, userKey) {
    return exchange_1.exchange.program.instruction.withdrawInsuranceVault(new anchor.BN(percentageAmount), {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            insuranceVault: exchange_1.exchange.insuranceVaultAddress,
            insuranceDepositAccount,
            userTokenAccount: usdcAccount,
            authority: userKey,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        },
    });
}
exports.withdrawInsuranceVaultIx = withdrawInsuranceVaultIx;
/**
 * @param amount the native amount to withdraw (6dp)
 */
function withdrawIx(amount, marginAccount, usdcAccount, userKey) {
    return exchange_1.exchange.program.instruction.withdraw(new anchor.BN(amount), {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            vault: exchange_1.exchange.vaultAddress,
            marginAccount: marginAccount,
            userTokenAccount: usdcAccount,
            authority: userKey,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            greeks: exchange_1.exchange.zetaGroup.greeks,
            oracle: exchange_1.exchange.zetaGroup.oracle,
            socializedLossAccount: exchange_1.exchange.socializedLossAccountAddress,
        },
    });
}
exports.withdrawIx = withdrawIx;
async function initializeOpenOrdersIx(market, userKey, marginAccount) {
    const [openOrdersPda, openOrdersNonce] = await utils.getOpenOrders(exchange_1.exchange.programId, market, userKey);
    const [openOrdersMap, openOrdersMapNonce] = await utils.getOpenOrdersMap(exchange_1.exchange.programId, openOrdersPda);
    return [
        exchange_1.exchange.program.instruction.initializeOpenOrders(openOrdersNonce, openOrdersMapNonce, {
            accounts: {
                state: exchange_1.exchange.stateAddress,
                zetaGroup: exchange_1.exchange.zetaGroupAddress,
                dexProgram: constants.DEX_PID[exchange_1.exchange.network],
                systemProgram: web3_js_1.SystemProgram.programId,
                openOrders: openOrdersPda,
                marginAccount: marginAccount,
                authority: userKey,
                market: market,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
                serumAuthority: exchange_1.exchange.serumAuthority,
                openOrdersMap,
            },
        }),
        openOrdersPda,
    ];
}
exports.initializeOpenOrdersIx = initializeOpenOrdersIx;
function placeOrderIx(marketIndex, price, size, side, clientOrderId, marginAccount, authority, openOrders, whitelistTradingFeesAccount) {
    let marketData = exchange_1.exchange.markets.markets[marketIndex];
    let remainingAccounts = whitelistTradingFeesAccount !== undefined
        ? [
            {
                pubkey: whitelistTradingFeesAccount,
                isSigner: false,
                isWritable: false,
            },
        ]
        : [];
    return exchange_1.exchange.program.instruction.placeOrder(new anchor.BN(price), new anchor.BN(size), types_1.toProgramSide(side), clientOrderId == 0 ? null : new anchor.BN(clientOrderId), {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            marginAccount: marginAccount,
            authority: authority,
            dexProgram: constants.DEX_PID[exchange_1.exchange.network],
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            serumAuthority: exchange_1.exchange.serumAuthority,
            greeks: exchange_1.exchange.zetaGroup.greeks,
            openOrders: openOrders,
            rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            marketAccounts: {
                market: marketData.serumMarket.decoded.ownAddress,
                requestQueue: marketData.serumMarket.decoded.requestQueue,
                eventQueue: marketData.serumMarket.decoded.eventQueue,
                bids: marketData.serumMarket.decoded.bids,
                asks: marketData.serumMarket.decoded.asks,
                coinVault: marketData.serumMarket.decoded.baseVault,
                pcVault: marketData.serumMarket.decoded.quoteVault,
                // User params.
                orderPayerTokenAccount: side == types_1.Side.BID ? marketData.quoteVault : marketData.baseVault,
                coinWallet: marketData.baseVault,
                pcWallet: marketData.quoteVault,
            },
            oracle: exchange_1.exchange.zetaGroup.oracle,
            marketNode: exchange_1.exchange.greeks.nodeKeys[marketIndex],
            marketMint: side == types_1.Side.BID
                ? marketData.serumMarket.quoteMintAddress
                : marketData.serumMarket.baseMintAddress,
            mintAuthority: exchange_1.exchange.mintAuthority,
        },
        remainingAccounts,
    });
}
exports.placeOrderIx = placeOrderIx;
function cancelOrderIx(marketIndex, userKey, marginAccount, openOrders, orderId, side) {
    let marketData = exchange_1.exchange.markets.markets[marketIndex];
    return exchange_1.exchange.program.instruction.cancelOrder(types_1.toProgramSide(side), orderId, {
        accounts: {
            authority: userKey,
            cancelAccounts: {
                zetaGroup: exchange_1.exchange.zetaGroupAddress,
                state: exchange_1.exchange.stateAddress,
                marginAccount,
                dexProgram: constants.DEX_PID[exchange_1.exchange.network],
                serumAuthority: exchange_1.exchange.serumAuthority,
                openOrders,
                market: marketData.address,
                bids: marketData.serumMarket.decoded.bids,
                asks: marketData.serumMarket.decoded.asks,
                eventQueue: marketData.serumMarket.decoded.eventQueue,
            },
        },
    });
}
exports.cancelOrderIx = cancelOrderIx;
function cancelOrderByClientOrderIdIx(marketIndex, userKey, marginAccount, openOrders, clientOrderId) {
    let marketData = exchange_1.exchange.markets.markets[marketIndex];
    return exchange_1.exchange.program.instruction.cancelOrderByClientOrderId(clientOrderId, {
        accounts: {
            authority: userKey,
            cancelAccounts: {
                zetaGroup: exchange_1.exchange.zetaGroupAddress,
                state: exchange_1.exchange.stateAddress,
                marginAccount,
                dexProgram: constants.DEX_PID[exchange_1.exchange.network],
                serumAuthority: exchange_1.exchange.serumAuthority,
                openOrders,
                market: marketData.address,
                bids: marketData.serumMarket.decoded.bids,
                asks: marketData.serumMarket.decoded.asks,
                eventQueue: marketData.serumMarket.decoded.eventQueue,
            },
        },
    });
}
exports.cancelOrderByClientOrderIdIx = cancelOrderByClientOrderIdIx;
function cancelExpiredOrderIx(marketIndex, marginAccount, openOrders, orderId, side) {
    let marketData = exchange_1.exchange.markets.markets[marketIndex];
    return exchange_1.exchange.program.instruction.cancelExpiredOrder(types_1.toProgramSide(side), orderId, {
        accounts: {
            cancelAccounts: {
                zetaGroup: exchange_1.exchange.zetaGroupAddress,
                state: exchange_1.exchange.stateAddress,
                marginAccount,
                dexProgram: constants.DEX_PID[exchange_1.exchange.network],
                serumAuthority: exchange_1.exchange.serumAuthority,
                openOrders,
                market: marketData.address,
                bids: marketData.serumMarket.decoded.bids,
                asks: marketData.serumMarket.decoded.asks,
                eventQueue: marketData.serumMarket.decoded.eventQueue,
            },
        },
    });
}
exports.cancelExpiredOrderIx = cancelExpiredOrderIx;
function forceCancelOrdersIx(marketIndex, marginAccount, openOrders) {
    let marketData = exchange_1.exchange.markets.markets[marketIndex];
    return exchange_1.exchange.program.instruction.forceCancelOrders({
        accounts: {
            greeks: exchange_1.exchange.zetaGroup.greeks,
            oracle: exchange_1.exchange.zetaGroup.oracle,
            cancelAccounts: {
                zetaGroup: exchange_1.exchange.zetaGroupAddress,
                state: exchange_1.exchange.stateAddress,
                marginAccount,
                dexProgram: constants.DEX_PID[exchange_1.exchange.network],
                serumAuthority: exchange_1.exchange.serumAuthority,
                openOrders,
                market: marketData.address,
                bids: marketData.serumMarket.decoded.bids,
                asks: marketData.serumMarket.decoded.asks,
                eventQueue: marketData.serumMarket.decoded.eventQueue,
            },
        },
    });
}
exports.forceCancelOrdersIx = forceCancelOrdersIx;
async function initializeZetaMarketTxs(marketIndex, seedIndex, requestQueue, eventQueue, bids, asks, marketIndexes) {
    const [market, marketNonce] = await utils.getMarketUninitialized(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress, seedIndex);
    const [vaultOwner, vaultSignerNonce] = await utils.getSerumVaultOwnerAndNonce(market, constants.DEX_PID[exchange_1.exchange.network]);
    const [baseMint, baseMintNonce] = await utils.getBaseMint(exchange_1.exchange.program.programId, market);
    const [quoteMint, quoteMintNonce] = await utils.getQuoteMint(exchange_1.exchange.program.programId, market);
    // Create SPL token vaults for serum trading owned by the Zeta program
    const [zetaBaseVault, zetaBaseVaultNonce] = await utils.getZetaVault(exchange_1.exchange.program.programId, baseMint);
    const [zetaQuoteVault, zetaQuoteVaultNonce] = await utils.getZetaVault(exchange_1.exchange.program.programId, quoteMint);
    // Create SPL token vaults for serum trading owned by the DEX program
    const [dexBaseVault, dexBaseVaultNonce] = await utils.getSerumVault(exchange_1.exchange.program.programId, baseMint);
    const [dexQuoteVault, dexQuoteVaultNonce] = await utils.getSerumVault(exchange_1.exchange.program.programId, quoteMint);
    const tx = new web3_js_1.Transaction();
    tx.add(web3_js_1.SystemProgram.createAccount({
        fromPubkey: exchange_1.exchange.provider.wallet.publicKey,
        newAccountPubkey: requestQueue,
        lamports: await exchange_1.exchange.provider.connection.getMinimumBalanceForRentExemption(5120 + 12),
        space: 5120 + 12,
        programId: constants.DEX_PID[exchange_1.exchange.network],
    }), web3_js_1.SystemProgram.createAccount({
        fromPubkey: exchange_1.exchange.provider.wallet.publicKey,
        newAccountPubkey: eventQueue,
        lamports: await exchange_1.exchange.provider.connection.getMinimumBalanceForRentExemption(262144 + 12),
        space: 262144 + 12,
        programId: constants.DEX_PID[exchange_1.exchange.network],
    }), web3_js_1.SystemProgram.createAccount({
        fromPubkey: exchange_1.exchange.provider.wallet.publicKey,
        newAccountPubkey: bids,
        lamports: await exchange_1.exchange.provider.connection.getMinimumBalanceForRentExemption(65536 + 12),
        space: 65536 + 12,
        programId: constants.DEX_PID[exchange_1.exchange.network],
    }), web3_js_1.SystemProgram.createAccount({
        fromPubkey: exchange_1.exchange.provider.wallet.publicKey,
        newAccountPubkey: asks,
        lamports: await exchange_1.exchange.provider.connection.getMinimumBalanceForRentExemption(65536 + 12),
        space: 65536 + 12,
        programId: constants.DEX_PID[exchange_1.exchange.network],
    }));
    let tx2 = new web3_js_1.Transaction().add(exchange_1.exchange.program.instruction.initializeZetaMarket({
        index: marketIndex,
        marketNonce,
        baseMintNonce,
        quoteMintNonce,
        zetaBaseVaultNonce,
        zetaQuoteVaultNonce,
        dexBaseVaultNonce,
        dexQuoteVaultNonce,
        vaultSignerNonce,
    }, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            marketIndexes: marketIndexes,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            admin: exchange_1.exchange.provider.wallet.publicKey,
            market,
            requestQueue: requestQueue,
            eventQueue: eventQueue,
            bids: bids,
            asks: asks,
            baseMint,
            quoteMint,
            zetaBaseVault,
            zetaQuoteVault,
            dexBaseVault,
            dexQuoteVault,
            vaultOwner,
            mintAuthority: exchange_1.exchange.mintAuthority,
            serumAuthority: exchange_1.exchange.serumAuthority,
            dexProgram: constants.DEX_PID[exchange_1.exchange.network],
            systemProgram: web3_js_1.SystemProgram.programId,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            rent: web3_js_1.SYSVAR_RENT_PUBKEY,
        },
    }));
    return [tx, tx2];
}
exports.initializeZetaMarketTxs = initializeZetaMarketTxs;
async function initializeZetaGroupIx(underlyingMint, oracle, pricingArgs, marginArgs) {
    let [zetaGroup, zetaGroupNonce] = await utils.getZetaGroup(exchange_1.exchange.programId, underlyingMint);
    let [underlying, underlyingNonce] = await utils.getUnderlying(exchange_1.exchange.programId, exchange_1.exchange.state.numUnderlyings);
    let [greeks, greeksNonce] = await utils.getGreeks(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress);
    let [vault, vaultNonce] = await utils.getVault(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress);
    let [insuranceVault, insuranceVaultNonce] = await utils.getZetaInsuranceVault(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress);
    let [socializedLossAccount, socializedLossAccountNonce] = await utils.getSocializedLossAccount(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress);
    return exchange_1.exchange.program.instruction.initializeZetaGroup({
        zetaGroupNonce,
        underlyingNonce,
        greeksNonce,
        vaultNonce,
        insuranceVaultNonce,
        socializedLossAccountNonce,
        interestRate: pricingArgs.interestRate,
        volatility: pricingArgs.volatility,
        optionTradeNormalizer: pricingArgs.optionTradeNormalizer,
        futureTradeNormalizer: pricingArgs.futureTradeNormalizer,
        maxVolatilityRetreat: pricingArgs.maxVolatilityRetreat,
        maxInterestRetreat: pricingArgs.maxInterestRetreat,
        maxDelta: pricingArgs.maxDelta,
        minDelta: pricingArgs.minDelta,
        minInterestRate: pricingArgs.minInterestRate,
        maxInterestRate: pricingArgs.maxInterestRate,
        minVolatility: pricingArgs.minVolatility,
        maxVolatility: pricingArgs.maxVolatility,
        futureMarginInitial: marginArgs.futureMarginInitial,
        futureMarginMaintenance: marginArgs.futureMarginMaintenance,
        optionMarkPercentageLongInitial: marginArgs.optionMarkPercentageLongInitial,
        optionSpotPercentageLongInitial: marginArgs.optionSpotPercentageLongInitial,
        optionSpotPercentageShortInitial: marginArgs.optionSpotPercentageShortInitial,
        optionDynamicPercentageShortInitial: marginArgs.optionDynamicPercentageShortInitial,
        optionMarkPercentageLongMaintenance: marginArgs.optionMarkPercentageLongMaintenance,
        optionSpotPercentageLongMaintenance: marginArgs.optionSpotPercentageLongMaintenance,
        optionSpotPercentageShortMaintenance: marginArgs.optionSpotPercentageShortMaintenance,
        optionDynamicPercentageShortMaintenance: marginArgs.optionDynamicPercentageShortMaintenance,
        optionShortPutCapPercentage: marginArgs.optionShortPutCapPercentage,
    }, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            admin: exchange_1.exchange.provider.wallet.publicKey,
            systemProgram: web3_js_1.SystemProgram.programId,
            underlyingMint,
            zetaProgram: exchange_1.exchange.programId,
            oracle,
            zetaGroup,
            greeks,
            underlying,
            vault,
            insuranceVault,
            socializedLossAccount,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            usdcMint: exchange_1.exchange.usdcMintAddress,
            rent: web3_js_1.SYSVAR_RENT_PUBKEY,
        },
    });
}
exports.initializeZetaGroupIx = initializeZetaGroupIx;
function rebalanceInsuranceVaultIx(remainingAccounts) {
    return exchange_1.exchange.program.instruction.rebalanceInsuranceVault({
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            zetaVault: exchange_1.exchange.vaultAddress,
            insuranceVault: exchange_1.exchange.insuranceVaultAddress,
            socializedLossAccount: exchange_1.exchange.socializedLossAccountAddress,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        },
        remainingAccounts,
    });
}
exports.rebalanceInsuranceVaultIx = rebalanceInsuranceVaultIx;
function liquidateIx(liquidator, liquidatorMarginAccount, market, liquidatedMarginAccount, size) {
    return exchange_1.exchange.program.instruction.liquidate(new anchor.BN(size), {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            liquidator,
            liquidatorMarginAccount,
            greeks: exchange_1.exchange.zetaGroup.greeks,
            oracle: exchange_1.exchange.zetaGroup.oracle,
            market,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            liquidatedMarginAccount,
        },
    });
}
exports.liquidateIx = liquidateIx;
function crankMarketIx(market, eventQueue, dexProgram, remainingAccounts) {
    return exchange_1.exchange.program.instruction.crankEventQueue({
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            market,
            eventQueue,
            dexProgram,
            serumAuthority: exchange_1.exchange.serumAuthority,
        },
        remainingAccounts,
    });
}
exports.crankMarketIx = crankMarketIx;
async function initializeMarketNodeIx(index) {
    let [marketNode, nonce] = await utils.getMarketNode(exchange_1.exchange.programId, exchange_1.exchange.zetaGroupAddress, index);
    return exchange_1.exchange.program.instruction.initializeMarketNode({ nonce, index }, {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            marketNode,
            greeks: exchange_1.exchange.greeksAddress,
            payer: exchange_1.exchange.provider.wallet.publicKey,
            systemProgram: web3_js_1.SystemProgram.programId,
        },
    });
}
exports.initializeMarketNodeIx = initializeMarketNodeIx;
function retreatMarketNodesIx(expiryIndex) {
    let head = expiryIndex * constants.PRODUCTS_PER_EXPIRY;
    let remainingAccounts = exchange_1.exchange.greeks.nodeKeys
        .map((x) => {
        return {
            pubkey: x,
            isSigner: false,
            isWritable: true,
        };
    })
        .slice(head, head + constants.PRODUCTS_PER_EXPIRY);
    return exchange_1.exchange.program.instruction.retreatMarketNodes(expiryIndex, {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            greeks: exchange_1.exchange.greeksAddress,
            oracle: exchange_1.exchange.zetaGroup.oracle,
        },
        remainingAccounts,
    });
}
exports.retreatMarketNodesIx = retreatMarketNodesIx;
function updatePricingIx(expiryIndex) {
    return exchange_1.exchange.program.instruction.updatePricing(expiryIndex, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            greeks: exchange_1.exchange.greeksAddress,
            oracle: exchange_1.exchange.zetaGroup.oracle,
        },
    });
}
exports.updatePricingIx = updatePricingIx;
function updatePricingParametersIx(args, admin) {
    return exchange_1.exchange.program.instruction.updatePricingParameters(args, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            admin,
        },
    });
}
exports.updatePricingParametersIx = updatePricingParametersIx;
function updateMarginParametersIx(args, admin) {
    return exchange_1.exchange.program.instruction.updateMarginParameters(args, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            admin,
        },
    });
}
exports.updateMarginParametersIx = updateMarginParametersIx;
function updateVolatilityNodesIx(nodes, admin) {
    return exchange_1.exchange.program.instruction.updateVolatilityNodes(nodes, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            greeks: exchange_1.exchange.greeksAddress,
            admin,
        },
    });
}
exports.updateVolatilityNodesIx = updateVolatilityNodesIx;
function initializeZetaStateIx(stateAddress, stateNonce, serumAuthority, serumNonce, mintAuthority, mintAuthorityNonce, params) {
    let args = params;
    args["stateNonce"] = stateNonce;
    args["serumNonce"] = serumNonce;
    args["mintAuthNonce"] = mintAuthorityNonce;
    return exchange_1.exchange.program.instruction.initializeZetaState(args, {
        accounts: {
            state: stateAddress,
            serumAuthority,
            mintAuthority,
            rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            systemProgram: web3_js_1.SystemProgram.programId,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            admin: exchange_1.exchange.provider.wallet.publicKey,
        },
    });
}
exports.initializeZetaStateIx = initializeZetaStateIx;
function updateZetaStateIx(params, admin) {
    return exchange_1.exchange.program.instruction.updateZetaState(params, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            admin,
        },
    });
}
exports.updateZetaStateIx = updateZetaStateIx;
function initializeMarketIndexesIx(marketIndexes, nonce) {
    return exchange_1.exchange.program.instruction.initializeMarketIndexes(nonce, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            marketIndexes: marketIndexes,
            admin: exchange_1.exchange.provider.wallet.publicKey,
            systemProgram: web3_js_1.SystemProgram.programId,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
        },
    });
}
exports.initializeMarketIndexesIx = initializeMarketIndexesIx;
function addMarketIndexesIx(marketIndexes) {
    return exchange_1.exchange.program.instruction.addMarketIndexes({
        accounts: {
            marketIndexes,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
        },
    });
}
exports.addMarketIndexesIx = addMarketIndexesIx;
function initializeMarketStrikesIx() {
    return exchange_1.exchange.program.instruction.initializeMarketStrikes({
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            oracle: exchange_1.exchange.zetaGroup.oracle,
        },
    });
}
exports.initializeMarketStrikesIx = initializeMarketStrikesIx;
async function initializeWhitelistDepositAccountIx(user, admin) {
    let [whitelistDepositAccount, whitelistDepositNonce] = await utils.getUserWhitelistDepositAccount(exchange_1.exchange.program.programId, user);
    return exchange_1.exchange.program.instruction.initializeWhitelistDepositAccount(whitelistDepositNonce, {
        accounts: {
            whitelistDepositAccount,
            admin,
            user: user,
            systemProgram: web3_js_1.SystemProgram.programId,
            state: exchange_1.exchange.stateAddress,
        },
    });
}
exports.initializeWhitelistDepositAccountIx = initializeWhitelistDepositAccountIx;
async function initializeWhitelistInsuranceAccountIx(user, admin) {
    let [whitelistInsuranceAccount, whitelistInsuranceNonce] = await utils.getUserWhitelistInsuranceAccount(exchange_1.exchange.program.programId, user);
    return exchange_1.exchange.program.instruction.initializeWhitelistInsuranceAccount(whitelistInsuranceNonce, {
        accounts: {
            whitelistInsuranceAccount,
            admin,
            user: user,
            systemProgram: web3_js_1.SystemProgram.programId,
            state: exchange_1.exchange.stateAddress,
        },
    });
}
exports.initializeWhitelistInsuranceAccountIx = initializeWhitelistInsuranceAccountIx;
async function initializeWhitelistTradingFeesAccountIx(user, admin) {
    let [whitelistTradingFeesAccount, whitelistTradingFeesNonce] = await utils.getUserWhitelistTradingFeesAccount(exchange_1.exchange.program.programId, user);
    return exchange_1.exchange.program.instruction.initializeWhitelistTradingFeesAccount(whitelistTradingFeesNonce, {
        accounts: {
            whitelistTradingFeesAccount,
            admin,
            user: user,
            systemProgram: web3_js_1.SystemProgram.programId,
            state: exchange_1.exchange.stateAddress,
        },
    });
}
exports.initializeWhitelistTradingFeesAccountIx = initializeWhitelistTradingFeesAccountIx;
function settlePositionsTxs(expirationTs, settlementPda, nonce, marginAccounts) {
    let txs = [];
    for (var i = 0; i < marginAccounts.length; i += constants.MAX_SETTLEMENT_ACCOUNTS) {
        let tx = new web3_js_1.Transaction();
        let slice = marginAccounts.slice(i, i + constants.MAX_SETTLEMENT_ACCOUNTS);
        tx.add(settlePositionsIx(expirationTs, settlementPda, nonce, slice));
        txs.push(tx);
    }
    return txs;
}
exports.settlePositionsTxs = settlePositionsTxs;
function settlePositionsIx(expirationTs, settlementPda, nonce, marginAccounts) {
    return exchange_1.exchange.program.instruction.settlePositions(expirationTs, nonce, {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            settlementAccount: settlementPda,
        },
        remainingAccounts: marginAccounts,
    });
}
exports.settlePositionsIx = settlePositionsIx;
function settlePositionsHaltedTxs(marginAccounts, admin) {
    let txs = [];
    for (var i = 0; i < marginAccounts.length; i += constants.MAX_SETTLEMENT_ACCOUNTS) {
        let slice = marginAccounts.slice(i, i + constants.MAX_SETTLEMENT_ACCOUNTS);
        txs.push(new web3_js_1.Transaction().add(settlePositionsHaltedIx(slice, admin)));
    }
    return txs;
}
exports.settlePositionsHaltedTxs = settlePositionsHaltedTxs;
function settlePositionsHaltedIx(marginAccounts, admin) {
    return exchange_1.exchange.program.instruction.settlePositionsHalted({
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            greeks: exchange_1.exchange.greeksAddress,
            admin,
        },
        remainingAccounts: marginAccounts,
    });
}
exports.settlePositionsHaltedIx = settlePositionsHaltedIx;
function cleanZetaMarketsIx(marketAccounts) {
    return exchange_1.exchange.program.instruction.cleanZetaMarkets({
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
        },
        remainingAccounts: marketAccounts,
    });
}
exports.cleanZetaMarketsIx = cleanZetaMarketsIx;
function cleanZetaMarketsHaltedIx(marketAccounts) {
    return exchange_1.exchange.program.instruction.cleanZetaMarketsHalted({
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
        },
        remainingAccounts: marketAccounts,
    });
}
exports.cleanZetaMarketsHaltedIx = cleanZetaMarketsHaltedIx;
function updatePricingHaltedIx(expiryIndex, admin) {
    return exchange_1.exchange.program.instruction.updatePricingHalted(expiryIndex, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            greeks: exchange_1.exchange.greeksAddress,
            admin,
        },
    });
}
exports.updatePricingHaltedIx = updatePricingHaltedIx;
function cleanMarketNodesIx(expiryIndex) {
    let head = expiryIndex * constants.PRODUCTS_PER_EXPIRY;
    let remainingAccounts = exchange_1.exchange.greeks.nodeKeys
        .map((x) => {
        return {
            pubkey: x,
            isSigner: false,
            isWritable: true,
        };
    })
        .slice(head, head + constants.PRODUCTS_PER_EXPIRY);
    return exchange_1.exchange.program.instruction.cleanMarketNodes(expiryIndex, {
        accounts: {
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            greeks: exchange_1.exchange.greeksAddress,
        },
        remainingAccounts,
    });
}
exports.cleanMarketNodesIx = cleanMarketNodesIx;
function cancelOrderHaltedIx(marketIndex, marginAccount, openOrders, orderId, side) {
    let marketData = exchange_1.exchange.markets.markets[marketIndex];
    return exchange_1.exchange.program.instruction.cancelOrderHalted(types_1.toProgramSide(side), orderId, {
        accounts: {
            cancelAccounts: {
                zetaGroup: exchange_1.exchange.zetaGroupAddress,
                state: exchange_1.exchange.stateAddress,
                marginAccount,
                dexProgram: constants.DEX_PID[exchange_1.exchange.network],
                serumAuthority: exchange_1.exchange.serumAuthority,
                openOrders,
                market: marketData.address,
                bids: marketData.serumMarket.decoded.bids,
                asks: marketData.serumMarket.decoded.asks,
                eventQueue: marketData.serumMarket.decoded.eventQueue,
            },
        },
    });
}
exports.cancelOrderHaltedIx = cancelOrderHaltedIx;
function haltZetaGroupIx(zetaGroupAddress, admin) {
    return exchange_1.exchange.program.instruction.haltZetaGroup({
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: zetaGroupAddress,
            greeks: exchange_1.exchange.greeksAddress,
            admin,
        },
    });
}
exports.haltZetaGroupIx = haltZetaGroupIx;
function unhaltZetaGroupIx(zetaGroupAddress, admin) {
    return exchange_1.exchange.program.instruction.unhaltZetaGroup({
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: zetaGroupAddress,
            admin,
        },
    });
}
exports.unhaltZetaGroupIx = unhaltZetaGroupIx;
function updateHaltStateIx(zetaGroupAddress, args, admin) {
    return exchange_1.exchange.program.instruction.updateHaltState(args, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: zetaGroupAddress,
            admin,
        },
    });
}
exports.updateHaltStateIx = updateHaltStateIx;
function updateVolatilityIx(args, admin) {
    return exchange_1.exchange.program.instruction.updateVolatility(args, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            greeks: exchange_1.exchange.greeksAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            admin,
        },
    });
}
exports.updateVolatilityIx = updateVolatilityIx;
function updateInterestRateIx(args, admin) {
    return exchange_1.exchange.program.instruction.updateInterestRate(args, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            greeks: exchange_1.exchange.greeksAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            admin,
        },
    });
}
exports.updateInterestRateIx = updateInterestRateIx;
function updateAdminIx(admin, newAdmin) {
    return exchange_1.exchange.program.instruction.updateAdmin({
        accounts: {
            state: exchange_1.exchange.stateAddress,
            admin,
            newAdmin,
        },
    });
}
exports.updateAdminIx = updateAdminIx;
function expireSeriesOverrideIx(admin, settlementAccount, args) {
    return exchange_1.exchange.program.instruction.expireSeriesOverride(args, {
        accounts: {
            state: exchange_1.exchange.stateAddress,
            zetaGroup: exchange_1.exchange.zetaGroupAddress,
            settlementAccount: settlementAccount,
            admin: admin,
            systemProgram: web3_js_1.SystemProgram.programId,
            greeks: exchange_1.exchange.greeksAddress,
        },
    });
}
exports.expireSeriesOverrideIx = expireSeriesOverrideIx;
