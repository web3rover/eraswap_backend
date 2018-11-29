const BtcRpc = require('./BTCRpc');
const EthRpc = require('./EthRpc');
const ESTRpc = require('./ESTRpc');
const interface = require('./tokenAbi/ESTAbi');

const nodeConfig = require('../configs/config').NODES;

var btcRpc = new BtcRpc(nodeConfig.btc.host, nodeConfig.btc.port, nodeConfig.btc.username, nodeConfig.btc.password);
var ethRpc = new EthRpc(nodeConfig.eth.host, nodeConfig.eth.port);
var estRpc = new ESTRpc(nodeConfig.est.host, nodeConfig.est.port, nodeConfig.est.contractAddress, interface);

var RPCDirectory = {
    "Btc" : btcRpc,
    "Eth" : ethRpc,
    "Est" : estRpc,
};

module.exports = {
    RPCDirectory
};
