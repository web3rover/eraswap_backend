const express = require('express');
const router = express.Router();
const RPC = require('../Nodes');

var rpcDirectory = RPC.RPCDirectory;

const walletController = require('../controllers/wallets');

getRpcModule = (crypto) => {
    return rpcDirectory[crypto];
}

getAddress = async (email, crypto) => {
    var rpc = getRpcModule(crypto);
    if (rpc) {
        try {
            var address = await rpc.getAddress(email);
            return address.data;
        } catch (ex) {
            return ex;
        }
    }
    else {
        return { error: "RPC module not found!" };
    }
}

router.get('/balance', async (req, res, next) => {
    console.log(req.user);
    console.log(req.query);
    var crypto = req.query.crypto;
    var rpcModule = getRpcModule(crypto);
    if (rpcModule) {
        if (crypto === "Btc") {
            var balance = await rpcModule.getBalance(req.user.email);
            return res.json({ balance: balance.result });
        }
        else {
            var address = await getAddress(req.user.email, crypto);
            var balance = await rpcModule.getBalance(address);
            return res.json({ balance: balance });
        }
    }
    else {
        return next({ message: "RPC module not found!" });
    }
});

router.get('/getAddress', async (req, res, next) => {
    console.log(req.user);
    try {
        var op = await getAddress(req.user.email, req.query.crypto);
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
    var rpcModule = getRpcModule(req.body.crypto);
    if (rpcModule) {
        var op = "";
        try {
            if (req.body.crypto === "Btc") {
                op = await rpcModule.send(req.user.email, req.body.receiver, req.body.amount);
            }
            else {
                var sender = await getAddress(req.user.email, req.body.crypto);
                op = await rpcModule.send(sender, req.body.receiver, req.body.amount);
            }
            if (op.success) {
                return res.json(op);
            }
            else {
                return next({ message: op.message ? op.message : op });
            }

        }
        catch (ex) {
            if (ex.code === "ENETUNREACH") {
                return next({ message: "connection to bitcoin node failed!" });
            }
            return next(ex);
        }
    } else {
        return next({ message: "RPC module not found!" });
    }
});

module.exports = router;