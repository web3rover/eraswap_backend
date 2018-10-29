var mongoose = require('mongoose');
var CurrencySchema = new mongoose.Schema(
  {
    name: String,
    value: String,
  },
  {
    _id: false,
  }
);

const Currency = mongoose.model('Currency', CurrencySchema);
module.exports = Currency;
