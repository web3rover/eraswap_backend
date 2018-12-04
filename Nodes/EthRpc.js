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

            var privKey = await this._getPrivateKey(op, email);
            privKey = JSON.parse(privKey);
            if (!privKey.error)
                return { publicKey: op, privateKey: "0x" + privKey.privateKey, password: email };
            else
                return privKey;
        } catch (ex) {
            return ex;
        }
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
            return { error: ex.message };
        }
    }

    async getBalance(address) {
        try {
            var balance = await web3.eth.getBalance(address);

            return web3.utils.fromWei(balance, 'ether');
        }
        catch (ex) {
            return { error: ex.message };
        }
    }

    async send(sender, receiver, amount) {

        try {

            var op = await this._getPrivateKey(sender);
            op = JSON.parse(op);
            if (op.error || !op.privateKey) {
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
                        txResult = { txHash: transactionHash };
                    }
                    else {
                        txResult = { error: err.message };
                    }
                });
                return txResult.error ? txResult : { success: true, txHash: txResult.txHash, blockInfo: txInfo };
            }
        }
        catch (ex) {
            return { error: ex.message };
        }
    }

    //Get private key while user account creation
    async _getPrivateKey(address, password) {
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
                if (err || !body) {
                    reject({ error: err });
                }
                else {
                    resolve(body);
                }
            });
        });
    }

    //Get private key of registered user from database
    async getPrivateKey(email) {
        try {
            var user = await Users.findOne({ email: email }).populate('wallet');
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'eth') {
                    address = user.wallet[i].privateKey;
                    break;
                }
            }
            if (!address) {
                return { error: "EST token wallet not found!" };
            }
            return { data: address };
        } catch (ex) {
            return { error: ex.message };
        }
    }

    async _getGasTank() {
        try {
            var gasTank = await Wallets.findOne({ gasTank: true });
            if (gasTank) {
                var balance = await this.getBalance(gasTank.publicKey);
                return { publicKey: gasTank.publicKey, balance: balance, privateKey: gasTank.privateKey }
            }
            else {
                return { error: "Gas tank not found!" };
            }
        } catch (ex) {
            return { error: ex.message };
        }
    }

    async _getGasForTokenTransfer(gasEstimate, userPublicKey) {
        try {
            var userEthBalance = await this.getBalance(userPublicKey);
            if (userEthBalance >= gasEstimate) {
                return {};
            }
            var gasTank = await this._getGasTank();
            if (gasTank.error) {
                return gasTank;
            }
            else {
                if (gasTank.balance > gasEstimate) {
                    var amount = gasEstimate - userEthBalance;
                    var op = await this._supplyGasForTransaction(gasTank.publicKey, gasTank.privateKey, userPublicKey, amount.toFixed(18).toString());
                    return op;
                } else {
                    return { error: "Insufficient balance in gasTank to send the transaction." };
                }
            }
        } catch (ex) {
            return { error: ex.message };
        }
    }

    async _supplyGasForTransaction(publicKey, privateKey, userPublicKey, amount) {
        try {
            var tx = {
                from: publicKey,
                gasPrice: web3.utils.toHex(web3.utils.toWei('21', 'gwei')),
                gasLimit: web3.utils.toHex(1000000),
                to: userPublicKey,
                value: web3.utils.toHex(web3.utils.toWei(amount, "ether")),
                chainId: 4,
            }

            var signed = await web3.eth.accounts.signTransaction(tx, privateKey);

            var txResult = {};
            var txInfo = await web3.eth.sendSignedTransaction(signed.rawTransaction, function (err, transactionHash) {
                if (!err) {
                    txResult = { txHash: transactionHash };
                }
                else {
                    txResult = { error: err.message };
                }
            });
            return txResult.error ? txResult : { success: true, txHash: txResult.txHash, blockInfo: txInfo };
        }
        catch (ex) {
            return { error: ex.message };
        }
    }

    async _createGasTank() {
        try {
            var op = await web3.eth.personal.newAccount('gasTank');

            var privKey = await this._getPrivateKey(op, 'gasTank');
            privKey = JSON.parse(privKey);
            if (!privKey.error)
                return { publicKey: op, privateKey: "0x" + privKey.privateKey, password: 'gasTank' };
            else
                return privKey;
        } catch (ex) {
            return ex;
        }
    }

    async _getConfirmations(txHash) {
        try {
            // Instantiate web3 with HttpProvider
            const trx = await web3.eth.getTransaction(txHash)

            // Get current block number
            const currentBlock = await web3.eth.getBlockNumber()

            // When transaction is unconfirmed, its block number is null.
            // In this case we return 0 as number of confirmations
            return trx.blockNumber === null ? 0 : currentBlock - trx.blockNumber
        }
        catch (error) {
            console.log(error)
        }
    }

}

module.exports = EthRpc;