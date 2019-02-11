const Web3 = require('web3');
const web3 = new Web3();
const request = require('request');
const Users = require('../models/Users');
const Wallets = require('../models/Wallets');
const Withdrwals = require('../models/Withdrawal');
const BigNumber = require('bignumber.js');
const keythereum = require('keythereum');
const moment = require('moment');
const cryptr = require('../helpers/encrypterDecrypter');
const config = require('../configs/config');

class EthRpc {
    constructor(host, port) {
        if (!host || !port) {
            throw 'Please provide host & port of node!';
        } else {
            this.host = host;
            this.port = port;
            web3.setProvider(new web3.providers.HttpProvider('http://' + host + ':' + port));
        }
    }

    async createWallet(email) {
        try {
            var op = await web3.eth.personal.newAccount(email);

            var keyFile = await this._getPrivateKey(op, email);

            if (!keyFile.error) {
                //return { publicKey: op, privateKey: "0x" + privKey.privateKey, password: email };
                return {
                    publicKey: op,
                    keyObject: keyFile.data,
                    password: email,
                    privateKey: keyFile.privateKey
                };
            } else return keyFile;
        } catch (ex) {
            return ex;
        }
    }

    async createEscrow() {
        try {
            var date = new Date();
            var timestamp = date.getTime();
            var escrow = await this.createWallet('escrow_' + timestamp);
            escrow['type'] = 'eth';
            escrow['escrow'] = true;
            return escrow;
        } catch (ex) {
            return ex;
        }
    }

