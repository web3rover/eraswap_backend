var Blockcluster = require('blockcluster');
const shortid = require("shortid");

var config = require('../configs/config');
const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.host,
    instanceId: config.BLOCKCLUSTER.instanceId
  });

const addListing =async(data)=>{
    var identifier = shortid.generate();
    await node.callAPI('assets/issueSoloAsset', {
        assetName: config.BLOCKCLUSTER.assetName,
        fromAccount: node.getWeb3().eth.accounts[0],
        toAccount: node.getWeb3().eth.accounts[0],
        identifier: identifier
      });

      //update agreement meta data
      await node.callAPI('assets/updateAssetInfo', {
        assetName: config.BLOCKCLUSTER.assetName,
        fromAccount: node.getWeb3().eth.accounts[0],
        identifier: identifier,
        "public": data
      });
};

const searchListing = async(data)=>{
    await node.callAPI("assets/search", {
        //search query
      });
}

module.exports={
    addListing
}