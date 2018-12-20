const config = require('../../configs/config');
const Blockcluster = require('blockcluster');

const node = new Blockcluster.Dynamo({
  locationDomain: config.BLOCKCLUSTER.host,
  instanceId: config.BLOCKCLUSTER.instanceId,
});

const getCounts = async () => {
  const totalCount = await node.callAPI('assets/count', {
    $query: {
      assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
      status: 'open',
      show: true,
    },
  });
  const totalLendRequest = await node.callAPI('assets/count', {
    $query: {
      assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
      status: 'open',
      show: true,
      orderType: 'lend',
    },
  });
  const totalAgreements = await node.callAPI('assets/count', {
    $query: {
      assetName: config.BLOCKCLUSTER.agreementsAssetName,
      status: 'open',
    },
  });
  return {
    total_LB: totalCount.message,
    total_L: totalLendRequest.message,
    total_A: totalAgreements.message,
  };
};

const getAgreements = async(params)=>{
    const limit= Number(params.results) || 10;
    const skip =params.results && params.page ?  (Number(params.page)-1)*Number(params.results) :0;
    return data = await node.callAPI("assets/search", {
        $query: {
            assetName: config.BLOCKCLUSTER.agreementsAssetName,
          },
          $limit:limit,
          $skip:skip,
          $sort: {
            timestamp: -1
          }
      });
}
module.exports = {
  getCounts,
  getAgreements
};
