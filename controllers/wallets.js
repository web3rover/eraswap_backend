const Users = require('../models/Users');
const Withdrawals = require('../models/Withdrawal');
const Wallets = require('../models/Wallets');
const nodes = require('../configs/config').NODES;
const BTCRpc = require('../Nodes/BTCRpc');
const ETHRpc = require('../Nodes/EthRpc');


const Nodes = require('../Nodes');
const rpcDirectory = Nodes.RPCDirectory;
const getRpcModule = (crypto) => {
    return rpcDirectory[crypto];
}

const btcRpc = new BTCRpc(nodes.btc.host, nodes.btc.port, nodes.btc.username, nodes.btc.password);
const ethRpc = new ETHRpc(nodes.eth.host, nodes.eth.port);

const createWallets = async body => {
    try {
        var btcWallet = await btcRpc.createWallet(body.email);

        var btcWalletDoc = await new Wallets({
            type: 'btc',
            privateKey: btcWallet.privateKey,
            publicKey: btcWallet.publicKey,
            password: body.email,
            owner: body._id
        }).save();

        var ethWallet = await ethRpc.createWallet(body.email);

        var ethWalletDoc = await new Wallets({
            type: 'eth',
            publicKey: ethWallet.publicKey,
            privateKey: ethWallet.privateKey ? ethWallet.privateKey : "",
            keyObject: ethWallet.keyObject,
            password: ethWallet.password,
            owner: body._id
        }).save();

        var estWallet = await ethRpc.createWallet(body.email);

        var estWalletDoc = await new Wallets({
            type: 'est',
            publicKey: estWallet.publicKey,
            privateKey: estWallet.privateKey ? estWallet.privateKey : "",
            keyObject: estWallet.keyObject,
            password: estWallet.password,
            owner: body._id
        }).save();

        var users = await Users.find({ email: body.email });
        var user = {};
        if (users.length >= 1) {
            users[0].wallet.push(btcWalletDoc._id);
            users[0].wallet.push(ethWalletDoc._id);
            users[0].wallet.push(estWalletDoc._id);
            user = await users[0].save();
        }
        return user;
    } catch (ex) {
        return ex;
    }
}

const getHistory = async (email, crypto) => {
    var rpcModule = getRpcModule(crypto);
    try {
        if (rpcModule) {
            var history = await rpcModule.getHistory(email);
            if (history.message) {
                throw history.message;
            }
            return ({ history: history });
        }
        else {
            return Promise.reject({ message: "RPC module not found!" });
        }
    } catch (ex) {
        return Promise.reject({ message: ex.message });
    }
}

const checkGasTank = async () => {
    try {
        var wallet = await Wallets.findOne({ gasTank: true, type: 'eth' });
        if (!wallet) {
            var ethWallet = await ethRpc._createGasTank();

            wallet = await new Wallets({
                type: 'eth',
                publicKey: ethWallet.publicKey,
                privateKey: ethWallet.privateKey ? ethWallet.privateKey : "",
                keyObject: ethWallet.keyObject,
                password: ethWallet.password,
                gasTank: true
            }).save();
        }
        return { result: true };
    } catch (ex) {
        console.log(ex);
        return { result: false, error: ex };
    }
}

const getBalance = async (email, crypto) => {

    var rpcModule = getRpcModule(crypto);
    try {
        if (rpcModule) {
            var balance = "";
            if (crypto === "BTC") {
                balance = await rpcModule.getBalance(email);
                balance = balance.error ? balance : "" + balance.result;
            }
            else {
                var address = await getAddress(email, crypto);
                balance = await rpcModule.getBalance(address);

            }
            if (balance.error) {
                return Promise.reject({ message: balance.error });
            }
            return ({ balance: balance });
        }
        else {
            return Promise.reject({ message: "RPC module not found!" });
        }
    } catch (ex) {
        return Promise.reject({ message: ex.message });
    }
}

const getAddress = async (email, crypto) => {
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

const getPrivateKey = async (email, crypto) => {
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

const send = async (email, amount, receiver, crypto) => {

    var rpcModule = getRpcModule(crypto);
    if (rpcModule) {
        var op = "";
        try {
            if (!receiver || !amount)
                throw "All parameters required!";
            if (crypto === "BTC") {
                op = await rpcModule.send(email, receiver, amount);
            }
            else {
                var sender = await getAddress(email, crypto);
                op = await rpcModule.send(sender, receiver, amount);
            }
            if (!op.error && op.success) {
                return (op);
            }
            else {
                return Promise.reject({ message: op.message ? op.message : op.error ? op.error : op });
            }

        }
        catch (ex) {
            if (ex.code === "ENETUNREACH") {
                return Promise.reject({ message: "connection to bitcoin node failed!" });
            }
            return Promise.reject({ message: ex.message });
        }
    } else {
        return Promise.reject({ message: "RPC module not found!" });
    }
}

const sendToEscrow = async (email, amount, crypto) => {
    var coin = "" + crypto;
    coin = coin.toLowerCase();
    try {
        var escrow = await Wallets.findOne({ escrow: true, type: coin });
        if (escrow) {
            var op = await send(email, amount, escrow.publicKey, crypto);
            var withdrawal = await Withdrawals.findById(op.dbObject._id);
            if (withdrawal) {
                withdrawal["source"] = "sendToEscrow";
                op.dbObject = await withdrawal.save();
                return op;
            }
            return Promise.reject({ message: "Database entry for withdrawal not found!" });
        }
        else {
            return Promise.reject({ message: "Escrow wallet for " + crypto + " not found." });
        }
    } catch (ex) {
        return ex;
    }
}

module.exports = {
    createWallets,
    checkGasTank,
    getBalance,
    getAddress,
    getPrivateKey,
    send,
    getHistory,
    sendToEscrow,
};
