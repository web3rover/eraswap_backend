const express = require('express');
const router = express.Router();

const txnCont = require('../controllers/transaction');

router.post('/verifyAndSave', (req, res, next) => {
  txnCont
    .verifyTxn(req.body.txnId,req.body.exchangePlatform,req.body.exchFromCurrency,req.body.exchFromCurrencyAmt)
    .then(data => {
      if (data && data.length === 1) {
        txnCont.sendToCustomer(
          req.body.exchangePlatform,
          req.body.fromAddress,
          req.body.totalExchangeAmout,
          req.body.exchToCurrency
          ).then(data=>{
            if(data && data.id){
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
          }else{
            return next({
              status:400,
              message:"We attempted to pay. if there is not reflected, please contact support."
            })
          }
          }).catch(error_sending=>{
            return next({
              status:400,
              message:"An Error Occured in payment,please contact Support.",
              stack:error_sending
            })
          })
      } else {
        return next({
          status: 400,
          message: 'Verification failed.',
        });
      }
    })
    .catch(error => {
      return next({
        status: 400,
        message: 'Verification failed.',
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
module.exports = router;
