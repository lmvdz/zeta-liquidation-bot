"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const zeta_json_1 = __importDefault(require("./idl/zeta.json"));
const anchor = __importStar(require("@project-serum/anchor"));
exports.DEX_ERRORS = new Map([
    [59, "Order doesn't exist"],
    [61, "Order would self-trade"],
]);
function parseIdlErrors(idl) {
    const errors = new Map();
    if (idl.errors) {
        idl.errors.forEach((e) => {
            var _a;
            let msg = (_a = e.msg) !== null && _a !== void 0 ? _a : e.name;
            errors.set(e.code, msg);
        });
    }
    return errors;
}
exports.parseIdlErrors = parseIdlErrors;
/**
 * Extract error code from custom non-anchor errors
 */
function parseCustomError(untranslatedError) {
    let components = untranslatedError.toString().split("custom program error: ");
    if (components.length !== 2) {
        return null;
    }
    let errorCode;
    try {
        errorCode = parseInt(components[1]);
    }
    catch (parseErr) {
        return null;
    }
    // Parse user error.
    let errorMsg = exports.DEX_ERRORS.get(errorCode);
    if (errorMsg !== undefined) {
        return new anchor.ProgramError(errorCode, errorMsg, errorCode + ": " + errorMsg);
    }
}
exports.parseCustomError = parseCustomError;
exports.idlErrors = parseIdlErrors(zeta_json_1.default);
