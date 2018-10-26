const get_supported_currency = async() => {
  //fetch it from DB.
  const currency = [{ name: 'ETH', value: 'ETH' }, { name: 'BTC', value: 'BTC' }, { name: 'XRP', value: 'XRP' }];
  return currency;
};
module.exports = { get_supported_currency };
