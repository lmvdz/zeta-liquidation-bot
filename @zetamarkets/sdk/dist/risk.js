"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exchange_1 = require("./exchange");
const types_1 = require("./types");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
class RiskCalculator {
    constructor() {
        this._marginRequirements = new Array(constants_1.ACTIVE_MARKETS);
    }
    /**
     * Returns the margin requirements for all markets,
     * indexed by market index.
     */
    get marginRequirement() {
        return this._marginRequirements;
    }
    updateMarginRequirements() {
        if (exchange_1.exchange.greeks === undefined || exchange_1.exchange.oracle === undefined) {
            return;
        }
        let oraclePrice = exchange_1.exchange.oracle.getPrice("SOL/USD");
        let spotPrice = oraclePrice === null ? 0 : oraclePrice.price;
        for (var i = 0; i < this._marginRequirements.length; i++) {
            this._marginRequirements[i] = calculateProductMargin(i, spotPrice);
        }
    }
    /**
     * Returns the margin requirement for a given market and size.
     * @param productIndex   market index of the product to calculate margin for.
     * @param size           signed integer of size for margin requirements (short orders should be negative)
     * @param marginType     type of margin calculation.
     */
    getMarginRequirement(productIndex, size, marginType) {
        if (this._marginRequirements[productIndex] === null) {
            return 0;
        }
        if (size > 0) {
            if (marginType == types_1.MarginType.INITIAL) {
                return size * this._marginRequirements[productIndex].initialLong;
            }
            else {
                return size * this._marginRequirements[productIndex].maintenanceLong;
            }
        }
        else {
            if (marginType == types_1.MarginType.INITIAL) {
                return (Math.abs(size) * this._marginRequirements[productIndex].initialShort);
            }
            else {
                return (Math.abs(size) *
                    this._marginRequirements[productIndex].maintenanceShort);
            }
        }
    }
    /**
     * Returns the size of an order that would be considered "opening", when applied to margin requirements.
     * Total intended trade size = closing size + opening size
     * @param size           signed integer of size for margin requirements (short orders should be negative)
     * @param position       signed integer the user's current position for that product (0 if none).
     * @param closingSize    unsigned integer of the user's current closing order quantity for that product (0 if none)
     */
    calculateOpeningSize(size, position, closingSize) {
        if ((size > 0 && position > 0) || (size < 0 && position < 0)) {
            return size;
        }
        let closeSize = Math.min(Math.abs(size), Math.abs(position) - closingSize);
        let openingSize = Math.abs(size) - closeSize;
        let sideMultiplier = size >= 0 ? 1 : -1;
        return sideMultiplier * openingSize;
    }
    /**
     * Returns the unrealized pnl for a given MarginAccount
     * @param marginAccount   the user's MarginAccount.
     */
    calculateUnrealizedPnl(marginAccount) {
        let pnl = 0;
        for (var i = 0; i < marginAccount.positions.length; i++) {
            let position = marginAccount.positions[i];
            if (position.position.toNumber() == 0) {
                continue;
            }
            if (position.position.toNumber() > 0) {
                pnl +=
                    utils_1.convertNativeLotSizeToDecimal(position.position.toNumber()) *
                        utils_1.convertNativeBNToDecimal(exchange_1.exchange.greeks.markPrices[i]) -
                        utils_1.convertNativeBNToDecimal(position.costOfTrades);
            }
            else {
                pnl +=
                    utils_1.convertNativeLotSizeToDecimal(position.position.toNumber()) *
                        utils_1.convertNativeBNToDecimal(exchange_1.exchange.greeks.markPrices[i]) +
                        utils_1.convertNativeBNToDecimal(position.costOfTrades);
            }
        }
        return pnl;
    }
    /**
     * Returns the total initial margin requirement for a given account.
     * @param marginAccount   the user's MarginAccount.
     */
    calculateTotalInitialMargin(marginAccount) {
        let margin = 0;
        for (var i = 0; i < marginAccount.positions.length; i++) {
            let position = marginAccount.positions[i];
            if (position.openingOrders[0].toNumber() == 0 &&
                position.openingOrders[1].toNumber() == 0) {
                continue;
            }
            let marginPerMarket = this.getMarginRequirement(i, 
            // Positive for buys.
            utils_1.convertNativeLotSizeToDecimal(position.openingOrders[0].toNumber()), types_1.MarginType.INITIAL) +
                this.getMarginRequirement(i, 
                // Negative for sells.
                utils_1.convertNativeLotSizeToDecimal(-position.openingOrders[1]), types_1.MarginType.INITIAL);
            if (marginPerMarket !== undefined) {
                margin += marginPerMarket;
            }
        }
        return margin;
    }
    /**
     * Returns the total maintenance margin requirement for a given account.
     * @param marginAccount   the user's MarginAccount.
     */
    calculateTotalMaintenanceMargin(marginAccount) {
        let margin = 0;
        for (var i = 0; i < marginAccount.positions.length; i++) {
            let position = marginAccount.positions[i];
            if (position.position.toNumber() == 0) {
                continue;
            }
            let _ = this.getMarginRequirement(i, 
            // This is signed.
            utils_1.convertNativeLotSizeToDecimal(position.position.toNumber()), types_1.MarginType.MAINTENANCE);
            if (_ !== undefined) {
                margin += _;
            }
        }
        return margin;
    }
    /**
     * Returns the total margin requirement for a given account.
     * @param marginAccount   the user's MarginAccount.
     */
    calculateTotalMargin(marginAccount) {
        return (this.calculateTotalInitialMargin(marginAccount) +
            this.calculateTotalMaintenanceMargin(marginAccount));
    }
    /**
     * Returns the aggregate margin account state.
     * @param marginAccount   the user's MarginAccount.
     */
    getMarginAccountState(marginAccount) {
        let balance = utils_1.convertNativeBNToDecimal(marginAccount.balance);
        let unrealizedPnl = this.calculateUnrealizedPnl(marginAccount);
        let initialMargin = this.calculateTotalInitialMargin(marginAccount);
        let maintenanceMargin = this.calculateTotalMaintenanceMargin(marginAccount);
        let totalMargin = initialMargin + maintenanceMargin;
        let availableBalance = balance + unrealizedPnl - totalMargin;
        return {
            balance,
            initialMargin,
            maintenanceMargin,
            totalMargin,
            unrealizedPnl,
            availableBalance,
        };
    }
}
exports.RiskCalculator = RiskCalculator;
// ** Calculation util functions **
/**
 * Calculates the price at which a position will be liquidated.
 * @param accountBalance    margin account balance.
 * @param marginRequirement total margin requirement for margin account.
 * @param unrealizedPnl     unrealized pnl for margin account.
 * @param markPrice         mark price of product being calculated.
 * @param position          signed position size of user.
 */
