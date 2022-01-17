import * as anchor from "@project-serum/anchor";
import { MarginAccount } from "./program-types";
import { PublicKey, Connection, ConfirmOptions, TransactionSignature } from "@solana/web3.js";
import { Wallet, CancelArgs } from "./types";
import { Position, Order, Side } from "./types";
import { EventType } from "./events";
export declare class Client {
    /**
     * Returns the user wallet public key.
     */
    get publicKey(): PublicKey;
    /**
     * Anchor provider for client, including wallet.
     */
    get provider(): anchor.Provider
    private _provider;
    /**
     * Anchor program wrapper for the IDL.
     */
    private _program;
    /**
     * Stores the user margin account state.
     */
    get marginAccount(): MarginAccount | null;
    private _marginAccount;
    /**
     * Client margin account address.
     */
    get marginAccountAddress(): PublicKey;
    private _marginAccountAddress;
    /**
     * Client usdc account address.
     */
    get usdcAccountAddress(): PublicKey;
    private _usdcAccountAddress;
    /**
     * User open order addresses.
     * If a user hasn't initialized it, it is set to PublicKey.default
     */
    get openOrdersAccounts(): PublicKey[];
    private _openOrdersAccounts;
    /**
     * Returns a list of the user's current orders.
     */
    get orders(): Order[];
    private _orders;
    /**
     * Returns a list of user current positions.
     */
    get positions(): Position[];
    private _positions;
    /**
     * The event emitter for the margin account subscription.
     */
    private _eventEmitter;
    /**
     * The listener for trade events.
     */
    private _tradeEventListener;
    /**
     * Timer id from SetInterval.
     */
    private _pollIntervalId;
    /**
     * Last update timestamp.
     */
    private _lastUpdateTimestamp;
    /**
     * Pending update.
     */
    private _pendingUpdate;
    /**
     * The context slot of the pending update.
     */
    private _pendingUpdateSlot;
    /**
     * whitelist deposit account.
     */
    private _whitelistDepositAddress;
    /**
     * whitelist trading fees account.
     */
    get whiteListTradingFeesAddress();
    private _whitelistTradingFeesAddress;
    /**
     * Polling interval.
     */
    get pollInterval(): number;
    set pollInterval(interval: number);
    private _pollInterval;
    /**
     * User passed callback on load, stored for polling.
     */
    private _callback;
    private _updatingState;
    private constructor();
    /**
     * Returns a new instance of Client, based off state in the Exchange singleton.
     * Requires the Exchange to be in a valid state to succeed.
     *
     * @param throttle    Defaults to true.
     *                    If set to false, margin account callbacks will also call
     *                    `updateState` instead of waiting for the poll.
     */
    static load(connection: Connection, wallet: Wallet, opts?: ConfirmOptions, callback?: (type: EventType, data: any) => void, throttle?: boolean): Promise<Client>;
    /**
     * @param desired interval for client polling.
     */
    private setPolling;
    /**
     * Polls the margin account for the latest state.
     */
    updateState(fetch?: boolean): Promise<void>;
    /**
     * @param amount  the native amount to deposit (6 decimals fixed point)
     */
    deposit(amount: number): Promise<TransactionSignature>;
    /**
     * @param amount  the native amount to withdraw (6 dp)
     */
    withdraw(amount: number): Promise<TransactionSignature>;
    /**
     * Places an order on a zeta market.
     * @param market          the address of the serum market
     * @param price           the native price of the order (6 d.p as integer)
     * @param size            the quantity of the order (3 d.p)
     * @param side            the side of the order. bid / ask
     * @param clientOrderId   optional: client order id (non 0 value)
     * NOTE: If duplicate client order ids are used, after a cancel order,
     * to cancel the second order with the same client order id,
     * you may need to crank the corresponding event queue to flush that order id
     * from the user open orders account before cancelling the second order.
     * (Depending on the order in which the order was cancelled).
     */
    placeOrder(market: PublicKey, price: number, size: number, side: Side, clientOrderId?: number): Promise<TransactionSignature>;
    /**
     * Cancels a user order by orderId
     * @param market     the market address of the order to be cancelled.
     * @param orderId    the order id of the order.
     * @param side       the side of the order. bid / ask.
     */
    cancelOrder(market: PublicKey, orderId: anchor.BN, side: Side): Promise<TransactionSignature>;
    /**
     * Cancels a user order by client order id.
     * It will only cancel the FIRST
     * @param market          the market address of the order to be cancelled.
     * @param clientOrderId   the client order id of the order. (Non zero value).
     */
    cancelOrderByClientOrderId(market: PublicKey, clientOrderId: number): Promise<TransactionSignature>;
    /**
     * Cancels a user order by orderId and atomically places an order
     * @param market     the market address of the order to be cancelled.
     * @param orderId    the order id of the order.
     * @param cancelSide       the side of the order. bid / ask.
     * @param newOrderprice  the native price of the order (6 d.p) as integer
     * @param newOrderSize   the quantity of the order (3 d.p) as integer
     * @param newOrderside   the side of the order. bid / ask
     */
    cancelAndPlaceOrder(market: PublicKey, orderId: anchor.BN, cancelSide: Side, newOrderPrice: number, newOrderSize: number, newOrderSide: Side, clientOrderId?: number): Promise<TransactionSignature>;
    /**
     * Cancels a user order by client order id and atomically places an order by new client order id.
     * @param market                  the market address of the order to be cancelled and new order.
     * @param cancelClientOrderId     the client order id of the order to be cancelled.
     * @param newOrderprice           the native price of the order (6 d.p) as integer
     * @param newOrderSize            the quantity of the order (3 d.p) as integer
     * @param newOrderSide            the side of the order. bid / ask
     * @param newOrderClientOrderId   the client order id for the new order
     */
    cancelAndPlaceOrderByClientOrderId(market: PublicKey, cancelClientOrderId: number, newOrderPrice: number, newOrderSize: number, newOrderSide: Side, newOrderClientOrderId: number): Promise<TransactionSignature>;
    /**
     * Initializes a user open orders account for a given market.
     * This is handled atomically by place order but can be used by clients to initialize it independent of placing an order.
     */
    initializeOpenOrdersAccount(market: PublicKey): Promise<TransactionSignature>;
    /**
     * Cancels a user order by orderId and atomically places an order
     * @param cancelArguments list of cancelArgs objects which contains the arguments of cancel instructions
     */
    cancelMultipleOrders(cancelArguments: CancelArgs[]): Promise<TransactionSignature[]>;
    /**
     * Calls force cancel on another user's orders
     * @param market  Market to cancel orders on
     * @param marginAccountToCancel Users to be force-cancelled's margin account
     */
    forceCancelOrders(market: PublicKey, marginAccountToCancel: PublicKey): Promise<TransactionSignature>;
    /**
     * Calls liquidate on another user
     * @param market
     * @param liquidatedMarginAccount
     * @param size                        the quantity of the order (3 d.p)
     */
    liquidate(market: PublicKey, liquidatedMarginAccount: PublicKey, size: number): Promise<TransactionSignature>;
    /**
     * Cancels all active user orders
     */
    cancelAllOrders(): Promise<TransactionSignature[]>;
    private getRelevantMarketIndexes;
    private updateOrders;
    private updatePositions;
    private usdcAccountCheck;
    private updateOpenOrdersAddresses;
    /**
     * Closes the client websocket subscription to margin account.
     */
    close(): Promise<void>;
}
