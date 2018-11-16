const express = require('express');
const BTCRpc = require('../Nodes/BTCRpc');
const router = express.Router();

let BtcNodeUsername = "foo";
let BtcNodePassword = "bar";

let BtcNodeHost = "http://52.172.139.25";
let BtcNodePort = 8555;

const btcRpc = new BTCRpc(BtcNodeHost, BtcNodePort, BtcNodeUsername, BtcNodePassword);

const UserAuthCont = require('../controllers/user.auth.cont');

router.post('/signup', (req, res, next) => {
    if (!req.body.email || !req.body.username || !req.body.password) {
        return next({
            message: 'All fields are required.',
            status: 400
        });
    }

    UserAuthCont.register(req.body).then(data => {
        delete data.password;

        btcRpc.CreateWallet(data.email).then((walletRes) => {
            console.log(walletRes);
            btcRpc.GetNewAddressForWallet(data.email).then(result => {
                console.log("Address info: " + result);
                return res.json(data);
            }).catch(err => {
                next(err);
            });
        }).catch(err => {
            next(err);
        });
    }).catch(error => {
        return next(error);
    });
});
router.post('/login', (req, res, next) => {
    if (!req.body.username || !req.body.password) {
        return next({
            message: 'All fields are required.',
            status: 400
        });
    }
    UserAuthCont.login(req.body).then(data => {
        return res.json(data);
    }).catch(error => {
        return next(error);
    })
});

module.exports = router;
