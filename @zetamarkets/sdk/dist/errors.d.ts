import * as anchor from "@project-serum/anchor";
export declare const DEX_ERRORS: Map<number, string>;
export declare function parseIdlErrors(idl: anchor.Idl): Map<number, string>;
/**
 * Extract error code from custom non-anchor errors
 */
export declare function parseCustomError(untranslatedError: string): anchor.ProgramError;
export declare const idlErrors: Map<number, string>;
