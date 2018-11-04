var ccxt = require('ccxt');
var fs = require('fs');
var _ = require('lodash');
const config = require('../configs/config');

let Kraken = new ccxt.kraken(config.keys.KRAKEN);
let Bittrex = new ccxt.bittrex(config.keys.BITTREX);
let Polonix = new ccxt.poloniex(config.keys.POLONIEX);
let Binance = new ccxt.binance(config.keys.BINANCE);
let Coinex= new ccxt.coinex(config.keys.COINEX);
let Bitfinex = new ccxt.bitfinex();
const Exchanges = [Binance,Bittrex, Polonix,Kraken,Coinex];

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
const getDepositAddress =async(platform,symbol)=>{
    for (let x in Exchanges) {
        let name = Exchanges[x];
        if(name.name == platform ){
            await name.loadMarkets();
            let data;
            try{
              data = await name.fetchDepositAddress(symbol);
             } catch(error){
                 console.log(error);
                data = await name.createDepositAddress(symbol);
             }
            console.log(data);
            return data;
        }
    }
}
const getExchangeVal = async (from, to) => {
  let allVals = [];
  for (let x in Exchanges) {
    let name = Exchanges[x];
    await name.loadMarkets();
    let data; 
    try{
    data= await name
      .fetchTicker(`${from}/${to}`);
          
    }
    catch(error){
       
            console.log(error)
        
    }
    const marketObj = {
        name: name.name,
        ask: data && data.ask ? data.ask : 0,
        bid: data && data.bid ? data.bid :0,
      };
      allVals.push(marketObj);
  }
  return allVals;
  
};

const verifyTxn = async(dipositTxnId,tiMeFrom,platForm,symbol,amount)=>{
    for (let x in Exchanges) {
        let name = Exchanges[x];
        if(name.name == platForm ){
            await name.loadMarkets();
            let txnData;
            try{
            txnData= await name.fetchDeposits(currencies=symbol, since=tiMeFrom,limit=50,params={}); //change since=timeFrom
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
            const a =txnData.filter(i=>{
                if((dipositTxnId && (i.txid==dipositTxnId )) || i.currency==symbol && i.amount==amount && i.side=="deposit"){
                    return i;
                }
            });
            return a;
            }catch(error){
                return Promise.reject({
                    status:400,
                    message:error.message||"No Txn Found",
                    error:error
                })
            }
        }
    }

} 

const sendCurrency = async(platForm,address,amount,symbol)=>{
    for (let x in Exchanges) {
        let name = Exchanges[x];
       
        if(name.name == platForm ){
            try{
                // const data={
                //     info:"",
                //     id:121212
                // }
            const data = await name.withdraw (symbol, amount, address, tag = undefined, params = {});
            return data;
            }catch(error){
                console.log(error.constructor.name);
                return Promise.reject({
                    status:400,
                    message:error.constructor.name || "Some Error Occured!",
                    error:error
                })
            }
        }
    }
};

module.exports = {
  getAllCurrency,
  getExchangeVal,
  getDepositAddress,
  verifyTxn,
  sendCurrency
};
