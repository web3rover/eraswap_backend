const express = require('express');
const router = express.Router();

const txnCont = require('../controllers/transaction');

router.post('/verifyAndSave', (req, res, next) => {
  txnCont
    .verifyTxn(req.body.txnId)
    .then(data => {
      if (data) {
        txnCont
          .saveTxn({ userId: req.user._id, ...req.body })
          .then(datas => {
            return res.json(datas);
          })
          .catch(error => {
            return next({
              status: 400,
              message: error.message || 'Unknown Error Occured',
              stack: error,
            });
          });
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
