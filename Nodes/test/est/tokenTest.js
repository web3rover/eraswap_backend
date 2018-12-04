const interface = require('../../tokenAbi/ESTAbi');
const ESTRpc = require('../../ESTRpc');
var config = require('../../../configs/config').NODES;
var mongoose = require('mongoose');
var Web3 = require('web3');

// mongoose.connect(
//     config.mongo.url,
//     { useNewUrlParser: true }
// );

var tokenContract = {};
var web3 = new Web3();
var est = new ESTRpc(config.est.host, config.est.port,
    config.est.contractAddress, interface);

var path = "http://" + config.est.host + ":" + config.est.port
web3.setProvider(new web3.providers.HttpProvider(path));
try {
    tokenContract = new web3.eth.Contract(interface, config.est.contractAddress);
}
catch (ex) {
    console.log(ex);
}

var balance = async () => {
    var bal = await tokenContract.methods.balanceOf("0x980dd5AED50174cB07D7F33AB5Ce55c984e81678").call();
    console.log(bal);
}

tokenContract.methods.balanceOf("0x980dd5AED50174cB07D7F33AB5Ce55c984e81678").call().then(console.log).catch(err => {
    console.log(err);
    process.exit();
});

balance();

// est.getBalance("0x970683f35197f3860aAFC6226d66039EB2a546e1")
//     .then(op => { console.log("0x970683f35197f3860aAFC6226d66039EB2a546e1 => " + op); })
//     .catch(console.log);

// est.getBalance("0x8fe3B8f79ec6B5728Dd2636a5aD030f1Ffa5C714")
//     .then(op => { console.log("0x8fe3B8f79ec6B5728Dd2636a5aD030f1Ffa5C714 => " + op); })
//     .catch(console.log);

// est.send("0x970683f35197f3860aAFC6226d66039EB2a546e1", "0x8fe3B8f79ec6B5728Dd2636a5aD030f1Ffa5C714", 1)
//     .then(console.log).catch(console.log);