const Txn = require('../models/Transactions');

const verifyTxn = async txnId => {
  return true;
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
};
