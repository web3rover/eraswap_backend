const Web3 = require('web3');
const web3 = new Web3();
const Users = require('../models/Users');
const Wallets = require('../models/Wallets');

class ESTRpc {
    constructor(host, port, tokenContractAddress, Abi) {
        if (!host || !tokenContractAddress || !Abi) {
            throw "Please provide all the parameters!";
        }
        else {
            this.host = host;
            this.port = port;
            this.tokenContractAddress = tokenContractAddress;
            this.Abi = Abi;
            this.tokenContract = {};
            var path = "http://" + this.host + ":" + this.port;
            web3.setProvider(new web3.providers.HttpProvider(path));
            try {
                this.tokenContract = new web3.eth.Contract(this.Abi, this.tokenContractAddress);
            }
            catch (ex) {
                console.log(ex);
            }
        }
    }

    async getAddress(email) {
        try {
            var user = await Users.findOne({ email: email }).populate('wallet');
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'est') {
                    address = user.wallet[i].publicKey;
                    break;
                }
            }
            if (address == "") {
                return { error: "EST wallet not found!" };
            }
            return { data: address };
        } catch (ex) {
            return { error: ex };
        }
    }

    async getBalance(address) {
        try {
            var bal = await this.tokenContract.methods.balanceOf(address).call();
            return bal;
        } catch (ex) {
            return ex;
        }
    }

    async send(sender, receiver, amount) {
        try {
            var superUser = await this._getSuperUserWallet();
            if (!superUser.error) {
                var pwd = await this._getPassword(superUser.data);
                await web3.eth.personal.unlockAccount(superUser.data, pwd, 0);
                var op = await this.tokenContract.methods.transfer(receiver, amount).send({ from: superUser.data });

                return op;
            }
            else {
                return superUser;
            }
        }
        catch (ex) {
            return ex;
        }
    }

    async _getPassword(address) {
        try {
            var wallet = await Wallets.find({ publicKey: address, type: 'est' });
            if (wallet.length >= 1) {
                return wallet[0].password
            }
            return null;
        }
        catch (ex) {
            return ex;
        }
    }

    async _getSuperUserWallet() {
        return new Promise((resolve, reject) => {
            var user = await Users.findOne({ superUser: true }).populate('wallet');
            var address = "";
            if (user) {
                for (var i = 0; i < user.wallet.length; i++) {
                    if (user.wallet[i].type == 'eth') {
                        address = user.wallet[i].publicKey;
                        break;
                    }
                }
                if (address == "") {
                    return { error: "Super user wallet not found for gas fees!" };
                }
                return { data: address };
            }
            else {
                return { error: "Super user not found!" };
            }
        });
    }

}

module.exports = ESTRpc;