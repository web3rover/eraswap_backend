const express = require('express');
const router = express.Router();
const agenda = require('../agenda');
const txnCont = require('../controllers/transaction');

router.post('/verifyAndSave', async (req, res, next) => {
    await agenda.create('CheckForTxn and Send', {
        userID: req.user._id,
        userEmail: req.user.email,
        ...req.body
    }).repeatEvery("2 minutes").save();
    res.json({
        status: "Done"
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
        .saveTxn({
            userId: req.user._id,
            ...req.body
        })
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

router.post('/updateTxnAmount', (req, res, next) => {
    txnCont.updateTxnAmount(req.lctxid, req.receivedAmount).then(data => {
        res.json(data);
    }).catch(error => {
        return next({
            status: 400,
            message: 'unknown error occurred.',
            stack: error,
        });
    });
});
module.exports = router;
