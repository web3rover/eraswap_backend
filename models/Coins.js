var mongoose = require('mongoose');
var CoinSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'coinData',
  },
  BTC: {
    type: Number,
  },
  ETH: {
    type: Number,
  },
  EST: {
    type: Number,
  },
  in: {
    type: String,
    default: 'USD',
  },
  EST_IN_ETH:{
    type:Number
  }
});

const Coins = mongoose.model('Coins', CoinSchema);
module.exports = Coins;
