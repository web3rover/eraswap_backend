const Wallets = require('../models/Wallets');
const WalletCont = require('./wallets');


const checkEscrow = async () => {
    try {
        var wallet = await Wallets.find({ escrow: true });
        var RPCDirectory = require('../Nodes').RPCDirectory;
        var walletlist = Object.keys(RPCDirectory);

        var found = false;
        for (var i = 0; i < walletlist.length; i++) {
            found = false;
            for (var j = 0; j < wallet.length; j++) {
                if (wallet[j].type == walletlist[i].toLowerCase()) {
                    console.log("Escrow wallet found", walletlist[i]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                var RPC = RPCDirectory[walletlist[i]];
                var escrow = await RPC.createEscrow();

                await new Wallets(escrow).save();
                console.log("Escrow wallet created", walletlist[i]);
            }
        }
    } catch (ex) {
        console.log(ex);
        return { result: false, error: ex };
    }
}

//trasnfer, getBalance, deposit address

const getBalance = async (type) => {
    try {
        var wallet = await Wallets.find({ escrow: true, type: type.toLowerCase() });
        if (wallet) {
            var RPCDirectory = require('../Nodes').RPCDirectory;
            var arg = type == "BTC" ? wallet[0].password : wallet[0].publicKey;
            var balance = await RPCDirectory[type].getBalance(arg);
            if (balance.error) {
                return balance;
            }
            else {
                return type == "BTC" ? balance.result : balance;
            }
        }
        else {
            return { error: "Escrow wallet for " + type + " not found!" }
        }
    } catch (ex) {
        return { error: ex.message };
    }
}

const getDepositAddress = async (type) => {
    try {
        var wallet = await Wallets.find({ escrow: true, type: type.toLowerCase() });
        if (wallet) {
            return wallet[0].publicKey;
        }
        else {
            return { error: "Escrow wallet for " + type + " not found!" };
        }
    } catch (ex) {
        return { error: ex.message };
    }
}

const send = async (type, receiver, amount) => {
    var RPCDirectory = require('../Nodes').RPCDirectory;
    try {
        var wallet = await Wallets.find({ escrow: true, type: type.toLowerCase() });
        if (wallet) {
            var arg = type == "BTC" ? wallet[0].password : wallet[0].publicKey;
            var op = await RPCDirectory[type].send(arg, receiver, amount);
            return op;
        }
        else {
            return { error: "Escrow wallet for " + type + " not found!" };
        }
    } catch (ex) {
        return { error: ex.message };
    }
}

module.exports = {
    checkEscrow, getDepositAddress, send, getBalance
};
