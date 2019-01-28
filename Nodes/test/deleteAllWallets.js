const mongoose = require('mongoose');
const config = require('../../configs/config');
const Users = require('../../models/Users');
const Wallet = require('../../models/Wallets');
const btcRpc = require('../../Nodes/index').RPCDirectory["BTC"];

mongoose.connect(
    config.mongo.url, {
        useNewUrlParser: true
    }
);
const deleteWallets = async () => {
    // var users = await Users.find({});
    // var wallets = await Wallet.find({});

    // for (var i = 0; i < users.length; i++) {
    //     newWallets = [];
    //     for (var l = 0; l < users[i].wallet.length; l++) {
    //         if (users[i].wallet[l] != "") {
    //             newWallets.push(users[i].wallet[l]);
    //         }
    //     }
    //     users[i].wallet = newWallets;
    //     await users[i].save();
    // }

    var counter = 0;

    // users = await Users.find({});

    // wallets = await Wallet.find({});

    // for (var i = 0; i < users.length; i++) {
    //     var newWallets = [];
    //     for (var j = 0; j < users[i].wallet.length; j++) {
    //         for (var k = 0; k < wallets.length; k++) {
    //             if (wallets[k]._id == users[i].wallet[j]) {
    //                 newWallets.push(users[i].wallet[j]);
    //             }
    //         }
    //     }
    //     console.log(newWallets.length);
    //     users[i].wallet=newWallets;
    //     await users[i].save();
    // }

    var newWallets = [];
    var found = false;
    var users = await Users.find({}).populate('wallet');
    for (var i = 0; i < users.length; i++) {
        found = false;
        for (var j = 0; j < users[i].wallet.length; j++) {
            if (users[i].wallet[j].type == "btc") {
                found = true;
                break;
            }
        }
        if(!found){
            var newWallet = await btcRpc.createWallet(users[i].email);
            newWallet["password"]=users[i].email;
            newWallet["owner"]=users[i]._id;
            var pushId = await new Wallets(newWallet).save();
            users[i].wallet.push(pushId._id);
            await users[i].save();
        }
    }

    console.log("done");
};

deleteWallets();