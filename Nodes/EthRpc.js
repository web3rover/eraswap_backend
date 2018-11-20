const Web3 = require('web3');
const EthWallet = require('./ethWallet');
const web3 = new Web3();
const ethWallet = new EthWallet();

class EthRpc {
    constructor(address) {
        if (!address) {
            throw "Please provide address of node!";
        }
        else {
            this.address = address;
            web3.setProvider(new web3.providers.HttpProvider(address));
        }
    }

    async createWallet(email) {
        var op = await ethWallet.createNewWallet(email);
        if (op.error) {
            return op.error;
        }
        else {
            return op.data;
        }
    }

    async getAddress(email) {
        var op = await ethWallet.getAddress(email);
        return op;
    }

    async getBalance(address) {
        var balance = await web3.eth.getBalance(address);

        return balance;
    }

    async SendEthToEmail(senderEmail, receiverEmail, amount) {
        var senderAddress = "";
        var receiverAddress = "";
        var op = await this.getAddress(senderEmail);
        if (op.error) {
            return op;
        }
        else {
            senderAddress = op.data;
            op = await this.getAddress(receiverEmail);
            if (op.error) {
                return op;
            }
            else {
                receiverAddress = op.data;
                op = await this.sendEthToAddress(senderAddress, receiverAddress, amount);
                return op;
            }
        }
    }

    async sendEthToAddress(sender, receiver, amount) {

        try {

            var op = await ethWallet.getPrivateKey(sender);
            if (op.error) {
                return op;
            }
            else {

                var privateKey = "0x" + op.privateKey;

                var tx = {
                    from: sender,
                    gasPrice: web3.utils.toHex(web3.utils.toWei('21', 'gwei')),
                    gasLimit: web3.utils.toHex(1000000),
                    to: receiver,
                    value: web3.utils.toHex(web3.utils.toWei(amount, "ether")),
                    chainId: 4,
                }

                var signed = await web3.eth.accounts.signTransaction(tx, privateKey);

                var txResult = {};
                var txInfo = await web3.eth.sendSignedTransaction(signed.rawTransaction, function (err, transactionHash) {
                    if (!err) {
                        txResult = { error: false, txHash: transactionHash };
                    }
                    else {
                        txResult = { error: err };
                    }
                });
                return txResult.error ? txResult : {txHash: txResult.txHash, blockInfo: txInfo};
            }
        }
        catch (ex) {
            return { error: ex };
        }
    }

}

module.exports = EthRpc;