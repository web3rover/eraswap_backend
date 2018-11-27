var ccxt = require('ccxt');
var fs = require('fs');
var _ = require('lodash');
var CryptoJS = require('crypto-js');
var rp = require('request-promise');

const config = require('../configs/config');

let Cryptopia = new ccxt.cryptopia({verbose:false,...config.keys.CRYPTOPIA});
// let Kukoin = new ccxt.kucoin(config.keys.KUKOIN);
let Bittrex = new ccxt.bittrex({ verbose: false, ...config.keys.BITTREX });
let Polonix = new ccxt.poloniex({ verbose: false, ...config.keys.POLONIEX });
let Binance = new ccxt.binance({ verbose: false, ...config.keys.BINANCE });
let Okex = new ccxt.okex({ verbose: false, ...config.keys.OKEX_V1 });

const Exchanges = [Bittrex, Binance, Cryptopia, Polonix, Okex];
// const Exchanges = [Binance];

const Kucoin = require('kucoin-api');

let kc = new Kucoin(config.keys.KUKOIN.apiKey, config.keys.KUKOIN.secret);

const kuCoinMineWithdrawals = async (coin, page = 0) => {
  return kc.getDepositAndWithdrawalRecords({
    symbol: coin,
    type: 'deposit',
    page: page,
  });
};

let kuCoinGetWithdrawals = coin => {
  return kuCoinMineWithdrawals(coin)
    .then(async data => {
      const totalResults = Number(data.data.total);
      const promiseNeeded = Math.ceil(totalResults / Number(data.data.limit));
      let resultData = [];
      let promiseArr = [];
      for (i = 0; i < promiseNeeded; i++) {
        const minedData = await kuCoinMineWithdrawals(coin, i + 1);
        resultData = resultData.concat(minedData.data.datas);
      }
      console.log(JSON.stringify(resultData));
      return resultData;
    })
    .catch(error => {
      console.log(error);
    });
};

