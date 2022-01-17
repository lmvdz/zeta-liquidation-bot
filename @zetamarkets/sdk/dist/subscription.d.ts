import { ProgramAccountType } from "./types";
import { PublicKey, Context } from "@solana/web3.js";
export interface AccountSubscriptionData<T> {
    key: PublicKey;
    account: T;
    context: Context;
}
export declare function subscribeProgramAccounts<T>(accountType: ProgramAccountType, callback?: (data: AccountSubscriptionData<T>) => void): void;
