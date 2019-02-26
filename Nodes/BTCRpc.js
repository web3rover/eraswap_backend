const request = require('request');
const Users = require('../models/Users');
const Withdrwals = require('../models/Withdrawal');
const config = require('../configs/config');
const moment = require('moment');
const cryptr = require('../helpers/encrypterDecrypter');


class BTCRpc {
    constructor(host, port, username, password) {
        if (!host || !port || !username || !password) {
            throw {
                status: 200,
                message: "Please provide all parameters!"
            };
        } else {
            this.host = host;
            this.port = port;
            this.username = username;
            this.password = password;
        }
    }

    async createWallet(email) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("createwallet", [email]).then((res) => {
                this._getNewAddressForWallet(email).then(res => {
                    var wallet = {
                        publicKey: res.result,
                        password: email
                    };
                    this._getPrivateKey(email, res.result).then(op => {
                        var encryptedPrivateKey = cryptr.cryptr.encrypt(op.result);
                        wallet["privateKey"] = encryptedPrivateKey;
                        resolve(wallet);
                    }).catch(err =>
                        reject(err));
                }).catch(err =>
                    reject(err));
            }).catch(err => {
                if (err.message.toString().indexOf("already exists") != -1) {
                    this.recoverWallet(email).then(res => {
                            console.log(res);
                            resolve(res);
                        })
                        .catch(err => reject(err));
                } else {
                    reject(err);
                }
            });
        });
    }

    async recoverWallet(email) {
        return new Promise((resolve, reject) => {
            this._getNewAddressForWallet(email).then(res => {
                var wallet = {
                    publicKey: res.result,
                    password: email
                };
                this._getPrivateKey(email, res.result).then(op => {
                    wallet["privateKey"] = op.result;
                    resolve(wallet);
                }).catch(err =>
                    reject(err));
            }).catch(err =>
                reject(err));
        });
    }

    async importPrivateKey(email) {
        var privateKeyFromDb = await this.getPrivateKey(email);
        if (privateKeyFromDb.error) {
            console.log(privateKeyFromDb);
            return privateKeyFromDb;
        } else {
            privateKeyFromDb = privateKeyFromDb.data;
        }
        return new Promise((resolve, reject) => {
            this._btcRpcCall("importprivkey", [privateKeyFromDb, email, false]).then((res) => {
                console.log(res);
                resolve(res);
            }).catch(err => {
                console.log(err);
                reject(err);
            });
        });
    }

    async getHistory(email) {
        try {
            var history = await Withdrwals.find({
                'txn.sender': email,
                type: "BTC",
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
            var publicKey = await this.getAddress(email);
            if (publicKey.data) {
                publicKey = publicKey.data;
            } else {
                throw publicKey;
            }
            return new Promise((resolve, reject) => {
                var options = {
                    url: config.BLOCKCYPHER.URL + "addrs/" + publicKey + "/full",
                    method: 'get',
                    headers: {
                        'content-type': 'application/json',
                    },
                }
                request(options, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        let result = body;

                        try {
                            let resJSON = JSON.parse(result);
                            if (resJSON.error) {
                                reject({
                                    error: resJSON.error
                                });
                            } else {
                                var txn = resJSON.txs;
                                var addr = resJSON.address;
                                if (txn.length > 0) {
                                    var op = [];
                                    for (var i = 0; i < txn.length; i++) {
                                        let outputs = txn[i].outputs;
                                        for (var j = 0; j < outputs.length; j++) {
                                            let addresses = outputs[j].addresses;
                                            for (var k = 0; k < addresses.length; k++) {
                                                if (addresses[k] == addr) {
                                                    if (txn[i].inputs[0].addresses) {
                                                        op.push({
                                                            timeStamp: +new Date(txn[i].confirmed),
                                                            type: "receive",
                                                            address: txn[i].inputs[0].addresses[0],
                                                            amount: outputs[j].value / 1e8,
                                                            status: txn[i].confirmations > 6 ? "Confirmed" : "Pending",
                                                            txnHash: txn[i].hash,
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    resolve(op);
                                } else {
                                    resolve([]);
                                }
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

    async createEscrow() {
        try {
            var date = new Date();
            var timestamp = date.getTime();
            var escrow = await this.createWallet("escrow_" + timestamp);
            escrow["escrow"] = true;
            escrow["type"] = "btc";
            return escrow;
        } catch (ex) {
            return ex;
        }
    }

    async getBalance(email) {
        try {
            await this._loadWallet(email);
        } catch (ex) {
            //console.log(ex);
        }
        return new Promise((resolve, reject) => {
            this._btcRpcCall("getbalance", ["*", 6], "/wallet/" + email).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async send(sendingWallet, address, amount, dbObject) {
        try {
            console.log("Send BTC->", sendingWallet, address, amount);
            var balance = await this.getBalance(sendingWallet);
            if (balance < amount) {
                console.log("Insufficient balance in the wallet!");
                return {
                    error: "Insufficient balance in the wallet"
                };
            }

            if (dbObject) {
                var withdrwal = await Withdrwals.findById(dbObject._id);
                dbObject = withdrwal;
            } else {
                var withdrwal = new Withdrwals({
                    type: 'BTC',
                    status: 'Pending',
                    txn: {
                        operation: 'send',
                        sender: sendingWallet,
                        receiver: address,
                        amount: amount,
                    },
                });
                dbObject = await withdrwal.save();
            }

            // var currentFeeRate = await this._btcRpcCall("estimatesmartfee", [6]);
            // console.log("Current FeeRate: ", currentFeeRate.result.feerate);

            // var modifiedFeeRate = currentFeeRate.result.feerate * config.NODES.btc.feeIncreaseFactor;
            // modifiedFeeRate = Math.round((modifiedFeeRate * 1e6)) / 1e6;
            // console.log("Modified FeeRate: ", modifiedFeeRate);

            // if (!isNaN(modifiedFeeRate)){
            //     op = await this._btcRpcCall("settxfee", [modifiedFeeRate], '/wallet/' + sendingWallet);
            //     console.log(op.result);
            // }

            return new Promise((resolve, reject) => {
                this._btcRpcCall("sendtoaddress", [address, amount, "", "", true], "/wallet/" + sendingWallet).then(async result => {
                    result["success"] = true;

                    dbObject["txnHash"] = result.result;
                    dbObject['error'] = '';
                    dbObject['status'] = 'Pending';
                    dbObject = await dbObject.save();

                    let txn = await this._getTransaction(result.result);
                    let amountReceived = parseFloat(amount) + parseFloat(txn.fee.toString());

                    dbObject.txn["amountReceived"] = amountReceived;
                    dbObject = await dbObject.save();

                    result["dbObject"] = dbObject;
                    resolve(result);
                }).catch(async err => {

                    dbObject['error'] = err.message;
                    dbObject['status'] = 'Error';
                    dbObject['txnHash'] = '';
                    await dbObject.save();

                    reject(err);
                });
            });
        } catch (ex) {
            return ex;
        }
    }

    async getAddress(email) {
        try {
            var user = await Users.findOne({
                email: email
            }).populate('wallet');
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'btc') {
                    address = user.wallet[i].publicKey;
                    break;
                }
            }
            if (address == "") {
                return {
                    error: "BTC wallet creation in progress!"
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

    async _loadWallet(email) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("loadwallet", [email]).then((res) => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async _getConfirmations(txHash) {
        try {
            // Instantiate web3 with HttpProvider
            const trx = await this._getTransaction(txHash);

            return trx ? trx.confirmations : 0;
        } catch (error) {
            console.log(error);
        }
    }

    async _getTransaction(txnHash, sender) {
        try {
            if (!sender) {
                var withdrwal = await Withdrwals.findOne({
                    txnHash: txnHash
                });
                if (!withdrwal) {
                    throw "Database entry for transaction not found.";
                }
                sender = withdrwal.txn.sender;
            }
            return new Promise((resolve, reject) => {
                this._btcRpcCall("gettransaction", [txnHash], "/wallet/" + sender).then((res) => {
                    resolve(res.result);
                }).catch(err => {
                    reject(err);
                });
            });

        } catch (error) {
            console.log(error);
        }
    }

    async getPrivateKey(email) {
        try {
            var user = await Users.findOne({
                email: email
            }).populate('wallet');
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'btc') {
                    address = user.wallet[i].privateKey;
                    break;
                }
            }
            if (!address) {
                return {
                    error: "BTC wallet creation in progress!"
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

    async _getPrivateKey(email, publicKey) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("dumpprivkey", [publicKey], '/wallet/' + email).
            then(res => resolve(res))
                .catch(err => reject(err));
        });
    }

    async _btcRpcCall(command, params = [], path = "") {

        if (!params instanceof Array) {
            throw {
                error: true,
                message: "params must an array"
            };
        } else if (!command) {
            throw {
                error: true,
                message: "Command can not be null"
            };
        }

        let options = {
            url: "http://" + this.host + ":" + this.port + path,
            method: "post",
            headers: {
                "content-type": "text/plain"
            },
            auth: {
                user: this.username,
                pass: this.password
            },
            body: JSON.stringify({
                "jsonrpc": "1.0",
                "id": "curltest",
                "method": command,
                "params": params
            })
        };

        return new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    let result = body;
                    let resJSON = null;

                    try {
                        let resJSON = JSON.parse(result);
                        if (resJSON.error) {
                            reject(resJSON.error);
                        } else {
                            resolve(resJSON);
                        }
                    } catch (ex) {
                        reject({
                            error: true,
                            result: result,
                            message: ex
                        });
                    }
                }
            });
        });
    }

    async _unloadWallet(email) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("unloadwallet", [email], '/wallet/' + email).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async _getNewAddressForWallet(email) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("getnewaddress", [email], '/wallet/' + email).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

}

module.exports = BTCRpc;