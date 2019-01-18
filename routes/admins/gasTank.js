const express = require('express');
const router = express.Router();
const gasTankCont = require('../../controllers/admins/gasTank');

router.get('/getDetails', (req, res, next) => {
    gasTankCont.getDetails().then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    })
});

router.get('/getTxnCount', (req, res, next) => {
    gasTankCont.getTxnCount().then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    })
});

router.get('/getTxn', (req, res, next) => {
    gasTankCont.getTxn(req.query).then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    })
});

module.exports = router;