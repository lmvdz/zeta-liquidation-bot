"use strict";
// Typescript port for rust decimal deserialization.
Object.defineProperty(exports, "__esModule", { value: true });
const anchor_1 = require("@project-serum/anchor");
const SCALE_MASK = 16711680;
const SCALE_SHIFT = 16;
const SIGN_MASK = 2147483648;
class Decimal {
    constructor(flags, hi, lo, mid) {
        this._flags = flags;
        this._hi = hi;
        this._lo = lo;
        this._mid = mid;
    }
    static fromAnchorDecimal(decimal) {
        return new Decimal(decimal.flags, decimal.hi, decimal.lo, decimal.mid);
    }
    scale() {
        return (this._flags & SCALE_MASK) >> SCALE_SHIFT;
    }
    isSignNegative() {
        return (this._flags & SIGN_MASK) > 0;
    }
    isSignPositive() {
        return (this._flags & SIGN_MASK) == 0;
    }
    toBN() {
        let bytes = [
            (this._hi >> 24) & 0xff,
            (this._hi >> 16) & 0xff,
            (this._hi >> 8) & 0xff,
            this._hi & 0xff,
            (this._mid >> 24) & 0xff,
            (this._mid >> 16) & 0xff,
            (this._mid >> 8) & 0xff,
            this._mid & 0xff,
            (this._lo >> 24) & 0xff,
            (this._lo >> 16) & 0xff,
            (this._lo >> 8) & 0xff,
            this._lo & 0xff,
        ];
        return new anchor_1.BN(new Uint8Array(bytes));
    }
    isUnset() {
        return this._hi == 0 && this._mid == 0 && this._lo == 0 && this._flags == 0;
    }
    toNumber() {
        if (this.isUnset()) {
            return 0;
        }
        let scale = this.scale();
        if (scale == 0) {
            // TODO don't need yet as we don't expect scale 0 decimals.
            throw Error("Scale 0 is not handled.");
        }
        let bn = this.toBN();
        // We use toString because only 53 bits can be stored for floats.
        return bn.toString() / 10 ** scale;
    }
}
exports.Decimal = Decimal;
