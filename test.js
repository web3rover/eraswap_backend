var config = require('./configs/config');
var txnCont = require('./controllers/transaction');
var cryptoapi = require('./helpers/cryptos');
var txn = require('./models/Transactions');
const jobData = {
  userID: '5bcfe73feae0862b5d4a12ec',
  symbol: 'LTC/DOGE',
  tiMeFrom: 1542769983869,
  exchFromCurrency: 'LTC',
  exchFromCurrencyAmt: '0.13',
  exchToCurrency: 'DOGE',
  exchToCurrencyRate: 15082.189299,
  allExchResult: [
    {
      name: 'Bittrex',
      ask: 0,
      bid: 0,
    },
    {
      name: 'Binance',
      ask: 0,
      bid: 0,
    },
    {
      name: 'Poloniex',
      ask: 0,
      bid: 0,
    },
    {
      name: 'YoBit',
      ask: 15082.189299,
      bid: 14701.8653604,
    },
  ],
  eraswapAcceptAddress: 'LNnPJBoFQQv9pwVBwY8ZnGquVDa51YyEuV',
  eraswapSendAddress: 'DUA22SBSuvNP29jJoZdW8i4M6VL7PckdAc',
  exchangePlatform: 'Yobit',
  totalExchangeAmout: 1960.68460887,
  lctxid: '5bf4cef4345efd0406d1bc01',
};

const ab = () => {
  txnCont
    .verifyTxn(jobData.eraswapSendAddress, jobData.lctxid, jobData.tiMeFrom, jobData.exchangePlatform, jobData.exchFromCurrency, jobData.exchFromCurrencyAmt)
    .then(data => {
      if (data.txIdExist && data.status == 'ok' && !data.convertedYet) {
        txnCont
          .converTdata(jobData.symbol, jobData.lctxid, jobData.exchangePlatform, jobData.exchFromCurrency, jobData.exchToCurrency, jobData.exchFromCurrencyAmt)
          .then(conversation_data => {
            if (conversation_data.status == 'closed' && conversation_data.cost == jobData.exchFromCurrencyAmt) {
              txnCont
                .sendToCustomer(data._id, jobData.userID, jobData.exchangePlatform, jobData.eraswapSendAddress, data.amtToSend, jobData.exchToCurrency)
                .then(dataOfSending => {
                  if (dataOfSending && dataOfSending.id) {
                    job.remove();
                    done();
                  }
                })
                .catch(error_sending => {
                  return done({
                    stack: error_sending,
                  });
                });
            }
          })
          .catch(error_converting => {
            done(error_converting);
          });
      } else if (data.convertedYet === 'started') {
        txnCont
          .verifyConvertion(jobData.lctxid, jobData.exchangePlatform, jobData.symbol)
          .then(verified => {
            if (verified.verified && verified.amtToSend) {
              txnCont
                .sendToCustomer(data._id, jobData.userID, jobData.exchangePlatform, jobData.eraswapSendAddress, verified.amtToSend, jobData.exchToCurrency)
                .then(dataOfSending => {
                  if (dataOfSending && dataOfSending.id) {
                    job.remove();
                    done();
                  }
                })
                .catch(error_sending => {
                  return done({
                    stack: error_sending,
                  });
                });
            }
          })
          .catch(error_verfctn => {
            done(error_verfctn);
          });
      } else if (data.convertedYet === 'finished' && data.amtToSend) {
        txnCont
          .sendToCustomer(data._id, jobData.userID, jobData.exchangePlatform, jobData.eraswapSendAddress, data.amtToSend, jobData.exchToCurrency)
          .then(dataOfSending => {
            if (dataOfSending && dataOfSending.id) {
              job.remove();
              done();
            }
          })
          .catch(error_sending => {
            return done({
              stack: error_sending,
            });
          });
      } else {
        return done({
          message: 'Verification failed. No deposit Found.',
        });
      }
    })
    .catch(error => {
      return done({
        message: error.message || 'Verification failed.',
        error: error,
      });
    });
};

var ccxt = require('ccxt');
let Bittrex = new ccxt.bittrex(config.keys.BITTREX);

const getCurrentMarket = async symbol => {
  let sym;

  await Bittrex.loadMarkets();
  let data;
  try {
    sym = symbol;
    data = await Bittrex.fetchTicker(symbol);
  } catch (error) {
    var from = symbol.split('/')[0];
    var to = symbol.split('/')[1];
    sym = to + '/' + from;
    data = await Bittrex.fetchTicker(sym);
  }
  return { data: data, symbol: sym };
};

const bc = async (symbol, fromSymbol, toSymbol, amount) => {
  await Bittrex.loadMarkets();
  try {
    console.log(await Bittrex.fetchBalance());
    // const symbol =fromSymbol+'/'+toSymbol;

    let data;

    if (symbol === fromSymbol + '/' + toSymbol) {
      const curMar = await getCurrentMarket(symbol);
      try {
        data = await Bittrex.createOrder(curMar.symbol, 'limit', 'sell', Number(amount), curMar.data.ask);
      } catch (error) {
        data = await Bittrex.createOrder(curMar.symbol, 'limit', 'buy', Number(amount), curMar.data.ask);
      }

      console.log('sell order placed', symbol, fromSymbol, toSymbol);
    } else if (symbol === toSymbol + '/' + fromSymbol) {
      const curMar = await getCurrentMarket(symbol);
      try {
        data = await Bittrex.createOrder(curMar.symbol, 'limit', 'buy', Number(amount), curMar.data.ask);
      } catch (error) {
        data = await Bittrex.createOrder(curMar.symbol, 'limit', 'sell', Number(amount), curMar.data.ask);
      }

      console.log('buy order placed', symbol, fromSymbol, toSymbol);
    }
    return data;
  } catch (error) {
    console.log(Bittrex.iso8601(Date.now()), error.constructor.name, error.message);
    console.log(error.constructor.name);
    return Promise.reject({
      status: 400,
      message: error.constructor.name || 'Some Error Occured!',
      error: error.message,
    });
  }
};
cd = async () => {
  await Bittrex.loadMarkets();
  try {
    data = await Bittrex.fetchOrder('9b34735f-177f-4357-af02-5cf4ad7f6a0f');
    data1 = await Bittrex.fetchMyTrades();
  } catch (error) {
    console.log(error);
  }
  console.log(data, data1);
};

