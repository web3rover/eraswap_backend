var lightwallet = require('eth-lightwallet');
var keystore = lightwallet.keystore;
var Promise = require('bluebird').Promise;
var fs = Promise.promisifyAll(require('fs'));
var jsonfile = Promise.promisifyAll(require('jsonfile'));
var config = require('../configs/config');
var password = config.ethWalletApi.password;
var KEYSTORE_PATH = __dirname + '/keys.json';

class EthWallet {

    constructor() {
        if (!fs.existsSync(KEYSTORE_PATH)) {
            console.log("Recreating file");
            var createStream = fs.createWriteStream(KEYSTORE_PATH);
            createStream.end();
        }
    }

    async getPrivateKey(publicKey) {
        return new Promise((resolve, reject) => {
            jsonfile.readFileAsync(KEYSTORE_PATH, { throws: false })
                .then(function (PROFILES) {
                    var profiles = PROFILES || {};
                    var privKey = "";
                    for (var email in profiles) {
                        if (profiles[email].address == publicKey) {
                            privKey = (profiles[email].privateKey);
                            break;
                        }
                    }
                    if (privKey == "")
                        reject({ error: "Address does not belong to any wallet." });
                    else
                        resolve({ privateKey: privKey });
                });
        });
    }

    async getAddress(name) {
        var walletExists = await this.walletExists(name);

        if (walletExists) {
            var wallet = await this.getProfile(name);
            return { error: false, data: wallet.address };
        }
        else {
            return { error: "Wallet does not exists!" };
        }
    }

    async createNewWallet(name) {
        try {
            var alreadyExists = await this.walletExists(name);

            if (alreadyExists) {
                return { error: "wallet with name " + name + " already exists!" };
            }

            var seed = await this.generate_seed();

            var ks = await this.createKeystore(seed, password);

            var saved = await this.saveProfile(name, ks.keystore, ks.privateKey, ks.address);

            if (saved) {
                var profile = await this.getProfile(name);
                return { error: null, data: profile };
            }
            else {
                return { error: ("Wallet " + name + "not saved!") };
            }
        } catch (ex) {
            return { error: ex };
        }
    }

    async createKeystore(seed, password) {
        return new Promise(function (resolve, reject) {
            var pwd = Buffer(password).toString('hex');
            keystore.createVault({ password: pwd, hdPathString: "m/44'/60'/0'/0'", seedPhrase: seed }, function (error, ks) {
                if (error) { reject(error); }
                ks.keyFromPassword(pwd, function (error, dKey) {
                    if (error) { reject(error); }
                    ks.generateNewAddress(dKey, 1);
                    var address = `${ks.getAddresses()[0]}`;
                    var privateKey = ks.exportPrivateKey(address, dKey);
                    var keystore = JSON.parse(ks.serialize());
                    resolve({ address, privateKey, keystore });
                });
            });
        });
    }

    async getProfile(name) {
        return new Promise((resolve, reject) => {
            jsonfile.readFileAsync(KEYSTORE_PATH, { throws: false })
                .then(function (PROFILES) {
                    var profiles = PROFILES || {};
                    resolve(profiles[`${name}`]);
                });
        });
    }

    async saveProfile(name, keystore, privateKey, address) {
        return new Promise((resolve, reject) => {
            jsonfile.readFileAsync(KEYSTORE_PATH, { throws: false })
                .then(function (PROFILES) {
                    var profiles = PROFILES || {};
                    profiles[`${name}`] = {
                        keystore,
                        privateKey,
                        address
                    };
                    return profiles;
                })
                .then(function (_profiles) {
                    return jsonfile.writeFileAsync(KEYSTORE_PATH, _profiles, { spaces: 2 });
                })
                .then(function () { resolve(true); })
                .catch(function (error) { reject(error); });
        })
    }

    async generate_seed() {
        var new_seed = lightwallet.keystore.generateRandomSeed();
        return new_seed;
    }

    async walletExists(name) {
        var exists = await this.getProfile(name);
        return exists !== undefined;
    }

}

module.exports = EthWallet;