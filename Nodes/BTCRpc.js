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

    async BtcRpcCall(command, params = [], path = "") {

        if (!params instanceof Array) {
            throw { error: true, message: "params must an array" };
        }
        else if (!command) {
            throw { error: true, message: "Command can not be null" };
        }

        let options = {
            url: this.host + ":" + this.port + path,
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


    async CreateWallet(email) {
        return new Promise((resolve, reject) => {
            this.BtcRpcCall("createwallet", [email]).then((res) => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async UnloadWallet(email) {
        return new Promise((resolve, reject) => {
            this.BtcRpcCall("unloadwallet", [email], '/wallet/' + email).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async GetNewAddressForWallet(email) {
        return new Promise((resolve, reject) => {
            this.BtcRpcCall("getnewaddress", [email], '/wallet/' + email).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async GetBalanceForWallet(email) {
        return new Promise((resolve, reject) => {
            this.BtcRpcCall("getbalance", ["*", 1], "/wallet/" + email).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async SendBtcToEmail(senderEmail, receiverEmail, amount) {
        return new Promise((resolve, reject) => {
            this.GetAddressesForWallet(receiverEmail).then(result => {
                if (result instanceof Array) {
                    if (result.length >= 1) {
                        this.SendBtcToAddress(result[0], senderEmail, amount).then(txnInfo => resolve(txnInfo))
                            .catch(error => reject(error));
                    }
                    else {
                        reject({
                            error: true,
                            message: "No address exists for receiver."
                        });
                    }
                } else {
                    reject({
                        error: true,
                        message: "Unexpectederror occured",
                        error: result
                    });
                }
            }).catch(err => {
                reject(err);
            });
        });
    }

    async SendBtcToAddress(address, sendingWallet, amount) {
        return new Promise((resolve, reject) => {
            this.BtcRpcCall("sendtoaddress", [address, amount], "/wallet/" + sendingWallet).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async GetAddressesForWallet(email) {
        return new Promise((resolve, reject) => {
            this.BtcRpcCall("getaddressesbylabel", [email], "/wallet/" + email).then(result => {
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

}

module.exports = BTCRpc;