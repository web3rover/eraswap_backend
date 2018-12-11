const express = require('express');
const router = express.Router();

const AdminUserAuthCont = require('../../controllers/admins/auth');
const WalletCont = require('../../controllers/wallets');

router.post('/signup', async (req, res, next) => {
    if (!req.body.email || !req.body.username || !req.body.password) {
        return next({
            message: 'All fields are required.',
            status: 400
        });
    }
    var gasTankCheck = await WalletCont.checkGasTank();
    if (gasTankCheck.result) {
        AdminUserAuthCont.register(req.body).then(data => {
            delete data.password;
            WalletCont.createWallets(data).then(op => {
                return res.json(op)
            }).catch(err => next(err));
        }).catch(error => {
            return next(error);
        });
    }
    else {
        return next(gasTankCheck);
    }
});
router.post('/login', (req, res, next) => {
    if (!req.body.username || !req.body.password) {
        return next({
            message: 'All fields are required.',
            status: 400
        });
    }
    AdminUserAuthCont.login(req.body).then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    })
});

module.exports = router;
