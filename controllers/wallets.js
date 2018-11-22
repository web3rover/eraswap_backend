const Users = require('../models/Users');
const Wallets = require('../models/Wallets');
const nodes = require('../configs/config').NODES;
const BTCRpc = require('../Nodes/BTCRpc');
const ETHRpc = require('../Nodes/EthRpc');

const btcRpc = new BTCRpc(nodes.btc.host, nodes.btc.port, nodes.btc.username, nodes.btc.password);
const ethRpc = new ETHRpc(nodes.eth.host, nodes.eth.port);

const createWallets = async body => {
    try {
        var btcWallet = await btcRpc.createWallet(body.email);

        var btcWalletDoc = await new Wallets({
            type: 'btc',
            privateKey: btcWallet.privateKey,
            publicKey: btcWallet.publicKey,
            password: body.email,
            owner: body._id
        }).save();

        var ethWallet = await ethRpc.createWallet(body.email);

        var ethWalletDoc = await new Wallets({
            type: 'eth',
            publicKey: ethWallet.publicKey,
            privateKey: ethWallet.privateKey,
            password: ethWallet.password,
            owner: body._id
        }).save();

        var users = await Users.find({ email: body.email });
        var user = {};
        if (users.length >= 1) {
            users[0].wallet.push(btcWalletDoc._id);
            users[0].wallet.push(ethWalletDoc._id);
            user = await users[0].save();
        }
        return user;
    } catch (ex) {
        return ex;
    }
}

module.exports = {
    createWallets
};
