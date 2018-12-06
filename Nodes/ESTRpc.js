const Web3 = require('web3');
const web3 = new Web3();
const Users = require('../models/Users');
const Wallets = require('../models/Wallets');
const EthRpc = require('./EthRpc');
const BigNumber = require('bignumber.js');
const Withdrwals = require('../models/Withdrawal');
const estConfig = require('../configs/config').NODES.est;
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

    async createEscrow() {
        try {
            var escrow = await ethRpc.createEscrow();
            escrow["type"] = "est";
            return escrow;
        } catch (ex) {
            return ex;
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

    async getHistory(email) {
        try {
            var address = await this.getAddress(email);
            if (address.error) {
                throw "Address not found for email " + email;
            }
            var history = await Withdrwals.find({ 'txn.sender': address.data, type: "Est" });
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

    async send(sender, receiver, amount) {
        try {
            var data = await this.tokenContract.methods.transfer(receiver, amount).encodeABI();
            var gasEstimate = await web3.eth.estimateGas({ from: sender, to: this.tokenContractAddress, data: data });
            var gasPrice = await web3.eth.getGasPrice();

            var price = new BigNumber(gasPrice).mul(gasEstimate);
            var gas = web3.utils.fromWei(price.toString(), 'ether');

            var wallet = await Wallets.findOne({ publicKey: sender, type: "est" }).populate('owner');
            if (!wallet) {
                throw "User not found!";
            }
            var withdrwal = new Withdrwals(
                {
                    type: "Est",
                    status: "Pending",
                    gasDetails: {
                        gasEstimate: gasEstimate,
                        gasPrice: gasPrice,
                    },
                    txn: {
                        operation: "_initiateTransfer",
                        sender: sender,
                        receiver: receiver,
                        amount: amount,
                    }
                }
            );
            var dbObject = await withdrwal.save();


            var agenda = require('../agenda');
            await agenda._ready;
            await agenda.schedule('in 7 seconds', 'supply eth for gas', {
                crypto: 'Est',
                userPublicKey: sender,
                gasEstimate: gas,
                receiver: receiver,
                amount: amount,
                dbObject: dbObject,
            });

            return { success: true };
        }
        catch (ex) {
            return { error: ex.message };
        }
    }

    async _initiateTransfer(sender, receiver, amount, dbObject) {
        try {
            var pwd = await this._getPassword(sender);
            await web3.eth.personal.unlockAccount(sender, pwd, null);

            dbObject = await Withdrwals.findById(dbObject._id.toString());
            dbObject["txn"] = {
                operation: "_initiateTransfer",
                sender: sender,
                receiver: receiver,
                amount: amount,
            };
            await dbObject.save();

            var gasDetails = dbObject.gasDetails;

            if (!dbObject.txnHash) {
                this.tokenContract.methods.transfer(receiver, amount).send({
                    from: sender, gasPrice: gasDetails.gasPrice,
                    gas: gasDetails.gasEstimate
                })
                    .on('transactionHash', async function (hash) {
                        dbObject["txnHash"] = hash;
                        dbObject["error"] = "";
                        dbObject["status"] = "Pending";
                        await dbObject.save();
                    }).
                    on('error', async (err) => {
                        dbObject["error"] = err.message;
                        dbObject["status"] = "Error";
                        dbObject["txnHash"] = "";
                        await dbObject.save();
                        console.log(err);
                    });
            }
            return { success: true }

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

module.exports = ESTRpc;