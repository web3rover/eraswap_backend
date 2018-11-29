const ethNode = require("../../EthRpc");
var config = require('../../../configs/config');
var mongoose = require('mongoose');

let ethRpc = new ethNode("13.233.168.86", "8545");

mongoose.connect(
  config.mongo.url,
  { useNewUrlParser: true }
);

ethRpc.getBalance("").then(console.log).catch(console.log);

// ethRpc.getAddress("uk11peesp@uk.com").then(op => {console.log(op)
//     ethRpc.getBalance(op.data).then(console.log);
// });