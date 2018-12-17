const express = require('express');
const router = express.Router();

const escrowController = require('../controllers/escrow.cont');

router.get('/getBalance', async (req, res, next) => {
    console.log(req.user);
    var crypto = req.query.crypto;
    try {
        if (crypto) {
            var balance = await escrowController.getBalance(crypto);
            if (balance.error) {
                return next({ message: balance.error });
            }
            return res.json({ balance: balance });
        }
        else {
            return next({ message: "Please provide valid crypto!" });
        }
    } catch (ex) {
        return next({ message: ex.message });
    }
});

router.get('/getAddress', async (req, res, next) => {
    console.log(req.user);
    try {
        var op = await escrowController.getDepositAddress(req.query.crypto);
        if (!op.error) {
            return res.json({ address: op });
        }
        else {
            return next({ message: op.error });
        }
    } catch (ex) {
        return next({ message: op.message });
    }
});

router.post('/send', async (req, res, next) => {
    console.log(req.user);
    console.log(req.body);
    var op = "";
    try {
        if (!req.body.receiver || !req.body.amount || !req.body.crypto)
            throw { message: "All parameters required!" };
        op = await escrowController.send(req.body.crypto, req.body.receiver, req.body.amount);
        if (!op.error && op.success) {
            return res.json(op);
        }
        else {
            return next({ message: op.message ? op.message : op.error ? op.error : op });
        }

    }
    catch (ex) {
        if (ex.code === "ENETUNREACH") {
            return next({ message: "connection to bitcoin node failed!" });
        }
        return next({ message: ex.message });
    }
});

module.exports = router;