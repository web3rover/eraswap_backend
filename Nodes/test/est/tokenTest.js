const interface = require('../../tokenAbi/ESTAbi');
const ESTRpc = require('../../ESTRpc');
var config = require('../../../configs/config');
var mongoose = require('mongoose');

mongoose.connect(
    config.mongo.url,
    { useNewUrlParser: true }
);

var est = new ESTRpc("52.172.135.196", "8545",
    "0xDdF85a0498D8cCe6A6a6d71B6EBFBdC07BA147a1", interface);

est.sendTokenToEscrow("0x970683f35197f3860aAFC6226d66039EB2a546e1", 1).
    then(console.log).catch(console.log);

// est.getBalance("0x970683f35197f3860aAFC6226d66039EB2a546e1")
//     .then(op => { console.log("0x970683f35197f3860aAFC6226d66039EB2a546e1 => " + op); })
//     .catch(console.log);

// est.getBalance("0x8fe3B8f79ec6B5728Dd2636a5aD030f1Ffa5C714")
//     .then(op => { console.log("0x8fe3B8f79ec6B5728Dd2636a5aD030f1Ffa5C714 => " + op); })
//     .catch(console.log);

// est.send("0x970683f35197f3860aAFC6226d66039EB2a546e1", "0x8fe3B8f79ec6B5728Dd2636a5aD030f1Ffa5C714", 1)
//     .then(console.log).catch(console.log);