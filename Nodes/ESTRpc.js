const Web3 = require('web3');
const web3 = new Web3();
const Users = require('../models/Users');
const Wallets = require('../models/Wallets');
const EthRpc = require('./EthRpc');
const BigNumber = require('bignumber.js');
const agenda = require('../agenda');
var ethRpc = {};

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
                ethRpc = new EthRpc(this.host, this.port);
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
            return { error: ex.message };
        }
    }

    async getBalance(address) {
        try {
            var bal = await this.tokenContract.methods.balanceOf(address).call();
            return bal;
        } catch (ex) {
            //Returned error: no suitable peers available
            //Couldn't decode uint256 from ABI: 0x
            if (ex.message == "Couldn't decode uint256 from ABI: 0x") {
                return "0";
            }
            else if (ex.message == "Returned error: no suitable peers available") {
                return { error: "Ethereum node is down!" }
            }
            else
                return { error: ex.message };
        }
    }

    async send(sender, receiver, amount) {
        try {
            var gasEstimate = await this.tokenContract.methods.transfer(receiver, amount).estimateGas();
            var gasPrice = await web3.eth.getGasPrice();
            var price = new BigNumber(gasPrice).mul(gasEstimate).mul(11);
            var gas = web3.utils.fromWei(price.toString(), 'ether');

            await agenda.now('supply eth for gas', {
                crypto: 'Est',
                userPublicKey: sender,
                gasEstimate: gas,
                receiver: receiver,
                amount: amount
            });

            return { success: true };
        }
        catch (ex) {
            return { error: ex.message };
        }
    }

    async _initiateTransfer(sender, receiver, amount) {
        try {
            var pwd = await this._getPassword(sender);
            await web3.eth.personal.unlockAccount(sender, pwd, 0);
            var op = await this.tokenContract.methods.transfer(receiver, amount).send({ from: sender });

            return { success: op };
        } catch (ex) {
            return { error: ex.message };
        }
    }

    async sendTokenToEscrow(sender, amount) {
        var superUser = await this._getSuperUserWallet("est");
        if (!superUser.error) {
            var op = await this.send(sender, superUser.data, amount);
            return op;
        }
        else {
            return superUser;
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

    async getPrivateKey(email) {
        try {
            var user = await Users.findOne({ email: email }).populate('wallet');
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'est') {
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
}

module.exports = ESTRpc;