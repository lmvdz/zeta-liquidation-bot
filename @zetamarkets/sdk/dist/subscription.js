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
const anchor = __importStar(require("@project-serum/anchor"));
const bs58 = __importStar(require("bs58"));
function subscribeProgramAccounts(accountType, callback) {
    const discriminator = anchor.AccountsCoder.accountDiscriminator(accountType);
    const subscriptionId = exchange_1.exchange.connection.onProgramAccountChange(exchange_1.exchange.programId, async (keyedAccountInfo, context) => {
        let acc = exchange_1.exchange.program.account.marginAccount.coder.accounts.decode(accountType, keyedAccountInfo.accountInfo.data);
        callback({ key: keyedAccountInfo.accountId, account: acc, context });
    }, "confirmed", [
        {
            memcmp: {
                offset: 0,
                bytes: bs58.encode(discriminator),
            },
        },
    ]);
    exchange_1.exchange.addProgramSubscriptionId(subscriptionId);
}
exports.subscribeProgramAccounts = subscribeProgramAccounts;
