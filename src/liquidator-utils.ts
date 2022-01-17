import * as anchor from "@project-serum/anchor";
import { Transaction } from "@solana/web3.js";
import { constants, Client, Exchange, programTypes } from "@zetamarkets/sdk";
import * as instructions from "@zetamarkets/sdk/dist/program-instructions";
import { Side } from "@zetamarkets/sdk/dist/types";

export async function findAccountsAtRisk(
  accounts: anchor.ProgramAccount[]
): Promise<anchor.ProgramAccount[]> {
  let accountsAtRisk: anchor.ProgramAccount[] = [];
  await Promise.all(
    accounts.map((account: anchor.ProgramAccount) => {
      if (account.account == null) {
        return;
      }
      let marginAccountState = Exchange.riskCalculator.getMarginAccountState(
        account.account as programTypes.MarginAccount
      );
      if (marginAccountState.availableBalance >= 0) {
        return;
      }
      console.log(
        `[ACCOUNT_AT_RISK] [ACCOUNT]: ${account.publicKey.toString()} [BALANCE]: ${
          marginAccountState.balance
        } [INITIAL] ${marginAccountState.initialMargin} [MAINTENANCE]: ${
          marginAccountState.maintenanceMargin
        } [TOTAL] ${marginAccountState.totalMargin} [UNREALIZED PNL] ${
          marginAccountState.unrealizedPnl
        } [AVAILABLE BALANCE] ${marginAccountState.availableBalance}`
      );
      accountsAtRisk.push(account);
    })
  );
  return accountsAtRisk;
}

export async function findLiquidatableAccounts(
  accounts: anchor.ProgramAccount[]
): Promise<anchor.ProgramAccount[]> {
  let liquidatableAccounts: anchor.ProgramAccount[] = [];
  await Promise.all(
    accounts.map((account: anchor.ProgramAccount) => {
      if (account.account == null) {
        return;
      }

      let marginAccountState = Exchange.riskCalculator.getMarginAccountState(
        account.account as programTypes.MarginAccount
      );

      // We assume the accounts passed in have had their open orders cancelled.
      // Therefore we can add back the initial margin calculated from their
      // current margin account state.
      let adjustedAvailableBalance =
        marginAccountState.availableBalance + marginAccountState.initialMargin;
      if (adjustedAvailableBalance >= 0) {
        return;
      }
      console.log(
        `[LIQUIDATABLE ACCOUNT] [ACCOUNT] ${account.publicKey.toString()} [BALANCE] ${
          marginAccountState.balance
        } [ADJUSTED AVAILABLE BALANCE] ${adjustedAvailableBalance}`
      );
      liquidatableAccounts.push(account);
    })
  );
  return liquidatableAccounts;
}

export function cancalActiveOrders(client: Client, accountAtRisk: anchor.ProgramAccount) {
    let marginAccount = accountAtRisk.account as programTypes.MarginAccount;

    const [...canceledOrders] = marginAccount.positions.filter(position => {
        return position.openingOrders[0].toNumber() != 0 ||
        position.openingOrders[1].toNumber() != 0 ||
        position.closingOrders.toNumber() != 0;
    }).map(async (_, index) => {
        try {
            return await client.forceCancelOrders(
                Exchange.markets.markets[index].address,
                accountAtRisk.publicKey
            );
        } catch (error) {
            return error;
        }
    });
    return canceledOrders;

    //   for (var i = 0; i < marginAccount.positions.length; i++) {
    //     // If they have any active orders, we can cancel.
    //     let position = marginAccount.positions[i];
    //     if (
          
    //     ) {
    //       console.log(
    //         "[FORCE_CANCEL] " +
    //         accountAtRisk.publicKey.toString() +
    //           " [KIND] " +
    //           Exchange.markets.markets[i].kind +
    //           " [STRIKE] " +
    //           Exchange.markets.markets[i].strike +
    //           " [EXPIRY] " +
    //           new Date(Exchange.markets.markets[i].expirySeries.expiryTs * 1000)
    //       );
    //       try {
    //         await 
    //       } catch (e) {
    //         console.log(e);
    //       }
    //     }
    //   }
}

export async function cancelAllActiveOrders(
  client: Client,
  accountsAtRisk: anchor.ProgramAccount[]
) {
    const [...canceledAccounts] = accountsAtRisk.map(async (accountAtRisk) => {
      return cancalActiveOrders(client, accountAtRisk);
    })
    return canceledAccounts;
}

