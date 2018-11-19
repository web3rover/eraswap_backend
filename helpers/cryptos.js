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
let Yobit = new ccxt.yobit(config.keys.YOBIT);
const Exchanges = [Bittrex,Binance,Polonix,Yobit];
// const Exchanges = [Binance];

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
const getCurrentMarket = async(platform,symbol)=>{
    let sym ;
    for (let x in Exchanges) {
        let name = Exchanges[x];
        if(name.name.toLocaleLowerCase() == platform ){
            await name.loadMarkets();
            let data;
            try{
            sym=symbol;
            data= await name.fetchTicker(symbol);
            }catch(error){
                var from=symbol.split('/')[0];
                var to=symbol.split('/')[1];
                sym=to+'/'+from;
                data= await name.fetchTicker(sym);
            }
            return {data:data,symbol:sym};
        }
    }
}

const getExchangeVal = async (from, to) => {
  let allVals = [];
  let symbol;
  for (let x in Exchanges) {
    let name = Exchanges[x];
    await name.loadMarkets();
    let data; 
    try{
    symbol=from+'/'+to;
    data= await name
      .fetchTicker(symbol);
          
    }
    catch(err){
        console.log(err);
        try{
            symbol=to+'/'+from
        data= await name
      .fetchTicker(symbol);
        }catch(error){
            console.log(error)
        }
    }
    const marketObj = {
        name: name.name,
        ask: data && data.ask ? data.ask : 0,
        bid: data && data.bid ? data.bid :0,
      };
      allVals.push(marketObj);
  }
  return {[symbol]:allVals};
  
};

const verifyTxn = async(dipositTxnId,tiMeFrom,platForm,symbol,amount)=>{
    for (let x in Exchanges) {
        let name = Exchanges[x];
        if(name.name == platForm ){
            await name.loadMarkets();
            let txnData;
            try{
            txnData= await name.fetchDeposits(currencies=symbol, since=tiMeFrom,limit=50,params={}); //change since=timeFrom
            console.log(JSON.stringify(txnData))
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
                if((dipositTxnId ? i.txid==dipositTxnId : true) && i.currency==symbol && i.amount==amount){
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
const convertCurrency =async(symbol,platForm,fromSymbol,toSymbol,amount)=>{
    for (let x in Exchanges) {
        let name = Exchanges[x];
       
        if(name.name == platForm ){
            await name.loadMarkets();
            try{
                console.log(await name.fetchBalance())
            // const symbol =fromSymbol+'/'+toSymbol;

            let data;
            if(symbol === fromSymbol + "/" + toSymbol) {
              data = await name.createOrder(symbol,"market","sell",Number(amount));
              console.log("sell order placed",symbol,fromSymbol,toSymbol);
            }else if(symbol === toSymbol + "/" + fromSymbol) {
                data = await name.createOrder(symbol,"market","buy",Number(amount));
                console.log("buy order placed",symbol,fromSymbol,toSymbol);
            }
            return data;
            }catch(error){
                console.log (name.iso8601 (Date.now ()), error.constructor.name, error.message)
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
const sendCurrency = async(platForm,address,amount,symbol)=>{
    for (let x in Exchanges) {
        let name = Exchanges[x];
       
        if(name.name == platForm ){
            await name.loadMarkets();
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

const verifyOrder = async(timeFrom,platForm,symbol,amount)=>{
    for (let x in Exchanges) {
        let name = Exchanges[x];
       
        if(name.name == platForm ){
            try{
                const data = await name.fetchMyTrades(symbol=symbol,since=timeFrom,limit=50,params={});
                if(data.length){
                    const a =data.filter(i=>{
                        if(i.cost==amount){
                            return i;
                        }
                    });
                    return a;
                }
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
  sendCurrency,
  convertCurrency,
  verifyOrder,
 getCurrentMarket

};