function calculateLiquidationPrice(accountBalance, marginRequirement, unrealizedPnl, markPrice, position) {
    if (position == 0) {
        return 0;
    }
    let availableBalance = accountBalance - marginRequirement + unrealizedPnl;
    return markPrice - availableBalance / position;
}
exports.calculateLiquidationPrice = calculateLiquidationPrice;
/**
 * Calculates how much the strike is out of the money.
 * @param kind          product kind (expect CALL/PUT);
 * @param strike        strike of the product.
 * @param spotPrice     price of the spot.
 */
function calculateOtmAmount(kind, strike, spotPrice) {
    switch (kind) {
        case types_1.Kind.CALL: {
            return Math.max(0, strike - spotPrice);
        }
        case types_1.Kind.PUT: {
            return Math.max(0, spotPrice - strike);
        }
        default:
            throw Error("Unsupported kind for OTM amount.");
    }
}
exports.calculateOtmAmount = calculateOtmAmount;
/**
 * Calculates the margin requirement for given market index.
 * @param productIndex  market index of the product.
 * @param spotPrice     price of the spot.
 */
function calculateProductMargin(productIndex, spotPrice) {
    let market = exchange_1.exchange.markets.markets[productIndex];
    if (market.strike == null) {
        return null;
    }
    let kind = market.kind;
    let strike = market.strike;
    let markPrice = utils_1.convertNativeBNToDecimal(exchange_1.exchange.greeks.markPrices[productIndex]);
    switch (kind) {
        case types_1.Kind.FUTURE:
            return calculateFutureMargin(spotPrice);
        case types_1.Kind.CALL:
        case types_1.Kind.PUT:
            return calculateOptionMargin(spotPrice, markPrice, kind, strike);
    }
}
exports.calculateProductMargin = calculateProductMargin;
/**
 * Calculates the margin requirement for a future.
 * @param spotPrice     price of the spot.
 */
