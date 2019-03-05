const Web3 = require('web3');
const web3 = new Web3();
const Users = require('../models/Users');
const Wallets = require('../models/Wallets');
const EthRpc = require('./EthRpc');
const request = require('request');
const BigNumber = require('bignumber.js');
const Withdrwals = require('../models/Withdrawal');
const Coins = require('../models/Coins');
const moment = require('moment');
const cryptr = require('../helpers/encrypterDecrypter');
const config = require('../configs/config');
var ethRpc = {};

class ESTRpc {
    constructor(host, port, tokenContractAddress, Abi) {
        if (!host || !tokenContractAddress || !Abi) {
            throw "Please provide all the parameters!";
        } else {
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
            } catch (ex) {
                console.log(ex);
            }
        }
    }

    async createWallet(email) {
        try {
            var op = await web3.eth.personal.newAccount(email);

            var keyFile = await ethRpc._getPrivateKey(op, email);

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
            var escrow = await ethRpc.createEscrow();
            escrow["type"] = "est";
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
            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'est') {
                    address = user.wallet[i].publicKey;
                    break;
                }
            }
            if (address == "") {
                return {
                    error: "EST wallet creation in progress!"
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
            var bal = await this.tokenContract.methods.balanceOf(address).call();
            bal = new BigNumber(bal).dividedBy(1e8);
            return bal;
        } catch (ex) {
            //Returned error: no suitable peers available
            //Couldn't decode uint256 from ABI: 0x
            if (ex.message == "Couldn't decode uint256 from ABI: 0x") {
                return "0";
            } else if (ex.message == "Returned error: no suitable peers available") {
                return {
                    error: "Ethereum node is down!"
                }
            } else
                return {
                    error: ex.message
                };
        }
    }

    async getHistory(email) {
        try {
            var address = await this.getAddress(email);
            if (address.error) {
                throw "Address not found for email " + email;
            }
            //User.find( { $or:[ {'_id':objId}, {'name':param}, {'nickname':param} ]},
            var history = await Withdrwals.find({
                $or: [{
                    'txn.sender': address.data
                }, {
                    'txn.sender': address.data.toString().toLowerCase()
                }],
                type: "EST",
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
                    url: config.ETHERSCAN.URL + "?module=account&action=tokentx&address=" + publicKey.data + "&startblock=0&endblock=99999999&sort=asc&apikey=" + config.ETHERSCAN.ApiKey,
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
                                        if (resJSON[i].to == publicKey.data.toLowerCase() && resJSON[i].contractAddress == config.NODES.est.contractAddress.toLowerCase()) {
                                            op.push({
                                                type: "receive",
                                                address: resJSON[i].from,
                                                amount: new BigNumber(resJSON[i].value).dividedBy(1e8),
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

    async send(sender, receiver, amount) {
        try {
            console.log("Send EST->", sender, receiver, amount);
            receiver = receiver.toString().toLowerCase();
            var balance = await this.getBalance(sender);
            console.log("Got balance", balance);
            if (balance < amount) {
                console.log("Insufficient balance in the wallet!");
                return {
                    error: "Insufficient balance in the wallet"
                };
            }

            var data = await this.tokenContract.methods.transfer(receiver, this.safeToWei(amount)).encodeABI();
            var contractGasLimit = await web3.eth.estimateGas({
                from: sender,
                to: this.tokenContractAddress,
                data: data
            });
            var gasPrice = await web3.eth.getGasPrice();
            if (gasPrice.error) {
                throw {
                    message: "Could not find gas price. Please try again!"
                };
            }
            console.log("gas price", gasPrice);

            let amountOfTokenToDeduct =  new BigNumber(21000)
                .multipliedBy(gasPrice)
                .plus(new BigNumber(gasPrice).multipliedBy(contractGasLimit).multipliedBy(2)).dividedBy(1e18)
                .toNumber();

            console.log("amount Of Token To Deduct", amountOfTokenToDeduct);

            let estPrice = await this._getCoinRate('EST');
            let ethPrice = await this._getCoinRate('ETH');

            console.log("eth price", ethPrice, "est price", estPrice);

            let deductionInEST = (amountOfTokenToDeduct * ethPrice / estPrice);

            console.log("deduction In EST", deductionInEST);

            let amountToSend = parseFloat(amount) - deductionInEST;

            console.log("amount To Send", amountToSend);

            if (amountToSend < 0) throw {
                message: "Amount too low to send!"
            }

            var wallet = await Wallets.findOne({
                publicKey: sender,
                type: "est"
            });
            if (!wallet) {
                throw {
                    message: "EST wallet creation in progress!"
                };
            }

            var estEscrowAddress = await require('../controllers/escrow.cont').getDepositAddress('EST');
            if (estEscrowAddress.error) throw {
                message: estEscrowAddress.error
            }

            console.log("est Escrow Address", estEscrowAddress);

            data = await this.tokenContract.methods.transfer(receiver, this.safeToWei(amountToSend)).encodeABI();
            var firstTxnGasLimit = await web3.eth.estimateGas({
                from: sender,
                to: this.tokenContractAddress,
                data: data
            });

            data = await this.tokenContract.methods.transfer(estEscrowAddress, this.safeToWei(deductionInEST)).encodeABI();
            var secondTxnGasLimit = await web3.eth.estimateGas({
                from: sender,
                to: this.tokenContractAddress,
                data: data
            });

            let gasInEthForTokenTxn = new BigNumber(firstTxnGasLimit)
                .multipliedBy(gasPrice)
                .plus(new BigNumber(gasPrice).multipliedBy(secondTxnGasLimit)).dividedBy(1e18)
                .toNumber();

            console.log("gas In Eth For Token Txn", gasInEthForTokenTxn);

            var withdrwal = new Withdrwals({
                type: "EST",
                status: "Pending",
                gasDetails: {
                    gasEstimate: firstTxnGasLimit,
                    feeGasEstimate: secondTxnGasLimit,
                    gasPrice: gasPrice,
                    gasInEst: deductionInEST,
                },
                txn: {
                    operation: "_initiateTransfer",
                    sender: sender,
                    receiver: receiver,
                    amount: amount,
                    amountReceived: amountToSend,
                }
            });
            var dbObject = await withdrwal.save();

            console.log("dbObject", dbObject);

            var agenda = require('../agenda');
            await agenda._ready;
            await agenda.schedule('in 7 seconds', 'supply eth for gas', {
                crypto: 'EST',
                userPublicKey: sender,
                gasEstimate: gasInEthForTokenTxn,
                receiver: receiver,
                amount: amount,
                dbObject: dbObject,
            });

            return {
                success: true,
                dbObject: dbObject
            };
        } catch (ex) {
            console.log(ex);
            if(ex){
                if(ex.message){
                    ex.message = ex.message.toString().indexOf("address which can't be converted") != -1 ? "Invalid Address" : ex.message;
                }
            }
            return {
                error: ex.message
            };
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
                //Send to receiver
                var nonce = await web3.eth.getTransactionCount(sender, "pending");
                this.tokenContract.methods.transfer(receiver, this.safeToWei(amount)).send({
                        nonce: nonce,
                        from: sender,
                        gasPrice: gasDetails.gasPrice,
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
            return {
                success: true
            }

        } catch (ex) {
            return {
                error: ex.message
            };
        }
    }

    async _initiateFeeTransfer(sender, dbObject) {
        var balance = await this.getBalance(sender);
        console.log("Balance (EST)", balance);
        var pwd = await this._getPassword(sender);
        await web3.eth.personal.unlockAccount(sender, pwd, null);

        var estEscrowAddress = await require('../controllers/escrow.cont').getDepositAddress('EST');
        if (estEscrowAddress.error) throw {
            message: estEscrowAddress.error
        }

        dbObject = await Withdrwals.findById(dbObject._id.toString());

        var gasDetails = dbObject.gasDetails;
        console.log("amount to send (EST)", gasDetails.gasInEst.toString());

        //Send to escrow for fees
        let amountInWei = this.safeToWei(gasDetails.gasInEst);
        console.log("amount in wei (EST)", amountInWei);
        var nonce = await web3.eth.getTransactionCount(sender, "pending");
        this.tokenContract.methods.transfer(estEscrowAddress, amountInWei).send({
                //nonce: nonce,
                from: sender,
                gasPrice: gasDetails.gasPrice,
                gas: gasDetails.feeGasEstimate
            })
            .on('transactionHash', async function (hash) {
                dbObject["feeTxnHash"] = hash;
                dbObject["feeError"] = "",
                    await dbObject.save();
                console.log('Fees sent to escrow.');
            }).
        on('error', async (err) => {
            dbObject["feeError"] = err.message;
            await dbObject.save();
            console.log(err.message);
        });
    }

    async _getPassword(address) {
        try {
            var wallet = await Wallets.find({
                publicKey: address,
                type: 'est'
            });
            if (wallet.length >= 1) {
                return wallet[0].password
            }
            return null;
        } catch (ex) {
            return ex;
        }
    }

    async getPrivateKey(email) {
        try {
            var user = await Users.findOne({
                email: email
            }).populate('wallet');

            var address = "";
            for (var i = 0; i < user.wallet.length; i++) {
                if (user.wallet[i].type == 'est') {
                    address = user.wallet[i].privateKey;
                    break;
                }
            }
            if (!address) {
                return {
                    error: "EST wallet creation in progress!"
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

    async _getConfirmations(txHash) {
        try {
            // Instantiate web3 with HttpProvider
            const trx = await web3.eth.getTransaction(txHash)

            // Get current block number
            const currentBlock = await web3.eth.getBlockNumber()

            // When transaction is unconfirmed, its block number is null.
            // In this case we return 0 as number of confirmations
            return trx.blockNumber === null ? 0 : currentBlock - trx.blockNumber
        } catch (error) {
            console.log(error)
        }
    }

    async _getCoinRate(coin) {
        try {
            const data = await Coins.findOne({
                name: 'coinData',
                in: 'USD'
            }).select(coin).exec();
            return data[coin];
        } catch (ex) {
            console.log(ex);
            return ex;
        }
    };

    safeToWei(amount) {
        try {
            let safeAmount = amount;
            console.log("safeAmount", safeAmount);
            let parts = safeAmount.toString().split('.');
            if (parts.length > 1) {
                if (parts[1].toString().length > 8) {
                    safeAmount = amount.toFixed(8);
                }
            }
            let retVal = new BigNumber(safeAmount).multipliedBy(1e8)
            return retVal.toNumber();
        } catch (ex) {
            console.log(ex);
            return NaN;
        }
    }

}

module.exports = ESTRpc;