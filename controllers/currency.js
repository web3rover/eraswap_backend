const Currency = require('../models/Currency');
const cryptoHelper = require('../helpers/cryptos');


const get_supported_currency = async value => {
  const currency = await Currency.find({
    $or: [
      {
        name: { $regex: value, $options: 'i' },
      },
      {
        value: { $regex: value, $options: 'i' },
      },
    ],
  })
    .limit(8)
    .exec();
  return currency;
};

const getMax = async (from, to) => {
  return await cryptoHelper.getExchangeVal(from, to);
};

const getAddress = async (platform, symbol) => {
  return await cryptoHelper.getDepositAddress(platform, symbol);
};

const getCurrentMarket = async (platform, symbol) => {
  return await cryptoHelper.getCurrentMarket(platform, symbol);
};

module.exports = { get_supported_currency, getMax, getAddress, getCurrentMarket };
