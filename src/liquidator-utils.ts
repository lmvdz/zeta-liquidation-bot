import * as anchor from "@project-serum/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { constants, Client, Exchange, programTypes, utils, instructions, Market } from "@zetamarkets/sdk";
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

      // console.log('available balance', marginAccountState.availableBalance, account.publicKey)

      let adjustedAvailableBalance = marginAccountState.availableBalance + marginAccountState.initialMargin;
      if (adjustedAvailableBalance >= 0) {
        return;
      }
      // console.log('adjustedbalance', adjustedAvailableBalance, account.publicKey)
      accountsForLiquidation.push(account);
    })
  );
  return accountsForLiquidation;
}

export async function cancelActiveOrders(client: Client, accountAtRisk: anchor.ProgramAccount) : Promise<Array<string>> {
    let marginAccount = accountAtRisk.account as programTypes.MarginAccount;

    return await Promise.all(marginAccount.positions.map((position, index) => { return { ...position, marketIndex: index} }).filter(position => {
        return position.openingOrders[0].toNumber() != 0 ||
        position.openingOrders[1].toNumber() != 0 ||
        position.closingOrders.toNumber() != 0;
    }).map(async (position, index) => {
        if (position !== undefined) {
          // console.log(position, accountAtRisk.publicKey.toBase58());
          let output : string;
          try {
              output = await client.forceCancelOrders(
                  Exchange.markets.markets[position.marketIndex].address,
                  accountAtRisk.publicKey
              );
          } catch (error) {
              output = error.toString();
          }
          return output;
        } else {
          return 'no open position';
        }
        
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


function getMarketsToCrank(liveOnly: boolean): Market[] {
  let marketsToCrank = [];
  if (liveOnly) {
    let liveExpiryIndices = Exchange.markets.getTradeableExpiryIndices();
    liveExpiryIndices.map(async (index) => {
      marketsToCrank.push(Exchange.markets.getMarketsByExpiryIndex(index));
    });
    marketsToCrank = marketsToCrank.flat(1);
  } else {
    marketsToCrank = Exchange.markets.markets;
  }
  return marketsToCrank;
}


let crankingMarkets = new Array(constants.ACTIVE_MARKETS).fill(false);


async function crankExchange(liveOnly: boolean) {
  let marketsToCrank: Market[] = getMarketsToCrank(liveOnly);
  marketsToCrank.map(async (market) => {
    let eventQueue = await market.serumMarket.loadEventQueue(
      Exchange.provider.connection
    );

    if (eventQueue.length > 0 && !crankingMarkets[market.marketIndex]) {
      crankingMarkets[market.marketIndex] = true;
      try {
        while (eventQueue.length != 0) {
          try {
            await utils.crankMarket(market.marketIndex);
          } catch (e) {
            console.error(
              `Cranking failed on market ${market.marketIndex}, ${e}`
            );
          }

          let currLength = eventQueue.length;

          eventQueue = await market.serumMarket.loadEventQueue(
            Exchange.provider.connection
          );

          let numCranked = currLength - eventQueue.length;
          console.log(
            `Cranked ${numCranked} events for market ${market.marketIndex}`
          );
        }
      } catch (e) {
        console.error(`${e}`);
      }
      crankingMarkets[market.marketIndex] = false;
    }
  });
}

export async function liquidateAccount(client: Client, programAccount: anchor.ProgramAccount) : Promise<Array<string>> {
    const liquidateeMarginAccount = (programAccount.account as programTypes.MarginAccount);
    const liquidateeKey = programAccount.publicKey;

    await cancelActiveOrders(client, programAccount)
    // update the state of the client with newest available margin
    await client.updateState()

    let clientState = Exchange.riskCalculator.getMarginAccountState(
        client.marginAccount
    );

    return await Promise.all(liquidateeMarginAccount.positions.map((position, index) => {
        // add marketIndex to position before we filter, messing up the indexes
        return { ...position, marketIndex: index }
    }).filter((position) => {
        const orderbookExists = Exchange.markets.markets[position.marketIndex].orderbook[position.position.toNumber() < 0 ? 'asks' : 'bids'][0] !== undefined;
        
        // console.log(orderbookExists, Exchange.markets.markets[position.marketIndex].strike, position.position.toNumber());
        // filter out the non liquidatable positions
        return position.position.toNumber() != 0 && Exchange.markets.markets[position.marketIndex].expirySeries.isLive() && orderbookExists
    }).map((position) => {
        // the market's orderbook associated with the liquidatee's position
        const orderbook = Exchange.markets.markets[position.marketIndex].orderbook;
        // the side of the liquidatee's position
        const side = position.position.toNumber() > 0 ? "Bid" : "Ask";
        // the close position order side
        const closePositionSide = (side === 'Bid' ? Side.ASK : Side.BID);
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
        
        const maintFee = (Exchange.riskCalculator.calculateTotalMaintenanceMargin(liquidateeMarginAccount) * 0.3) * (Math.abs(position.position.toNumber()) / liquidationSize)
        const markPrice = Exchange.getMarkPrice(position.marketIndex);
        const loss = (closePositionSide === Side.BID ? markPrice - firstOrderInBook.price : firstOrderInBook.price - markPrice);
        const possibleProfit = (liquidationSize * loss) + maintFee
        // console.log(side, position.position.toNumber(), liquidationSize, markPrice, firstOrderInBook.price, loss, maintFee, possibleProfit);

        return {
            ...position, 
            marginConstrainedSize, 
            orderbook,
            side,
            closePositionSide,
            firstOrderInBook,
            liquidationSize,
            possibleProfit
        }
    }).sort((a, b) => {
        // sort by possible profit for max $$
        return b.possibleProfit - a.possibleProfit
    }).map(async (position) => {
        if (position.possibleProfit <= 0) {
          return 'possible profit negative';
        }
        console.log('liquidating ' + liquidateeKey.toBase58(), 'for ' + position.possibleProfit)
        // create the transaction
        let transaction = new Transaction();
        // liquidate transaction
        let liquidateIx = instructions.liquidateIx(client.publicKey, client.marginAccountAddress, Exchange.markets.markets[position.marketIndex].address, liquidateeKey, position.liquidationSize)
        transaction.add(liquidateIx);
        // close the transfered position in the same transaction
        // does liquidationSize and price need to be converted to correct decimals?
        if (client.openOrdersAccounts[position.marketIndex].equals(PublicKey.default)) {
            let [initIx, _openOrdersPda] = await instructions.initializeOpenOrdersIx(Exchange.markets.markets[position.marketIndex].address, client.publicKey, client.marginAccountAddress);
            transaction.add(initIx);
            client.openOrdersAccounts[position.marketIndex] = _openOrdersPda;
        }
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
        const liquidate = await liquidateAccount(client, programAccount);
        console.log(liquidate);
        // await crankExchange(true);
        return liquidate;
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