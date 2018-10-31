const Txn = require('../models/Transactions');
const cryptoHelper = require('../helpers/cryptos');

const verifyTxn = (eraswapSendAddress, lctxid, timeFrom, platForm, symbol, amount) => {
  return new Promise((resolve, reject) => {
    return Txn.findOne({ _id: lctxid })
    .exec()
    .then(data => {
    return cryptoHelper
      .verifyTxn(data.dipositTxnId ,timeFrom, platForm, symbol, amount)
      .then(verified_data => {
       
            if (data.witdrawn) {
              return reject({
                status: 400,
                message: 'Already withdrawn.',
              });
            }
            data.eraswapSendAddress = eraswapSendAddress;
            if (verified_data.length && !data.dipositTxnId) {
              verified_data.some(async i => {
                const count = Txn.countDocuments({ dipositTxnId: i }).exec();
                if (!count) {
                  data.dipositTxnStatus = verified_data[i].status;
                  data.dipositTxnId = verified_data[i].txid;
                }
                return true;
              });
            }else if(verified_data.length){
              data.dipositTxnStatus = verified_data[0].status;
            }
            data.save();
            return resolve({ _id: data._id, status: verified_data[0].status, txIdExist: data.dipositTxnId ? data.dipositTxnId : null });
          })
          .catch( error=> {
            return reject({
              message: 'Verification failed.',
              status: 400,
              error: error,
            });
          });
      })
      .catch(error_findtxn => {
        return next({
          status: 400,
          message: 'Error occured while attempting to update txn',
          error: error_findtxn,
        });
      });
  });
};

const sendToCustomer = (txnDocId, userId, platForm, address, amount, symbol) => {
  return new Promise((resolve, reject) => {
    return Txn.findOne({ _id: txnDocId, userId: userId })
      .exec()
      .then(txndata => {
        if (txndata.witdrawn) {
          return reject({
            status: 400,
            message: 'Already withdrawn.',
          });
        } else {
          return cryptoHelper
            .sendCurrency(platForm, address, amount, symbol)
            .then(dataOfSending => {
              console.log('Data Of sending:  ' + dataOfSending);

              txndata.witdrawn = true;
              txndata.ersToCastTxid = dataOfSending.id;
              txndata.save();
              return resolve(data);
            })
            .catch(error_sending => {
              return reject({
                status: 400,
                message: 'An Error Occured in payment,please contact Support.',
                stack: error_sending,
              });
            });
        }
      })
      .catch(error => {
        return reject({
          status: 400,
          message: 'An Error Occured While updating Txn record',
          stack: error,
        });
      });
  });
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
const getMytxn = user => {
  return Txn.find({ userId: user })
    .sort({ createdAt: -1 })
    .exec();
};
module.exports = {
  saveTxn,
  verifyTxn,
  getMytxn,
  sendToCustomer,
};
