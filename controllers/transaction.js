const Txn = require('../models/Transactions');
const cryptoHelper = require('../helpers/cryptos');
const config = require('../configs/config');
const escrrows = require('./escrow.cont');
const wallets = require('./wallets');
const rp = require('request-promise');
const BigNumber = require('bignumber.js');
const Coins = require('../models/Coins');

const verifyTxn = (eraswapSendAddress, lctxid, timeFrom, platForm, symbol, amount) => {
  return new Promise((resolve, reject) => {
    return Txn.findOne({ _id: lctxid })
      .exec()
      .then(data => {
        return cryptoHelper
          .verifyTxn(data.dipositTxnId, timeFrom, platForm, symbol, amount)
          .then(verified_data => {
            if (data.witdrawn) {
              return reject({
                status: 400,
                message: 'Already withdrawn.',
              });
            }
            data.eraswapSendAddress = eraswapSendAddress;
            if (verified_data.length && !data.dipositTxnId) {
              verified_data.some(i => {
                Txn.countDocuments({ dipositTxnId: i.txid })
                  .exec()
                  .then(count => {
                    if (!count) {
                      //change and iterate this thing after
                      (data.depositNotFpund = false), (data.dipositTxnStatus = verified_data[0].status);
                      data.dipositTxnId = verified_data[0].txid;
                    }
                    data.save(error => {
                      if (error) {
                        console.log(error);
                      }
                    });
                    return resolve({
                      _id: data._id,
                      status: data.dipositTxnStatus,
                      txIdExist: data.dipositTxnId ? data.dipositTxnId : null,
                      convertedYet: data.convertedYet,
                      amtToSend: data.amtToSend,
                    });
                  })
                  .catch(error_count => {
                    return reject(error_count);
                  });
              });
            } else if (verified_data.length) {
              data.dipositTxnStatus = verified_data[0].status;
              data.save(error => {
                if (error) {
                  console.log(error);
                }
              });
              return resolve({
                _id: data._id,
                status: verified_data[0].status,
                txIdExist: data.dipositTxnId ? data.dipositTxnId : null,
                convertedYet: data.convertedYet,
                amtToSend: data.amtToSend,
              });
            } else {
              data.save(error => {
                if (error) {
                  console.log(error);
                }
              });
              return resolve({
                _id: data._id,
                status: verified_data.length ? verified_data[0].status : 'not received yet',
                txIdExist: data.dipositTxnId ? data.dipositTxnId : null,
                convertedYet: data.convertedYet,
                amtToSend: data.amtToSend,
              });
            }
          })
          .catch(error => {
            return reject({
              message: 'Verification failed.',
              status: 400,
              error: error,
            });
          });
      })
      .catch(error_findtxn => {
        return reject({
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
            .sendCurrency(platForm, address, amount, symbol, txndata.eraswapSendTag)
            .then(dataOfSending => {
              console.log('Data Of sending:  ' + dataOfSending);

              txndata.witdrawn = true;
              txndata.ersToCastTxid = dataOfSending.id;
              txndata.save();
              return resolve(txndata);
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

const updateTxnAmount = async (lctxid, receivedAmount) => {
  try {
    var txn = await Txn.updateOne(
      {
        _id: lctxid,
      },
      {
        $set: {
          exchFromCurrencyAmt: receivedAmount,
        },
      }
    );
    return {
      success: true,
      txn: txn,
    };
  } catch (ex) {
    return ex;
  }
};

const getMytxn = user => {
  return Txn.find({ userId: user })
    .sort({ createdAt: -1 })
    .exec();
};
const converTdata = async (symbol, id, platForm, fromSymbol, toSymbol, amount, platFormFeeCoin, userEmail) => {
  const txnData = await Txn.findOne({ _id: id }).exec();
  let placableAmt;
  let fee;
  //deduct 0.5% from amount  or 0.25 if its EST
  if (!txnData.feePaid && platFormFeeCoin == 'EST') {
    const fromCurMarketVal = await rp(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&CMC_PRO_API_KEY=' + config.coinMktCapKey + '&symbol=' + fromSymbol
    );
    const fromCurVal = amount * JSON.parse(fromCurMarketVal).data[fromSymbol].quote.USD.price;
    const EST_VAL = await Coins.findOne({ name: 'coinData', in: 'USD' })
      .select('EST')
      .exec();
    const eqvEstVal = fromCurVal / EST_VAL['EST'];

    fee = new BigNumber(eqvEstVal)
      .multipliedBy(config.PLATFORM_FEE / 2)
      .dividedBy(100)
      .toNumber();
    const depositAdd = await escrrows.getDepositAddress('EST');
    const sendStatus = await wallets.send(userEmail, fee, depositAdd, 'EST');
    if (!sendStatus.success) {
      throw sendStatus;
    }
    console.log(sendStatus); //maybe log this or something
    placableAmt = amount;
    //deduct 25% from user wallet and send to escrow
  } else if (!txnData.feePaid) {
    // 50% deduct and place order
    fee = new BigNumber(amount)
      .multipliedBy(config.PLATFORM_FEE)
      .dividedBy(100)
      .toNumber();
    placableAmt = amount - fee;
  }
  const data = await cryptoHelper.convertCurrency(symbol, platForm, fromSymbol, toSymbol, placableAmt);
  await Txn.findOneAndUpdate(
    { _id: id },
    {
      $set: { feePaid: true, convertedYet: 'started', platform_fee: fee, convertionTime: data.timestamp, orderId: data.id, side: data.side, orderplacingAmt: data.orderplacingAmt },
    }
  ).exec();

  return data;
};
const verifyConvertion = (id, platForm, symbol) => {
  return new Promise((resolve, reject) => {
    Txn.findOne({ _id: id })
      .exec()
      .then(data => {
        cryptoHelper
          .verifyOrder(data.convertionTime, platForm, symbol, data.orderId, data.orderplacingAmt, data.side)
          .then(data_verified => {
            if (data_verified && data_verified.status == 'closed') {
              if (!data.conversation_fees) {
                data.convertionTime = data_verified.timestamp;
                data.conversation_fees = data_verified.fee ? data_verified.fee.cost : 0;
                data.amtToSend = data_verified.side == 'sell' ? data_verified.cost - data.conversation_fees : data_verified.amount - data.conversation_fees;
              }
              if (platForm.toLowerCase() != 'cryptopia' || data.conversation_fees != 0) {
                data.convertedYet = 'finished';
              }
              data.save();
              return resolve({ verified: true, amtToSend: data.amtToSend });
            } else if (data_verified && data_verified.status == 'canceled') {
              //save to db , this order cancelled manually
              return reject({ canceled: true, verified: false });
            } else {
              return reject({ verified: false });
            }
          })
          .catch(error_verification => {
            return reject(error_verification);
          });
      })
      .catch(error_finding => {
        return reject(error_finding);
      });
  });
};
//call it for cancel order and refund
const cancelAndRefundExistingOrder = (id, platForm, fromSymbol, symbol) => {
  return new Promise((resolve, reject) => {
    Txn.findOne({ _id: id })
      .exec()
      .then(data => {
        cryptoHelper
          .cancelOrder(platForm, symbol, data.orderId)
          .then(data => {
            data.cancelledConvertion = true;
            //data.refundAddress is not there, save it somehow. or tress the depositor address
            cryptoHelper
              .sendCurrency(platForm, data.refundAddress, data.exchFromCurrencyAmt, fromSymbol)
              .then(data => {
                data.refunded = true;
              })
              .catch(error => {
                data.save();
                return reject(error);
              });
            data.save();
          })
          .catch(unable_to_cancel => {
            return reject(unable_to_cancel);
          });
      })
      .catch(error_finding => {
        return reject(error_finding);
      });
  });
};

const markAsCancel = lctxId => {
  return Txn.update({ _id: lctxId }, { $set: { cancelled: true } })
    .exec()
    .then(data => {
      return true;
    })
    .catch(err => {
      return false;
    });
};
module.exports = {
  saveTxn,
  verifyTxn,
  getMytxn,
  sendToCustomer,
  converTdata,
  verifyConvertion,
  cancelAndRefundExistingOrder,
  updateTxnAmount,
  markAsCancel,
};
