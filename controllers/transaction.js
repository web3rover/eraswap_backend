const Txn = require('../models/Transactions');
const  cryptoHelper =require('../helpers/cryptos');

const verifyTxn = async (txnId,platForm,symbol,amount) => {
 return await cryptoHelper.verifyTxn(txnId,platForm,symbol,amount);

};
const sendToCustomer = async(platForm,address,amount,symbol)=>{
return await cryptoHelper.sendCurrency(platForm,address,amount,symbol)
};

const saveTxn = data => {
  return new Promise((resolve, reject) => {
    const savableTxn = new Txn(data);
    savableTxn.save((error, saved) => {
      if (error) {
        return reject(error);
      }
      return resolve(saved);
    });
  });
};
const getMytxn = (user)=>{
   return Txn.find({userId:user}).sort({createdAt:-1}).exec();
};
module.exports = {
  saveTxn,
  verifyTxn,
  getMytxn,
  sendToCustomer
};