const getAllCurrency = async () => {
  let allCurs = [];
  for (ele of Exchanges) {
    await ele.loadMarkets();
    allCurs.push(Object.keys(ele.currencies));
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
    // if (name.name.toLowerCase() == platform.toLowerCase() && name.name.toLowerCase() == 'okex') {
    //   const path = '/api/account/v3/deposit/address?currency=' + symbol.toLowerCase();
    //   const timestamp = new Date().toISOString();
    //   const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(timestamp + 'GET' + path, config.keys.OKEX.secret));
    //   var options = {
    //     uri: 'https://www.okex.com' + path,
    //     headers: {
    //       'User-Agent': 'Request-Promise',
    //       'OK-ACCESS-KEY': config.keys.OKEX.apiKey,
    //       'OK-ACCESS-SIGN': sign,
    //       'OK-ACCESS-TIMESTAMP': timestamp,
    //       'OK-ACCESS-PASSPHRASE': config.keys.OKEX.passphrase,
    //     },
    //     json: true, // Automatically parses the JSON string in the response
    //   };

    //   const data = await rp(options);
    //   return data[0];
    // } else 
    if (name.name.toLowerCase() == platform.toLowerCase()) {
      await name.loadMarkets();
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
      await name.loadMarkets();
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
    await name.loadMarkets();
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
      ask: data && data.ask ? data.ask : 0,
      bid: data && data.bid ? data.bid : 0,
    };
    allVals.push(marketObj);
  }
  return { [symbol]: allVals };
};
const getTransactionFee = async (orderId, symbol) => {
  let sym = symbol.split('/').join('-');
  const path = '/api/spot/v3/fills?order_id=' + orderId + '&instrument_id=' + sym;
  const timestamp = new Date().toISOString();
  const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(timestamp + 'GET' + path, config.keys.OKEX.secret));
  var options = {
    uri: 'https://www.okex.com' + path,
    headers: {
      'User-Agent': 'Request-Promise',
      'OK-ACCESS-KEY': config.keys.OKEX.apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': 'saikat95',
    },
    json: true, // Automatically parses the JSON string in the response
  };

  const feeStruct = await rp(options);

  let fee = 0;
  feeStruct.map(i => {
    fee = fee + Number(i.fee);
  });
  return fee;
};
const verifyTxn = async (dipositTxnId, tiMeFrom, platForm, symbol, amount) => {
  for (let x in Exchanges) {
    let name = Exchanges[x];
    // if (name.name.toLowerCase() == platForm.toLowerCase() && name.name.toLowerCase() == 'okex') {
    //   const path = '/api/account/v3/deposit/history/' + symbol.toLowerCase() + '?amount=' + amount;
    //   const timestamp = new Date().toISOString();
    //   const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(timestamp + 'GET' + path, config.keys.OKEX.secret));
    //   var options = {
    //     uri: 'https://www.okex.com' + path,
    //     headers: {
    //       'User-Agent': 'Request-Promise',
    //       'OK-ACCESS-KEY': config.keys.OKEX.apiKey,
    //       'OK-ACCESS-SIGN': sign,
    //       'OK-ACCESS-TIMESTAMP': timestamp,
    //       'OK-ACCESS-PASSPHRASE': config.keys.OKEX.passphrase,
    //     },
    //     json: true, // Automatically parses the JSON string in the response
    //   };

    //   return rp(options)
    //     .then(function(reports) {
    //       const a = reports
    //         .map(i => {
    //           return {
    //             txid: i.txid,
    //             currency: i.currency,
    //             amount: i.amount,
    //             status: i.status == 2 ? 'ok' : 'pending',
    //           };
    //         })
    //         .filter(i => {
    //           //check time also here && (new Date(i.timestamp) < new Date(tiMeFrom))
    //           if ((dipositTxnId ? i.txid == dipositTxnId : true) && i.currency == symbol && i.amount == amount) {
    //             return i;
    //           }
    //         });
    //       return a;
    //     })
    //     .catch(function(err) {
    //       // API call failed...
    //       console.log(err);
    //     });
    // } else 
    if (name.name.toLowerCase() == platForm.toLowerCase() && name.name.toLowerCase() == 'kucoin') {
      try {
        const kucoinDeposits = await kuCoinGetWithdrawals(symbol);
        const a = kucoinDeposits
          .map(i => {
            // i={
            //   address:"0xe4717d694c78bf8c76a52388c969eeebee384ea0"
            //   amount:0.03504
            //   coinType:"ETH"
            //   confirmation:17
            //   createdAt:1542972397000
            //   fee:0
            //   oid:"5bf7e3edb95e0273d50e7fd3"
            //   outerWalletTxid:"0x36ec3aa8505d668df9ec8c8591ef08ddf16d8592f79da96887f8017890a100d2@0xe4717d694c78bf8c76a52388c969eeebee384ea0@eth"
            //   remark:null
            //   status:"SUCCESS"
            //   type:"DEPOSIT"
            //   updatedAt:1542972397000
            // }
            // add here :  && i.createdAt > tiMeFrom
            if (i.type == 'DEPOSIT') {
              return {
                txid: i.outerWalletTxid,
                currency: i.coinType,
                amount: i.amount,
                status: i.status == 'SUCCESS' ? 'ok' : 'pending',
              };
            }
          })
          .filter(i => {
            if ((dipositTxnId ? i.txid == dipositTxnId : true) && i.currency == symbol && i.amount == amount) {
              return i;
            }
          });
        return a;
      } catch (error_mapping) {
        console.log(error_mapping);
        return Promise.reject({
          status: 400,
          message: error_mapping.message || 'No Txn Found',
          error: error_mapping,
        });
      }
    } else if (name.name.toLowerCase() == platForm.toLowerCase()) {
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

        // for okex send the amount from wallet to spot A/c
        // place the order in the usual way next with the existing function
        // during verification step, if order closed, get the fee of TXN from the function getTransactionFee
        // in send amount to user send that converted amount  to the wallet again
        // transfer or start the withdrawal process [wont work with current api key, as my accounr not verified]
        // if (name.name.toLowerCase() == 'okex') {
        //   const sym = fromSymbol.toLowerCase() + '_usd';
        //   const data = await name.private_post_funds_transfer({
        //     symbol: sym, //eth_usd to transfer ETH
        //     amount: amount, // an amount of 1 ETH is being transferred
        //     // 1 = spot trading account, 3 = futures trading account, 6 = wallet account
        //     from: 6, // from wallet
        //     to: 1, // to spot
        //   });
        //   if (!data.result) {
        //     return Promise.reject({ message: 'unable to transfer to the spot account' });
        //   }
        // }
        let toSymbolAmount;
        let side;
        if(name.name.toLowerCase() == "cryptopia"){
          amount = (amount - (amount*0.2)/100);
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
const sendCurrency = async (platForm, address, amount, symbol) => {
  for (let x in Exchanges) {
    let name = Exchanges[x];

    if (name.name.toLowerCase() == platForm.toLowerCase()) {
      await name.loadMarkets();
      try {
        // const data={
        //     info:"",
        //     id:121212
        // }
        // if (name.name.toLowerCase() == 'okex') {
        //   const sym = symbol.toLowerCase() + '_usd';
        //   const data = await name.private_post_funds_transfer({
        //     symbol: sym, //eth_usd to transfer ETH
        //     amount: amount, // an amount of 1 ETH is being transferred
        //     // 1 = spot trading account, 3 = futures trading account, 6 = wallet account
        //     from: 1, // from spot
        //     to: 6, // to wallet
        //   });
        //   if (!data.result) {
        //     return Promise.reject({ message: 'unable to transfer to the spot account' });
        //   }
        // }
        if (name.name.toLowerCase() == 'kucoin') {
          const AllFees = name.fees;
          const fees = AllFees.funding.withdraw[symbol];
          const amountWIthoutFee = Number(amount) - Number(fees);
          const data = await name.withdraw(symbol, amountWIthoutFee, address, (tag = undefined), (params = {}));
          return data;
        }

        // if (name.name.toLowerCase() == 'okex') {
        //   const path = '/api/account/v3/withdrawal/fee?currency=' + symbol.toLowerCase();
        //   const timestamp = new Date().toISOString();
        //   const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(timestamp + 'GET' + path, config.keys.OKEX.secret));
        //   var options = {
        //     uri: 'https://www.okex.com' + path,
        //     headers: {
        //       'User-Agent': 'Request-Promise',
        //       'OK-ACCESS-KEY': config.keys.OKEX.apiKey,
        //       'OK-ACCESS-SIGN': sign,
        //       'OK-ACCESS-TIMESTAMP': timestamp,
        //       'OK-ACCESS-PASSPHRASE': config.keys.OKEX.passphrase,
        //     },
        //     json: true, // Automatically parses the JSON string in the response
        //   };

        //   const allFee = await rp(options);
        //   const fee = allFee[0].min_fee;
        //   const withdrawPath = '/api/account/v3/withdrawal';
        //   const timestampV1 = new Date().toISOString();
        //   const body = {
        //     amount: amount.toString(),
        //     currency: symbol.toLowerCase(),
        //     destination: 4,
        //     fee: fee.toString(),
        //     to_address: address,
        //     trade_pwd: config.keys.OKEX.password
        //   };
        //   console.log(JSON.stringify(body))
        //   const withdrawSign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(timestampV1 + 'POST' + withdrawPath + JSON.stringify(body), config.keys.OKEX.secret));
        //   var withdrawOptions = {
        //     method: 'POST',
        //     body: body,
        //     uri: 'https://www.okex.com' + withdrawPath,
        //     headers: {
        //       'User-Agent': 'Request-Promise',
        //       'OK-ACCESS-KEY': config.keys.OKEX.apiKey,
        //       'OK-ACCESS-SIGN': withdrawSign,
        //       'OK-ACCESS-TIMESTAMP': timestampV1,
        //       'OK-ACCESS-PASSPHRASE': config.keys.OKEX.passphrase,
        //       'content-type': 'application/json',
        //     },
        //     json: true, // Automatically parses the JSON string in the response
        //   };
        //   const sendingData = await rp(withdrawOptions);
        //   if (sendingData.result) {
        //     return {
        //       witdrawn: sendingData.result,
        //       id: sendingData.withdrawal_id,
        //     };
        //   } else {
        //     return Promise.reject({
        //       status: 400,
        //       message: sendingData.error_code || 'Some Error Occured!',
        //       error: sendingData,
        //     });
        //   }
        //   // const data = await name.withdraw(symbol, amount, address, (tag = undefined), (params = {chargefee:fee,destination:4}));
        //   //  return data;
        // }
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
        // if(data.length){
        //     const a =data.filter(i=>{
        //         if(i.cost==amount){
        //             return i;
        //         }
        //     });
        //     return a;
        // }
        // if (data.status == 'closed' && name.name.toLowerCase() == 'okex') {
        //   const fee = await getTransactionFee(orderId, symbol);
        //   data.fee = {
        //     cost: fee,
        //     currency: symbol,
        //   };
        // }
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
