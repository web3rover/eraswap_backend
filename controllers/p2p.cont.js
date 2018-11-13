var Blockcluster = require('blockcluster');
const shortid = require("shortid");
const config = require('../configs/config');

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

const searchListing = async(params)=>{
   const data=  await node.callAPI("assets/search", {
        $query: {
            "assetName": config.BLOCKCLUSTER.assetName,
            "status": "open"
          },
          $sort: {
            timestamp: 1
          }
      });
      return data;
}
const getCount = async()=>{
    const countObj =await node.callAPI('assets/assetTypes',{
        $query: {
            "assetName": config.BLOCKCLUSTER.assetName,
            "status": "open",
            "wantsToBuy": true,
          }
    });
    console.log(JSON.parse(countObj)[0].units);
    return count;
}

module.exports={
    addListing,
    searchListing,
    getCount
}