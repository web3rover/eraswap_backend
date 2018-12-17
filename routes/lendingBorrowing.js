const express = require('express');
const router = express.Router();
const LBController = require('../controllers/lendingBorrowing.js');

router.get('/getCoinsOptions', async (req, res, next) => {
    LBController.getCoinsOptions().then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    });
});

router.get('/getCollateralCoinsOptions', async (req, res, next) => {
    LBController.getCollateralCoinsOptions(req.query.crypto).then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    });
});

router.post('/placeOrder', async (req, res, next) => {
    LBController.placeOrder(req.user, req.body).then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    });
});

router.get('/getOrderBook', async (req, res, next) => {
    LBController.getOrderBook(req.user).then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    });
});

router.get('/getAgreements', async (req, res, next) => {
    LBController.getAgreements(req.user).then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    });
});

router.post('/apply', async (req, res, next) => {
    console.log(req.user);
    console.log(req.body);
    LBController.apply(req.user, req.body.orderId).then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    });
});


module.exports = router;