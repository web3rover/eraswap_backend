var ccxt = require('ccxt');
var fs = require('fs');
var _ = require('lodash');

let Kraken = new ccxt.kraken();
let Bittrex = new ccxt.bittrex();
let Polonix =new ccxt.poloniex();
let Binance = new ccxt.binance();
let Bitfinex = new ccxt.bitfinex();
const Exchanges = [Bittrex, Polonix, Binance, Kraken,Bitfinex];
const getAllCurrency =async()=>{
let allCurs=[];
for(ele of Exchanges){
    await ele.loadMarkets();
    allCurs.push(Object.keys(ele.currencies));
}
const allArr =[].concat.apply([], allCurs)
let finalArr =[]
_.uniq(allArr).map(elem=>{
    return finalArr.push({name:elem,value:elem});
});
return finalArr;

}

module.exports={
    getAllCurrency
}