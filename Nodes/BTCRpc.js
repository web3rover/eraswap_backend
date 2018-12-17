const request = require('request');
const Users = require('../models/Users');
const Withdrwals = require('../models/Withdrawal');
const Wallets = require('../models/Wallets');

class BTCRpc {
    constructor(host, port, username, password) {
        if (!host || !port || !username || !password) {
            throw "Please provide all parameters!";
        }
        else {
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
                    var wallet = { publicKey: res.result, password: email };
                    this._getPrivateKey(email, res.result).then(op => {
                        wallet["privateKey"] = op.result;
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
                var wallet = { publicKey: res.result, password: email };
                this._getPrivateKey(email, res.result).then(op => {
                    wallet["privateKey"] = op.result;
                    resolve(wallet);
                }).catch(err =>
                    reject(err));
            }).catch(err =>
                reject(err));
        });
    }

    async getHistory(email) {
        try {
            var history = await Withdrwals.find({ 'txn.sender': email, type: "BTC" });
            var list = [];
            for (var i = 0; i < history.length; i++) {
                list.push({
                    receiver: history[i].txn ? history[i].txn.receiver : "",
                    amount: history[i].txn ? history[i].txn.amount : "",
                    status: history[i].status,
                    txnHash: history[i].txnHash ? history[i].txnHash : "",
                });
            }
            return list;
        } catch (ex) {
            return ex;
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
            console.log(ex);
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

            return new Promise((resolve, reject) => {
                this._btcRpcCall("sendtoaddress", [address, amount], "/wallet/" + sendingWallet).then(async result => {
                    result["success"] = true;

                    dbObject["txnHash"] = result.result;
                    dbObject['error'] = '';
                    dbObject['status'] = 'Pending';
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
            var user = await Users.findOne({ email: email }).populate('wallet');
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'btc') {
                    address = user.wallet[i].publicKey;
                    break;
                }
            }
            if (address == "") {
                return { error: "ETH wallet not found!" };
            }
            return { data: address };
        } catch (ex) {
            return { error: ex.message };
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

    async _getTransaction(txnHash) {
        try {
            var withdrwal = await Withdrwals.findOne({ txnHash: txnHash });
            if (withdrwal) {

                return new Promise((resolve, reject) => {
                    this._btcRpcCall("gettransaction", [txnHash], "/wallet/" + withdrwal.txn.sender).then((res) => {
                        resolve(res.result);
                    }).catch(err => {
                        reject(err);
                    });
                });
            }
            else {
                throw "Database entry for transaction not found.";
            }
        } catch (error) {
            console.log(error);
        }
    }

    async getPrivateKey(email) {
        try {
            var user = await Users.findOne({ email: email }).populate('wallet');
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'btc') {
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

    async _getPrivateKey(email, publicKey) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("dumpprivkey", [publicKey], '/wallet/' + email).
                then(res => resolve(res))
                .catch(err => reject(err));
        });
    }

    async _btcRpcCall(command, params = [], path = "") {

        if (!params instanceof Array) {
            throw { error: true, message: "params must an array" };
        }
        else if (!command) {
            throw { error: true, message: "Command can not be null" };
        }

        let options = {
            url: "http://" + this.host + ":" + this.port + path,
            method: "post",
            headers:
                {
                    "content-type": "text/plain"
                },
            auth: {
                user: this.username,
                pass: this.password
            },
            body: JSON.stringify({ "jsonrpc": "1.0", "id": "curltest", "method": command, "params": params })
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
                        }
                        else {
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