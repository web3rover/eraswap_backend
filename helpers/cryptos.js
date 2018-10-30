var ccxt = require('ccxt');
var fs = require('fs');
var _ = require('lodash');
const config = require('../configs/config');

let Kraken = new ccxt.kraken();
let Bittrex = new ccxt.bittrex(config.keys.BITTREX);
let Polonix = new ccxt.poloniex(config.keys.POLONIEX);
let Binance = new ccxt.binance(config.keys.BINANCE);
let Bitfinex = new ccxt.bitfinex();
const Exchanges = [Binance,Bittrex, Polonix, Kraken, Bitfinex];

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

const verifyTxn = async(txnId,platForm,symbol,amount)=>{
    for (let x in Exchanges) {
        let name = Exchanges[x];
        if(name.name == platForm ){
            await name.loadMarkets();
            let txnData;
            try{
            txnData= await name.fetchDeposits(currencies=symbol, since=undefined,limit=undefined,params={});
            txnData.filter(i=>{
                if(i.txid ==txnId && i.currency==symbol && i.amount==amount && i.side=="deposit"){
                    return i;
                }
            });
            return txnData;
            }catch(error){
                return Promise.reject({
                    status:400,
                    message:"No Txn Found"
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
            const data = await name.withdraw (symbol, amount, address, tag = undefined, params = {});
            return data;
            }catch(error){
                console.log(error);
                return Promise.reject({
                    status:400,
                    message:"Some Error Occured!",
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