function calculateFutureMargin(spotPrice) {
    let initial = spotPrice * exchange_1.exchange.marginParams.futureMarginInitial;
    let maintenance = spotPrice * exchange_1.exchange.marginParams.futureMarginMaintenance;
    return {
        initialLong: initial,
        initialShort: initial,
        maintenanceLong: maintenance,
        maintenanceShort: maintenance,
    };
}
exports.calculateFutureMargin = calculateFutureMargin;
/**
 * @param markPrice         mark price of product being calculated.
 * @param spotPrice         spot price of the underlying from oracle.
 * @param strike            strike of the option.
 * @param kind              kind of the option (expect CALL/PUT)
 */
function calculateOptionMargin(spotPrice, markPrice, kind, strike) {
    let otmAmount = calculateOtmAmount(kind, strike, spotPrice);
    let initialLong = calculateLongOptionMargin(spotPrice, markPrice, types_1.MarginType.INITIAL);
    let initialShort = calculateShortOptionMargin(spotPrice, otmAmount, types_1.MarginType.INITIAL);
    let maintenanceLong = calculateLongOptionMargin(spotPrice, markPrice, types_1.MarginType.MAINTENANCE);
    let maintenanceShort = calculateShortOptionMargin(spotPrice, otmAmount, types_1.MarginType.MAINTENANCE);
    return {
        initialLong,
        initialShort: kind == types_1.Kind.PUT
            ? Math.min(initialShort, exchange_1.exchange.marginParams.optionShortPutCapPercentage * strike)
            : initialShort,
        maintenanceLong,
        maintenanceShort: kind == types_1.Kind.PUT
            ? Math.min(maintenanceShort, exchange_1.exchange.marginParams.optionShortPutCapPercentage * strike)
            : maintenanceShort,
    };
}
exports.calculateOptionMargin = calculateOptionMargin;
/**
 * Calculates the margin requirement for a short option.
 * @param spotPrice    margin account balance.
 * @param otmAmount    otm amount calculated `from calculateOtmAmount`
 * @param marginType   type of margin calculation
 */
function calculateShortOptionMargin(spotPrice, otmAmount, marginType) {
    let basePercentageShort = marginType == types_1.MarginType.INITIAL
        ? exchange_1.exchange.marginParams.optionDynamicPercentageShortInitial
        : exchange_1.exchange.marginParams.optionDynamicPercentageShortMaintenance;
    let spotPricePercentageShort = marginType == types_1.MarginType.INITIAL
        ? exchange_1.exchange.marginParams.optionSpotPercentageShortInitial
        : exchange_1.exchange.marginParams.optionSpotPercentageShortMaintenance;
    let dynamicMargin = spotPrice * (basePercentageShort - otmAmount / spotPrice);
    let minMargin = spotPrice * spotPricePercentageShort;
    return Math.max(dynamicMargin, minMargin);
}
exports.calculateShortOptionMargin = calculateShortOptionMargin;
/**
 * Calculates the margin requirement for a long option.
 * @param spotPrice    margin account balance.
 * @param markPrice    mark price of option from greeks account.
 * @param marginType   type of margin calculation
 */
function calculateLongOptionMargin(spotPrice, markPrice, marginType) {
    let markPercentageLong = marginType == types_1.MarginType.INITIAL
        ? exchange_1.exchange.marginParams.optionMarkPercentageLongInitial
        : exchange_1.exchange.marginParams.optionMarkPercentageLongMaintenance;
    let spotPercentageLong = marginType == types_1.MarginType.INITIAL
        ? exchange_1.exchange.marginParams.optionSpotPercentageLongInitial
        : exchange_1.exchange.marginParams.optionSpotPercentageLongMaintenance;
    return Math.min(markPrice * markPercentageLong, spotPrice * spotPercentageLong);
}
exports.calculateLongOptionMargin = calculateLongOptionMargin;
