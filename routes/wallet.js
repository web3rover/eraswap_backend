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
            return address.error ? address : address.data;
        } catch (ex) {
            return ex;
        }
    }
    else {
        return { error: "RPC module not found!" };
    }
}

getPrivateKey = async (email, crypto) => {
    var rpc = getRpcModule(crypto);
    if (rpc) {
        try {
            var address = await rpc.getPrivateKey(email);
            return address.error ? address : address.data;
        } catch (ex) {
            return ex;
        }
    }
    else {
        return { error: "RPC module not found!" };
    }
}

router.get('/getBalance', async (req, res, next) => {
    console.log(req.user);
    var crypto = req.query.crypto;
    var rpcModule = getRpcModule(crypto);
    try {
        if (rpcModule) {
            var balance = "";
            if (crypto === "Btc") {
                balance = await rpcModule.getBalance(req.user.email);
                balance = balance.error ? balance : "" + balance.result;
            }
            else {
                var address = await getAddress(req.user.email, crypto);
                balance = await rpcModule.getBalance(address);

            }
            if (balance.error) {
                return next({ message: balance.error });
            }
            return res.json({ balance: balance });
        }
        else {
            return next({ message: "RPC module not found!" });
        }
    } catch (ex) {
        return next({ message: ex.message });
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

router.get('/getPrivateKey', async (req, res, next) => {
    console.log(req.user);
    try {
        var op = await getPrivateKey(req.user.email, req.query.crypto);
        if (!op.error) {
            return res.json({ address: op });
        }
        else {
            return next({ message: op.error });
        }
    } catch (ex) {
        return next({ message: ex.message });
    }
});

router.post('/send', async (req, res, next) => {
    console.log(req.user);
    console.log(req.body);
    var rpcModule = getRpcModule(req.body.crypto);
    if (rpcModule) {
        var op = "";
        try {
            if (!req.body.receiver || !req.body.amount)
                throw "All parameters required!";
            if (req.body.crypto === "Btc") {
                op = await rpcModule.send(req.user.email, req.body.receiver, req.body.amount);
            }
            else {
                var sender = await getAddress(req.user.email, req.body.crypto);
                op = await rpcModule.send(sender, req.body.receiver, req.body.amount);
            }
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
    } else {
        return next({ message: "RPC module not found!" });
    }
});

module.exports = router;