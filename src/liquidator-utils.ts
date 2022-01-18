import * as anchor from "@project-serum/anchor";
import { Transaction } from "@solana/web3.js";
import { constants, Client, Exchange, programTypes, utils, instructions } from "@zetamarkets/sdk";
import { Side } from "@zetamarkets/sdk/dist/types.js";


export async function findAccountsForLiquidation(accounts: anchor.ProgramAccount[]) {
  let accountsForLiquidation: anchor.ProgramAccount[] = [];
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

      let adjustedAvailableBalance = marginAccountState.availableBalance + marginAccountState.initialMargin;
      if (adjustedAvailableBalance >= 0) {
        return;
      }
      
      accountsForLiquidation.push(account);
    })
  );
  return accountsForLiquidation;
}

export async function cancelActiveOrders(client: Client, accountAtRisk: anchor.ProgramAccount) : Promise<Array<string>> {
    let marginAccount = accountAtRisk.account as programTypes.MarginAccount;

    return await Promise.all(marginAccount.positions.filter(position => {
        return position.openingOrders[0].toNumber() != 0 ||
        position.openingOrders[1].toNumber() != 0 ||
        position.closingOrders.toNumber() != 0;
    }).map(async (_, index) => {
        let output : string;
        try {
            output = await client.forceCancelOrders(
                Exchange.markets.markets[index].address,
                accountAtRisk.publicKey
            );
        } catch (error) {
            output = error.toString();
        }
        return output;
    }));
}

export async function cancelAllActiveOrders(
  client: Client,
  accountsAtRisk: anchor.ProgramAccount[]
) : Promise<Array<Array<string>>> {
    return await Promise.all(accountsAtRisk.map(async (accountAtRisk) => {
      return await cancelActiveOrders(client, accountAtRisk);
    }))
}

export async function liquidateAccount(client: Client, programAccount: anchor.ProgramAccount) : Promise<Array<string>> {
    const liquidateeMarginAccount = (programAccount.account as programTypes.MarginAccount);
    const liquidateeKey = programAccount.publicKey;

    // update the state of the client with newest available margin
    await client.updateState()

    let clientState = Exchange.riskCalculator.getMarginAccountState(
        client.marginAccount
    );

    return await Promise.all(liquidateeMarginAccount.positions.map((position, index) => {
        // add marketIndex to position before we filter, messing up the indexes
        return { ...position, marketIndex: index}
    }).filter((position) => {
        // filter out the non liquidatable positions
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
        const liquidationSize = Math.min(utils.convertDecimalToNativeLotSize(firstOrderInBook.size), Math.min(marginConstrainedSize, Math.abs(position.position.toNumber())));
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
    }).map(async (position) => {
        // create the transaction
        let transaction = new Transaction();
        // liquidate transaction
        let liquidateIx = instructions.liquidateIx(client.publicKey, client.marginAccountAddress, Exchange.markets.markets[position.marketIndex].address, liquidateeKey, position.liquidationSize)
        transaction.add(liquidateIx);
        // close the transfered position in the same transaction
        // does liquidationSize and price need to be converted to correct decimals?
        let closePositionIx = instructions.placeOrderIx(position.marketIndex, utils.convertDecimalToNativeInteger(position.firstOrderInBook.price), position.liquidationSize, position.closePositionSide, 0, client.marginAccountAddress, client.publicKey, client.openOrdersAccounts[position.marketIndex], client.whiteListTradingFeesAddress)
        transaction.add(closePositionIx);
        // send the liquidation + close position transaction
        let output : string;
        try {
            output = await utils.processTransaction(client.provider, transaction);
        } catch ( error ) {
            output = error.toString()
        }
        return output;
    }));
}


export async function liquidateAccounts(client: Client, programAccounts: anchor.ProgramAccount[]) : Promise<Array<Array<string>>> {
    return await Promise.all(programAccounts.map( async programAccount => {
        return await liquidateAccount(client, programAccount);
    }))
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