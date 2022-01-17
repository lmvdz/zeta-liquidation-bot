import { AnchorDecimal } from "./program-types";
import { BN } from "@project-serum/anchor";
export declare class Decimal {
    private _flags;
    private _hi;
    private _lo;
    private _mid;
    constructor(flags: number, hi: number, lo: number, mid: number);
    static fromAnchorDecimal(decimal: AnchorDecimal): Decimal;
    scale(): number;
    isSignNegative(): boolean;
    isSignPositive(): boolean;
    toBN(): BN;
    isUnset(): boolean;
    toNumber(): number;
}