    async getAddress(email) {
        try {
            var user = await Users.findOne({
                email: email
            }).populate('wallet');
            if (!user) {
                return {
                    error: "User not found!"
                };
            }
            var address = '';
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'eth') {
                    address = user.wallet[i].publicKey;
                    break;
                }
            }
            if (address == '') {
                return {
                    error: 'ETH wallet not found!'
                };
            }
            return {
                data: address
            };
        } catch (ex) {
            return {
                error: ex.message
            };
        }
    }

    async getBalance(address) {
        try {
            var latestBlock = await web3.eth.getBlockNumber();
            if (latestBlock) {
                var balance = await web3.eth.getBalance(address, latestBlock - 15);

                return web3.utils.fromWei(balance, 'ether');
            } else {
                throw {
                    message: "Latest block not found!"
                };
            }
        } catch (ex) {
            return {
                error: ex.message
            };
        }
    }

    async send(sender, receiver, amount, resend, dbTxn) {
        try {

            var balance = await this.getBalance(sender);
            var gasEstimate = await web3.eth.estimateGas({
                from: sender,
                to: receiver
            });
            var gasPrice = await web3.eth.getGasPrice();
            if (gasPrice.error) {
                throw {
                    message: "Could not find gas price. Please try again!"
                };
            }
            var price = new BigNumber(gasPrice).multipliedBy(gasEstimate);
            let amountToSend = new BigNumber(web3.utils.toWei(amount.toString(), 'ether')).minus(price.toString());

            if (!amountToSend.isGreaterThan(BigNumber(0))) {
                throw {
                    message: "Amount is too low!"
                };
            }
            if (new BigNumber(amount.toString()).isGreaterThan(BigNumber(balance.toString()))) {
                console.log("Insufficient balance in the wallet!");
                return {
                    error: "Insufficient balance in the wallet"
                };
            }

            var pwd = await this._getPassword(sender);
            var dbObject = {};
            if (!resend) {
                var withdrwal = new Withdrwals({
                    type: 'ETH',
                    status: 'Pending',
                    txn: {
                        operation: 'send',
                        sender: sender,
                        receiver: receiver,
                        amount: amount,
                        amountReceived: web3.utils.fromWei(amountToSend.toString(), 'ether'),
                    },
                });
                dbObject = await withdrwal.save();
            } else {
                dbObject = dbTxn;
            }

            var nonce = await web3.eth.getTransactionCount(sender, "pending");
            await web3.eth.personal.unlockAccount(sender, pwd, 600);
            web3.eth
                .sendTransaction({
                    nonce: nonce,
                    from: sender,
                    to: receiver,
                    value: amountToSend.toString(),
                    gas: gasEstimate,
                    gasPrice: gasPrice,
                })
                .on('transactionHash', async function (hash) {
                    dbObject['txnHash'] = hash;
                    dbObject['error'] = '';
                    dbObject['status'] = 'Pending';
                    await dbObject.save();
                })
                .on('error', async err => {
                    dbObject['error'] = err.message;
                    dbObject['status'] = 'Error';
                    dbObject['txnHash'] = '';
                    await dbObject.save();
                    console.log(err);
                });

            return {
                success: true,
                dbObject: dbObject
            };
        } catch (ex) {
            return {
                error: ex.message
            };
        }
    }

    async resend(dbObject) {
        if (dbObject) {
            if (dbObject._id) {
                var withdrwal = await Withdrwals.findById(dbObject._id);
                if (withdrwal) {
                    var txn = withdrwal.txn;
                    var op = await this.send(txn.sender, txn.receiver, txn.amount, true, withdrwal);
                    return op;
                } else {}
            } else {}
        } else {}
    }

    //Get private key while user account creation
    async _getPrivateKey(address, password) {
        try {
            var keyObject = await this._parityRpcCall('parity_exportAccount', [address, password]);
            console.log(keyObject);

            var privateKey = keythereum.recover(password, keyObject); //here password is empty string. put the account password
            console.log(privateKey.toString('hex'));
            var encryptedPrivateKey = cryptr.cryptr.encrypt("0x" + privateKey.toString('hex'));
            return {
                data: keyObject,
                privateKey: encryptedPrivateKey
            };
        } catch (ex) {
            return {
                error: ex.message
            };
        }

        // var privateKey = keythereum.recover(password, keyObject);
        // console.log(privateKey);
    }

    //Get private key of registered user from database
    async getPrivateKey(email) {
        try {
            var user = await Users.findOne({
                email: email
            }).populate('wallet');
            var address = '';
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'eth') {
                    address = user.wallet[i].privateKey;
                    break;
                }
            }
            if (!address) {
                return {
                    error: 'ETH wallet not found!'
                };
            }
            var decryptedPrivateKey = cryptr.cryptr.decrypt(address);
            return {
                data: decryptedPrivateKey
            };
        } catch (ex) {
            return {
                error: ex.message
            };
        }
    }

    async _getGasTank() {
        try {
            var gasTank = await Wallets.findOne({
                gasTank: true
            });
            if (gasTank) {
                var balance = await this.getBalance(gasTank.publicKey);
                var decryptedPrivateKey = gasTank.privateKey ? cryptr.cryptr.decrypt(gasTank.privateKey) : "";
                return {
                    publicKey: gasTank.publicKey,
                    balance: balance,
                    privateKey: decryptedPrivateKey
                };
            } else {
                return {
                    error: 'Gas tank not found!'
                };
            }
        } catch (ex) {
            return {
                error: ex.message
            };
        }
    }

    async _getGasForTokenTransfer(gasEstimate, userPublicKey) {
        try {
            var gasTank = await this._getGasTank();
            if (gasTank.error) {
                return gasTank;
            } else {
                if (gasTank.balance > gasEstimate) {
                    var op = await this._supplyGasForTransaction(gasTank.publicKey, gasTank.privateKey, userPublicKey, gasEstimate);

                    return op;
                } else {
                    return {
                        error: 'Insufficient balance in gasTank to send the transaction.'
                    };
                }
            }
        } catch (ex) {
            return {
                error: ex.message
            };
        }
    }

    async _supplyGasForTransaction(sender, privateKey, receiver, amount) {
        try {
            var gasEstimate = await web3.eth.estimateGas({
                from: sender,
                to: receiver
            });
            var gasPrice = await web3.eth.getGasPrice();
            if (gasPrice.error) {
                throw {
                    message: "Could not find gas price. Please try again!"
                };
            }
            var price = new BigNumber(gasPrice);
            if (price.mul)
                price = price.mul(gasEstimate);
            else
                price = price * gasEstimate;
            var gas = parseFloat(web3.utils.fromWei(price.toString(), 'ether'));
            var finalAmount = parseFloat(amount) + gas;
            var op = await this.send(sender, receiver, finalAmount);
            return op;
        } catch (ex) {
            return {
                error: ex.message
            };
        }
    }

    async _createGasTank() {
        try {
            var op = await web3.eth.personal.newAccount('gasTank');

            var privKey = await this._getPrivateKey(op, 'gasTank');
            if (!privKey.error)
                return {
                    publicKey: op,
                    privateKey: privKey.privateKey ? privKey.privateKey : '',
                    keyObject: privKey.data,
                    password: 'gasTank'
                };
            else return privKey;
        } catch (ex) {
            return ex;
        }
    }

    async _getConfirmations(txHash) {
        try {
            // Instantiate web3 with HttpProvider
            const trx = await web3.eth.getTransaction(txHash);

            // Get current block number
            const currentBlock = await web3.eth.getBlockNumber();

            // When transaction is unconfirmed, its block number is null.
            // In this case we return 0 as number of confirmations
            return trx && trx.blockNumber ? currentBlock - trx.blockNumber : 0;
        } catch (error) {
            console.log(error);
        }
    }

    async getHistory(email) {
        try {
            var address = await this.getAddress(email);
            if (address.error) {
                throw "Address not found for email " + email;
            }
            var history = await Withdrwals.find({
                'txn.sender': address.data,
                type: "ETH",
                status: {
                    $ne: "Error"
                },
            });
            var list = [];
            for (var i = 0; i < history.length; i++) {
                list.push({
                    type: "send",
                    address: history[i].txn ? history[i].txn.receiver : "",
                    amount: history[i].txn ? history[i].txn.amount : "",
                    status: history[i].status,
                    txnHash: history[i].txnHash ? history[i].txnHash : "",
                    timeStamp: +new Date(history[i]._id.getTimestamp()),
                });
            }
            list.reverse();
            var incommingTxn = await this.getIncommingTxn(email);
            if (!incommingTxn.error)
                list = list.concat(incommingTxn);
            if (list.length >= 2) {
                list = list.sort((a, b) => (new Date(b.timeStamp) - new Date(a.timeStamp)));
            }
            for (var i = 0; i < list.length; i++) {
                list[i].timeStamp = this.getTimeStamp(new Date(list[i].timeStamp));
            }
            return list;
        } catch (ex) {
            return ex;
        }
    }

    async getIncommingTxn(email) {
        try {
            let publicKey = await this.getAddress(email);
            if (publicKey.data) {
                let options = {
                    url: config.ETHERSCAN.URL + "?module=account&action=txlist&address=" + publicKey.data + "&startblock=0&endblock=99999999&sort=asc&apikey=" + config.ETHERSCAN.ApiKey,
                    method: 'get',
                    headers: {
                        'content-type': 'application/json',
                    },
                };

                return new Promise((resolve, reject) => {
                    request(options, (error, response, body) => {
                        if (error) {
                            reject({
                                error: resJSON.error
                            });
                        } else {
                            let result = body;

                            try {
                                let resJSON = JSON.parse(result).result;
                                if (resJSON.error) {
                                    reject(resJSON.error);
                                } else {
                                    var op = [];
                                    for (var i = 0; i < resJSON.length; i++) {
                                        if (resJSON[i].to == publicKey.data.toLowerCase() && resJSON[i].contractAddress == "") {
                                            op.push({
                                                type: "receive",
                                                address: resJSON[i].from,
                                                amount: web3.utils.fromWei(resJSON[i].value),
                                                status: resJSON[i].confirmations > 14 ? "Confirmed" : "Pending",
                                                txnHash: resJSON[i].hash,
                                                timeStamp: parseInt(resJSON[i].timeStamp) * 1000,
                                            });
                                        }
                                    }
                                    resolve(op);
                                }
                            } catch (ex) {
                                reject({
                                    error: true,
                                    result: result,
                                    message: ex,
                                });
                            }
                        }
                    });
                });

                console.log(op);
            } else {
                throw publicKey;
            }

        } catch (ex) {
            console.log(ex);
            return ex;
        }
    }

    getTimeStamp(date) {
        var momentStr = moment(date).fromNow();
        if (new Date(date).getDate() != new Date().getDate()) {
            return new Date(date).toUTCString();
        } else {
            return momentStr;
        }
    }

    async _parityRpcCall(command, params = [], path = '') {
        if (!params instanceof Array) {
            throw {
                error: true,
                message: 'params must an array'
            };
        } else if (!command) {
            throw {
                error: true,
                message: 'Command can not be null'
            };
        }

        let options = {
            url: 'http://' + this.host + ':' + this.port + path,
            method: 'post',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'curltest',
                method: command,
                params: params
            }),
        };

        return new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    let result = body;
                    let resJSON = null;

                    try {
                        let resJSON = JSON.parse(result).result;
                        if (resJSON.error) {
                            reject(resJSON.error);
                        } else {
                            resolve(resJSON);
                        }
                    } catch (ex) {
                        reject({
                            error: true,
                            result: result,
                            message: ex,
                        });
                    }
                }
            });
        });
    }

    async _getPassword(address) {
        try {
            var wallet = await Wallets.find({
                publicKey: address,
                type: 'eth'
            });
            if (wallet.length >= 1) {
                return wallet[0].password;
            }
            return null;
        } catch (ex) {
            return ex;
        }
    }
}

module.exports = EthRpc;