export function liquidateAccount(client: Client, programAccount: anchor.ProgramAccount) {
    const liquidateeMarginAccount = (programAccount.account as programTypes.MarginAccount);
    const liquidateeKey = programAccount.publicKey;

    // update the state of the client with newest available margin
    client.updateState().then(() => {

        let clientState = Exchange.riskCalculator.getMarginAccountState(
            client.marginAccount
        );

        liquidateeMarginAccount.positions.map((position, index) => {
            return { ...position, marketIndex: index}
        }).filter((position) => {
            return position.position.toNumber() != 0 && Exchange.markets.markets[position.marketIndex].expirySeries.isLive()
        }).map((position) => {
            // the market's orderbook associated with the liquidatee's position
            const orderbook = Exchange.markets.markets[position.marketIndex].orderbook;
            // the side of the liquidatee's position
            const side = position.position.toNumber() > 0 ? "Bid" : "Ask";
            // the close position order side
            const closePositionSide = side === 'Bid' ? Side.ASK : Side.BID;
            // the first order in the orderbook which we will use to close the position instantly
            const firstOrderInBook = orderbook[side === 'Ask' ? 'asks' : 'bids'][0];
            // the amount of margin the liquidator has available
            const marginConstrainedSize = calculateMaxLiquidationNativeSize(
                clientState.availableBalance,
                position.marketIndex,
                position.position.toNumber() > 0
            );
            // take the smallest of the three
            // first order in book
            // margin constrained size (of liquidator's account)
            // size of the position which needs to be liquidated
            const liquidationSize = Math.min(firstOrderInBook.size, Math.min(marginConstrainedSize, Math.abs(position.position.toNumber())));
            return {
                ...position, 
                marginConstrainedSize, 
                orderbook,
                side,
                closePositionSide,
                firstOrderInBook,
                liquidationSize
            }
        }).sort((a, b) => {
            // sort by liquidation size for max $$
            return a.liquidationSize - b.liquidationSize
        }).forEach((position, index) => {
            // create the transaction
            let transaction = new Transaction();
            // liquidate transaction
            let liquidateIx = instructions.liquidateIx(client.publicKey, client.marginAccountAddress, Exchange.markets.markets[position.marketIndex].address, liquidateeKey, position.liquidationSize)
            transaction.add(liquidateIx);
            // close the transfered position in the same transaction
            let closePositionIx = instructions.placeOrderIx(position.marketIndex, position.firstOrderInBook.price, position.liquidationSize, position.closePositionSide, 0, client.marginAccountAddress, client.publicKey, client.openOrdersAccounts[position.marketIndex], client.whiteListTradingFeesAddress)
            transaction.add(closePositionIx);
        })
    })
}

// Naively liquidates all accounts up to initial margin requirement limits.
export async function liquidateAccounts(
  client: Client,
  accounts: anchor.ProgramAccount[]
) {
  for (var i = 0; i < accounts.length; i++) {
    const liquidateeMarginAccount = accounts[i]
      .account as programTypes.MarginAccount;
    const liquidateeKey = accounts[i].publicKey;

    for (
      var marketIndex = 0;
      marketIndex < liquidateeMarginAccount.positions.length;
      marketIndex++
    ) {
      const position =
        liquidateeMarginAccount.positions[marketIndex].position.toNumber();

      // Cannot liquidate a position on an expired market.
      if (
        position == 0 ||
        !Exchange.markets.markets[marketIndex].expirySeries.isLive()
      ) {
        continue;
      }

      // Get latest state for your margin account.
      await client.updateState();
      let clientState = Exchange.riskCalculator.getMarginAccountState(
        client.marginAccount
      );

      let marginConstrainedSize = calculateMaxLiquidationNativeSize(
        clientState.availableBalance,
        marketIndex,
        position > 0
      );

      const size = Math.min(marginConstrainedSize, Math.abs(position));
      const side = position > 0 ? "Bid" : "Ask";

      console.log(
        "[LIQUIDATE] " +
          liquidateeKey.toString() +
          " [KIND] " +
          Exchange.markets.markets[marketIndex].kind +
          " [STRIKE] " +
          Exchange.markets.markets[marketIndex].strike +
          " [EXPIRY] " +
          new Date(
            Exchange.markets.markets[marketIndex].expirySeries.expiryTs * 1000
          ) +
          " [SIDE] " +
          side +
          " [AMOUNT] " +
          size +
          " [MAX CAPACITY WITH MARGIN] " +
          marginConstrainedSize +
          " [AVAILABLE SIZE] " +
          Math.abs(position)
      );
      try {
        let txId = await client.liquidate(
          Exchange.markets.markets[marketIndex].address,
          liquidateeKey,
          size
        );
        console.log(`TX ID: ${txId}`);
      } catch (e) {
        console.log(e);
      }
    }
  }
}

/**
 * @param availableBalance  Available balance for the liquidator.
 * @param marketIndex       The market index of the position to be liquidated.
 * @param long              Whether the liquidatee is long or short.
 * @returns native lot size given liquidator available balance.
 */
export function calculateMaxLiquidationNativeSize(
  availableMargin: number,
  marketIndex: number,
  long: boolean
): number {
  // Initial margin requirement per contract in decimals.
  // We use this so you are not at margin requirement limits after liquidation.
  let initialMarginRequirement = long
    ? Exchange.riskCalculator.marginRequirement[marketIndex].initialLong
    : Exchange.riskCalculator.marginRequirement[marketIndex].initialShort;

  return parseInt(
    (
      (availableMargin / initialMarginRequirement) *
      Math.pow(10, constants.POSITION_PRECISION)
    ).toFixed(0)
  );
}