var CryptoJS = require('crypto-js');
var rp = require('request-promise');
var moment = require('moment');

const ef = async () => {
  // const path ='/api/account/v3/deposit/address?currency=eth'
  // const path='/api/account/v3/deposit/history?currency=eth&amount=0.12498154'
  const path = '/api/spot/v3/fills?order_id=1843232969662464&instrument_id=ETH-USDT';
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

  rp(options)
    .then(function(repos) {
      // repos[0].address // is the address
      let fee = 0;
      repos.map(i => {
        fee = fee + Number(i.fee);
      });
      console.log(fee);
      console.log('User has %d repos', repos.length);
    })
    .catch(function(err) {
      // API call failed...
      console.log(err);
    });
};
const okex = new ccxt.okex(config.keys.OKEX_V1);
var cryptoHelper = require('./helpers/cryptos');
const fg = async () => {
  try {
    const data = await okex.private_post_funds_transfer({
      symbol: 'usdt_usd', //eth_usd to transfer ETH
      amount: 17.16175711, // an amount of 1 ETH is being transferred
      // 1 = spot trading account, 3 = futures trading account, 6 = wallet account
      from: 1, // from wallet
      to: 6, // to spot
    });
    console.log(data);
    // cryptoHelper.convertCurrency('ETH/USDT','okex','ETH','USDT',0.12438368	).then(data2=>{
    //   console.log(data2);
    // }).catch(errror=>{
    //   console.log(errror);
    // })
    // const status = await okex.fetchOrder('1843232969662464','ETH/USDT');
    // if(status.status == "closed"){
    //   const data =await okex.private_post_funds_transfer({
    //     'symbol': "usdt_usd",  //eth_usd to transfer ETH
    //     'amount': status.cost,  // an amount of 1 ETH is being transferred
    //     // 1 = spot trading account, 3 = futures trading account, 6 = wallet account
    //     'from': 1,  // from wallet
    //     'to': 6,  // to spot
    // });
    // }else{
    //   console.log("its open bruh")
    // }
  } catch (error) {
    console.log(error);
  }
};

const crypto = require('crypto');
const Kucoin = require('kucoin-api');

let kc = new Kucoin(config.keys.KUKOIN.apiKey, config.keys.KUKOIN.secret);

const mineS = async (coin, page = 0) => {
  return kc.getDepositAndWithdrawalRecords({
    symbol:coin,
    type:'deposit',
    page:page
  });
  
};

let gh = () => {
  return mineS('ETH')
    .then(async(data) => {
      const totalResults = Number(data.data.total);
      const promiseNeeded = Math.ceil(totalResults / Number(data.data.limit));
      let resultData = [];
        for (i = 0; i < promiseNeeded; i++) {
          const minedData = await mineS('ETH', i + 1);
          resultData = resultData.concat(minedData.data.datas);
        }
      console.log(JSON.stringify(resultData));
      return resultData
    })
    .catch(error => {
      console.log(error);
    });
};

const testCryptopia = async() => {
  return cryptoapi.getCurrentMarket('cryptopia','NEO/DOGE').then(curMar=>{
  txnCont.converTdata(curMar.symbol, '5bfa8e89c85482120babcb79','cryptopia','DOGE','NEO',470.982811)
  .inkthen(conversation_data=>{
    console.log(conversation_data);
  }).catch(error=>{
    console.log(error);
  })
}).catch(error=>{
  console.log(error);
});
};
const testCryptopiav1  = async()=>{
  const jobData={
    lctxid:'5bfa8e89c85482120babcb79',
    exchangePlatform:'cryptopia',
    exchFromCurrencyAmt:'470.982811',
    userID:'5bcfe73feae0862b5d4a12ec',
    exchToCurrency:'NEO',
    eraswapSendAddress:'AbiPfLjzFUYUvqsvtG4XLKrnciWsqALkUy'

  }
  return cryptoapi.getCurrentMarket('cryptopia','NEO/DOGE').then(curMar=>{
  txnCont.verifyConvertion(jobData.lctxid,jobData.exchangePlatform,curMar.symbol,jobData.exchFromCurrencyAmt).then(verified=>{
    if(!verified.verified && verified.canceled){
     console.log(2)
    }
    if(verified.verified && verified.amtToSend){
    txnCont
    .sendToCustomer(jobData.lctxid, jobData.userID, jobData.exchangePlatform, jobData.eraswapSendAddress, verified.amtToSend, jobData.exchToCurrency)
    .then(dataOfSending => {
      if (dataOfSending && dataOfSending.id) {
         console.log(1);
      }
    })
    .catch(error_sending => {
      console.log(error_sending);
    });
  }
  }).catch(error_verfctn=>{
    console.log(error_verfctn);
  });
}).catch(error=>{
  console.log(error);
})
}
const kucoinTrade =()=>{
   return txnCont.verifyConvertion('5bfa9840cf1875136dc13094','kucoin','NEO/ETH').then(data=>{
    console.log(data);
  }).catch(error=>{
    console.log(error);
  });
}
module.exports = {
  ab,
  bc,
  cd,
  ef,
  fg,
  gh,
  testCryptopia,
  testCryptopiav1,
  kucoinTrade
};
