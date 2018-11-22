const ethNode = require("../../EthRpc");
var config = require('../../../configs/config');
var mongoose = require('mongoose');

let ethRpc = new ethNode("52.172.135.196", "8545");

mongoose.connect(
  config.mongo.url,
  { useNewUrlParser: true }
);
ethRpc.getAddress("uk11peesp@uk.com").then(op => {console.log(op)});