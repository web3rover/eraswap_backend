const express = require('express');
const router = express.Router();
const agenda = require('../agenda');
const txnCont = require('../controllers/transaction');

router.post('/verifyAndSave', (req, res, next) => {
  txnCont
    .verifyTxn(req.body.eraswapSendAddress, req.body.lctxid, req.body.tiMeFrom, req.body.exchangePlatform, req.body.exchFromCurrency, req.body.exchFromCurrencyAmt)
    .then(data => {
      if (data.status === "ok") {
        txnCont
          .sendToCustomer(data._id, req.user._id, req.body.exchangePlatform, req.body.eraswapSendAddress, req.body.totalExchangeAmout, req.body.exchToCurrency)
          .then(dataOfSending => {
            if (dataOfSending && dataOfSending.id) {
              return res.json(dataOfSending.id);
            } else {
              return next({
                status: 400,
                message: 'We attempted to pay. we will try again, if not received within 5 hours,please contact support',
              });
            }
          })
          .catch(error_sending => {
            return next({
              status: 400,
              message: error_sending.message || 'An Error Occured in payment,please contact Support.',
              stack: error_sending,
            });
          });
      } else {
        agenda.schedule('in 2 minutes','CheckForTxn and Send',{userID:req.user._id,...req.body});
        return next({
          status: 400,
          message: 'Verification failed. No deposit Found.',
        });
      }
    })
    .catch(error => {
      return next({
        status: 400,
        message: error.message || 'Verification failed.',
        error: error,
      });
    });
});

router.get('/getTxn', (req, res, next) => {
  txnCont
    .getMytxn(req.user._id)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next({
        status: 400,
        message: 'unknown error occurred.',
        stack: error,
      });
    });
});

router.post('/record_txn', (req, res, next) => {
  txnCont
    .saveTxn({ userId: req.user._id, ...req.body })
    .then(datas => {
      return res.json(datas);
    })
    .catch(error => {
      return next({
        status: 400,
        message: error.message || 'Unknown Error Occurred',
        stack: error,
      });
    });
});
module.exports = router;
