const Txn = require('../models/Transactions');
const cryptoHelper = require('../helpers/cryptos');

const verifyTxn = (eraswapSendAddress, lctxid, timeFrom, platForm, symbol, amount) => {
  return new Promise((resolve, reject) => {
    return cryptoHelper
      .verifyTxn(timeFrom, platForm, symbol, amount)
      .then(verified_data => {
        return Txn.findOne({ _id: lctxid })
          .exec()
          .then(data => {
            if (data.witdrawn) {
              return reject({
                status: 400,
                message: 'Already withdrawn.',
              });
            }
            data.eraswapSendAddress = eraswapSendAddress;
            (data.dipositTxnStatus = verified_data[0].status), (data.dipositTxnId = verified_data[0].txid), data.save();
            return resolve({ _id: data._id, status: verified_data[0].status });
          })
          .catch(error_findtxn => {
            return reject({
              message: 'Error occured while attempting to update txn',
              status: 400,
              error: error_findtxn,
            });
          });
      })
      .catch(error => {
        return next({
          status: 400,
          message: 'Verification failed.',
          error: error,
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
              txndata.ersToCastTxid=dataOfSending.id;
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
