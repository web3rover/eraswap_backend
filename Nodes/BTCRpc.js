const request = require('request');

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
                reject(err);
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

    async getBalance(email) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("getbalance", ["*", 1], "/wallet/" + email).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async send(address, sendingWallet, amount) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("sendtoaddress", [address, amount], "/wallet/" + sendingWallet).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async getAddress(email) {
        return new Promise(async (resolve, reject) => {
            var loadOp = await this._loadWallet(email).catch(console.log);
            this._btcRpcCall("getaddressesbylabel", [email], "/wallet/" + email).then(result => {
                if (result.result) {
                    var keys = [];
                    for (var key in result.result)
                        keys.push(key);
                    resolve(keys);
                }
                else {
                    reject(result);
                }
            }).catch(err => {
                reject(err);
            });
        });
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

    async _getPrivateKey(email, publicKey) {
        return new Promise((resolve, reject) => {
            this._btcRpcCall("dumpprivkey", [publicKey], '/wallet/' + email).
                then(res => resolve(res))
                .catch(err => reject(err));
        });
    }

}

module.exports = BTCRpc;