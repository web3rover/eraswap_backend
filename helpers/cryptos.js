var ccxt = require('ccxt');
var _ = require('lodash');

const config = require('../configs/config');

let Cryptopia = new ccxt.cryptopia({ verbose: false, ...config.keys.CRYPTOPIA });
let Kukoin = new ccxt.kucoin2({ verbose: false, ...config.keys.KUKOIN });
let Bittrex = new ccxt.bittrex({ verbose: false, ...config.keys.BITTREX });
let Polonix = new ccxt.poloniex({ verbose: false, ...config.keys.POLONIEX });
let Binance = new ccxt.binance({ verbose: false, ...config.keys.BINANCE });

const Exchanges = [Bittrex, Binance, Cryptopia, Polonix, Kukoin];

const getAllCurrency = async () => {
  let allCurs = [];
  for (ele of Exchanges) {
    try {
      await ele.loadMarkets();
      allCurs.push(Object.keys(ele.currencies));
    } catch (error) {
      console.log(error);
    }
  }
  const allArr = [].concat.apply([], allCurs);
  let finalArr = [];
  _.uniq(allArr).map(elem => {
    return finalArr.push({ name: elem, value: elem });
  });
  return finalArr;
};
const getDepositAddress = async (platform, symbol) => {
  for (let x in Exchanges) {
    let name = Exchanges[x];

    if (name.name.toLowerCase() == platform.toLowerCase()) {
      // await name.loadMarkets();
      let data;
      try {
        data = await name.fetchDepositAddress(symbol);
      } catch (error) {
        console.log(error);
        data = await name.createDepositAddress(symbol);
      }
      console.log(data);
      return data;
    }
  }
};
const getCurrentMarket = async (platform, symbol) => {
  let sym;
  for (let x in Exchanges) {
    let name = Exchanges[x];
    if (name.name.toLowerCase() == platform.toLowerCase()) {
      // await name.loadMarkets();
      let data;
      try {
        sym = symbol;
        data = await name.fetchTicker(symbol);
      } catch (error) {
        var from = symbol.split('/')[0];
        var to = symbol.split('/')[1];
        sym = to + '/' + from;
        data = await name.fetchTicker(sym);
      }
      return { data: data, symbol: sym };
    }
  }
};

const getExchangeVal = async (from, to) => {
  let allVals = [];
  let symbol;
  for (let x in Exchanges) {
    let name = Exchanges[x];
    // await name.loadMarkets();
    let data;
    try {
      symbol = from + '/' + to;
      data = await name.fetchTicker(symbol);
    } catch (err) {
      console.log(err);
      try {
        symbol = to + '/' + from;
        data = await name.fetchTicker(symbol);
      } catch (error) {
        console.log(error);
      }
    }
    const marketObj = {
      name: name.name,
      sym: symbol,
      ask: data && data.ask ? data.ask : 0,
      bid: data && data.bid ? data.bid : 0,
    };
    allVals.push(marketObj);
  }
  return { [symbol]: allVals };
};
const verifyTxn = async (dipositTxnId, tiMeFrom, platForm, symbol, amount) => {
  for (let x in Exchanges) {
    let name = Exchanges[x];

    if (name.name.toLowerCase() == platForm.toLowerCase()) {
      // await name.loadMarkets();
      let txnData;
      try {
        txnData = await name.fetchDeposits(symbol, tiMeFrom, 50, {}); //change since=timeFrom
        console.log(JSON.stringify(txnData));
        // txnData=[
        //     {
        //         'id':        '12345-67890:09876/54321', // string transaction id
        //         'txid':      'ddsjfdlskjflksdjfkldsjf', // txid in terms of corresponding currency
        //         'timestamp':  1502962946216,            // Unix timestamp in milliseconds
        //         'datetime':  '2017-08-17 12:42:48.000', // ISO8601 datetime with milliseconds
        //         'currency':  'ETH',                     // currency code
        //         'status':    'ok',                 // status of the transaction, "pending", "ok"... to be discussed
        //         'side':      'deposit',                 // direction of the transaction, 'deposit' or 'withdraw'
        //         'price':      0.06917684,               // float price in quote currency
        //         'amount':     1.5,                      // absolute amount of base currency
        //         'fee': {
        //             'cost': 1, // we also need to somehow designate if...
        //             'rate': 1, // ...it is a network fee or the exchange fee or both
        //         }
        //     }
        // ]
        const a = txnData.filter(i => {
          if ((dipositTxnId ? i.txid == dipositTxnId : true) && i.currency == symbol && i.amount == amount) {
            return i;
          }
        });
        return a;
      } catch (error) {
        return Promise.reject({
          status: 400,
          message: error.message || 'No Txn Found',
          error: error,
        });
      }
    }
  }
};
const convertCurrency = async (symbol, platForm, fromSymbol, toSymbol, amount) => {
  for (let x in Exchanges) {
    let name = Exchanges[x];
    if (name.name.toLowerCase() == platForm.toLowerCase()) {
      try {
        // const symbol =fromSymbol+'/'+toSymbol;

        let data;

        const curMar = await getCurrentMarket(platForm, symbol);

        let toSymbolAmount;
        let side;
        if (name.name.toLowerCase() == 'cryptopia') {
          amount = amount - (amount * 0.2) / 100;
        }
        if (curMar.symbol === fromSymbol + '/' + toSymbol) {
          side = 'sell';
          toSymbolAmount = Number(amount);
          data = await name.createOrder(curMar.symbol, 'limit', side, toSymbolAmount, curMar.data.ask);

          console.log('sell order placed', symbol, fromSymbol, toSymbol);
        } else if (curMar.symbol === toSymbol + '/' + fromSymbol) {
          side = 'buy';
          toSymbolAmount = (Number(amount) / Number(curMar.data.bid)).toFixed(8);
          data = await name.createOrder(curMar.symbol, 'limit', side, Number(toSymbolAmount), curMar.data.bid);
          console.log('buy order placed', symbol, fromSymbol, toSymbol);
        }
        return { orderplacingAmt: toSymbolAmount, side: side, ...data };
      } catch (error) {
        console.log(name.iso8601(Date.now()), error.constructor.name, error.message);
        console.log(error.constructor.name);
        return Promise.reject({
          status: 400,
          message: error.constructor.name || 'Some Error Occured!',
          error: error.message,
        });
      }
    }
  }
};
const sendCurrency = async (platForm, address, amount, symbol, tag) => {
  for (let x in Exchanges) {
    let name = Exchanges[x];

    if (name.name.toLowerCase() == platForm.toLowerCase()) {
      // await name.loadMarkets();
      try {
        if (name.name.toLowerCase() == 'kucoin') {
          const AllFees = name.fees;
          const fees = AllFees.funding.withdraw[symbol];
          const amountWIthoutFee = Number(amount) - Number(fees);
          const data = await name.withdraw(symbol, amountWIthoutFee, address, (tag = tag ? tag : undefined), (params = {}));
          return data;
        }

        const data = await name.withdraw(symbol, amount, address, (tag = undefined), (params = {}));
        return data;
      } catch (error) {
        console.log(error.constructor.name);
        return Promise.reject({
          status: 400,
          message: error.constructor.name || 'Some Error Occured!',
          error: error,
        });
      }
    }
  }
};

