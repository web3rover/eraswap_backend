const Web3 = require('web3');
const web3 = new Web3();
const request = require('request');
const Users = require('../models/Users');
const Wallets = require('../models/Wallets');

class EthRpc {
    constructor(host, port) {
        if (!host || !port) {
            throw "Please provide host & port of node!";
        }
        else {
            this.host = host;
            this.port = port;
            web3.setProvider(new web3.providers.HttpProvider("http://" + host + ":" + port));
        }
    }

    async createWallet(email) {
        try {
            var op = await web3.eth.personal.newAccount(email);

            var privKey = await this.getPrivateKey(op, email);

            if (!privKey.error)
                return { publicKey: op, privateKey: JSON.parse(privKey).privateKey, password: email };
            else
                return privKey;
        } catch (ex) {
            return ex;
        }
    }

    async getPrivateKey(address, password) {

        var postData = {
            address: address,
            password: password
        };

        var op = {};

        return new Promise((resolve, reject) => {
            require('request').post({
                uri: "http://" + this.host + ":" + 8080 + "/getPrivateKey",
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: require('querystring').stringify(postData)
            }, function (err, res, body) {
                if (err) {
                    reject({ error: err });
                }
                else {
                    resolve(body);
                }
            });
        });
    }

    async getAddress(email) {
        try {
            var user = await Users.findOne({ email: email }).populate('wallet');
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'eth') {
                    address = user.wallet[i].publicKey;
                    break;
                }
            }
            if (address == "") {
                return { error: "Eth wallet not found!" };
            }
            return { data: address };
        } catch (ex) {
            return { error: ex };
        }
    }

    async getBalance(address) {
        var balance = await web3.eth.getBalance(address);

        return balance;
    }

    async send(sender, receiver, amount) {

        try {

            var op = await this.getPrivateKey(sender);
            if (op.error) {
                return op;
            }
            else {

                var privateKey = "0x" + op.privateKey;

                var tx = {
                    from: sender,
                    gasPrice: web3.utils.toHex(web3.utils.toWei('21', 'gwei')),
                    gasLimit: web3.utils.toHex(1000000),
                    to: receiver,
                    value: web3.utils.toHex(web3.utils.toWei(amount, "ether")),
                    chainId: 4,
                }

                var signed = await web3.eth.accounts.signTransaction(tx, privateKey);

                var txResult = {};
                var txInfo = await web3.eth.sendSignedTransaction(signed.rawTransaction, function (err, transactionHash) {
                    if (!err) {
                        txResult = { error: false, txHash: transactionHash };
                    }
                    else {
                        txResult = { error: err };
                    }
                });
                return txResult.error ? txResult : { txHash: txResult.txHash, blockInfo: txInfo };
            }
        }
        catch (ex) {
            return { error: ex };
        }
    }

}

module.exports = EthRpc;