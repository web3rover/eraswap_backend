const Currency = require('../models/Currency')
const get_supported_currency = async(value) => {
  const currency = await Currency.find({$or:[
{
  name:{$regex:value,$options:'i'}
},
{
  value:{$regex:value,$options:'i'}
}
  ]}).limit(8).exec();
  return currency;
};
module.exports = { get_supported_currency };