const verifyOrder = async (timeFrom, platForm, symbol, orderId, fromAmount, side) => {
  for (let x in Exchanges) {
    let name = Exchanges[x];

    if (name.name.toLowerCase() == platForm.toLowerCase()) {
      try {
        let params = {};
        if (name.name.toLowerCase() == 'kucoin') {
          params = { type: side.toUpperCase() };
        }
        const data = await name.fetchOrder(orderId, symbol, params);

        console.log(JSON.stringify(data));
        if (
          data.status == 'closed' &&
          data.trades &&
          data.trades.length &&
          (data.fee || data.fee.cost == 0) &&
          (name.name.toLowerCase() == 'kucoin' || name.name.toLowerCase() == 'poloniex')
        ) {
          let fee = 0;
          data.trades.map(i => {
            fee = i.fee.cost + fee;
          });
          data.fee.cost = fee;
        }
        if (data.status == 'closed' && (name.name.toLowerCase() == 'cryptopia' || name.name.toLowerCase() == 'poloniex')) {
          const MyTrades = await name.fetchMyTrades(symbol, timeFrom);
          console.log(MyTrades);
          const a = MyTrades.filter(i => {
            const decimalPlace = i.amount.toString().split('.')[1].length + 1;
            const fromAmtDecmialLength = decimalPlace - fromAmount.split('.')[1].length;
            const ab = fromAmount.split('.')[1].split('');
            ab.splice(decimalPlace, fromAmtDecmialLength);
            const cd = fromAmount.split('.')[0] + '.' + ab.join('');
            if (i.amount == cd) {
              return i;
            }
          });
          if (a.length == 1) {
            data.fee.cost = data.fee.cost && data.fee.cost > 0 ? data.fee.cost : a[0].fee.cost;
          }
        }
        return data;
      } catch (error) {
        if (error.constructor.name === 'OrderNotCached') {
          try {
            const data = await name.fetchMyTrades(symbol, timeFrom);
            console.log(data);

            const a = data.filter(i => {
              const decimalPlace = i.amount.toString().split('.')[1].length;
              const fromAmtDecmialLength = fromAmount.split('.')[1].length - decimalPlace;
              const ab = fromAmount.split('.')[1].split('');
              ab.splice(decimalPlace, fromAmtDecmialLength);
              const cd = fromAmount.split('.')[0] + '.' + ab.join('');
              if (i.amount == cd) {
                return i;
              }
            });
            if (a.length != 1) {
              return Promise.reject({
                status: 400,
                message: 'Found more than one order of same amount and same symbol',
                error: error,
              });
            }
            return { status: 'closed', ...a[0] };
          } catch (errors) {
            return Promise.reject({
              status: 400,
              message: error.constructor.name || 'Some Error Occured!',
              error: error,
            });
          }
        }
        return Promise.reject({
          status: 400,
          message: error.constructor.name || 'Some Error Occured!',
          error: error,
        });
      }
    }
  }
};
const cancelOrder = async (platForm, symbol, orderId) => {
  for (let x in Exchanges) {
    let name = Exchanges[x];

    if (name.name.toLowerCase() == platForm.toLowerCase()) {
      try {
        const data = await name.cancelOrder(orderId, symbol);
        return data;
      } catch (error) {
        return Promise.reject({
          status: 400,
          message: error.constructor.name || 'Some Error Occured cancelling order!',
          error: error,
        });
      }
    }
  }
};

module.exports = {
  getAllCurrency,
  getExchangeVal,
  getDepositAddress,
  verifyTxn,
  sendCurrency,
  convertCurrency,
  verifyOrder,
  getCurrentMarket,
  cancelOrder,
};
