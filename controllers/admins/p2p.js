const Users = require('../../models/Users');
const walletCont = require('../wallets');
const escrowCont = require('../escrow.cont');

const config = require('../../configs/config');
const Blockcluster = require('blockcluster');

const node = new Blockcluster.Dynamo({
  locationDomain: config.BLOCKCLUSTER.host,
  instanceId: config.BLOCKCLUSTER.instanceId,
});

const getListMatches = async params => {
  const limit = Number(params.results) || 10;
  const skip = params.results && params.page ? (Number(params.page) - 1) * Number(params.results) : 0;
  const data = await node.callAPI('assets/search', {
    $query: {
      assetName: config.BLOCKCLUSTER.matchAssetName,
    },
    $limit: limit,
    $skip: skip,
    $sort: {
      createdAt: -1,
    },
  });

  if (data.length) {
    let a = [];
    for (let i of data) {
      i.ownerUser = await Users.findOne({ _id: i.ownerUserId })
        .select('username email')
        .exec();
      i.requester = await Users.findOne({ _id: i.requester })
        .select('username email')
        .exec();
      a.push(i);
    }
    return a;
  } else {
    return data;
  }
};

const getAllMatchesCount = async () => {
  return await node.callAPI('assets/count', {
    $query: {
      assetName: config.BLOCKCLUSTER.matchAssetName,
    },
  });
};

//this will send sellers amount from escrow to buyers wallet.
const sendToBuyerOnDispute = async (matchId, listingId, owner, requester, amount, cryptoCurrency) => {
  const listingData = await node.callAPI('assets/search', {
    $query: {
      assetName: config.BLOCKCLUSTER.assetName,
      uniqueIdentifier: listingId,
      userId: owner._id,
    },
  });
  if (!listingData.length) {
    throw { message: 'No Match Found!' };
  }
  let buyerAddress;
  if (listingData[0].wantsToSell) {
    //owner is seller
    buyerAddress = await walletCont.getAddress(requester.email, cryptoCurrency);
  } else {
    //owner is buyer
    buyerAddress = await walletCont.getAddress(owner.email, cryptoCurrency);
  }
  await escrowCont.send(cryptoCurrency, buyerAddress, amount);
  return await node.callAPI('assets/updateAssetInfo', {
    assetName: config.BLOCKCLUSTER.matchAssetName,
    fromAccount: node.getWeb3().eth.accounts[0],
    identifier: matchId,
    public: {
      sendToBuyer: true,
      finished: true,
    },
  });
};

//when buyer does not pay, or something
//this will release sellers amount from escrow to his wallet
//
const sendToSellerOnDispute = async (matchId, listingId, owner, requester, amount, fee, cryptoCurrency) => {
  const listingData = await node.callAPI('assets/search', {
    $query: {
      assetName: config.BLOCKCLUSTER.assetName,
      uniqueIdentifier: listingId,
      userId: owner._id,
    },
  });
  let ownerAddress;
  if (!listingData.length) {
    throw { message: 'No Match Found!' };
  }
  if (listingData[0].wantsToSell) {
    //owner is seller
    ownerAddress = await walletCont.getAddress(owner.email, cryptoCurrency);
  } else {
    //owner is buyer
    ownerAddress = await walletCont.getAddress(requester.email, cryptoCurrency);
  }
  await escrowCont.send(cryptoCurrency, ownerAddress, amount + fee);
  return await node.callAPI('assets/updateAssetInfo', {
    assetName: config.BLOCKCLUSTER.matchAssetName,
    fromAccount: node.getWeb3().eth.accounts[0],
    identifier: matchId,
    public: {
      backToSeller: true,
      finished: true,
    },
  });
};

module.exports = {
  getAllMatchesCount,
  getListMatches,
  sendToBuyerOnDispute,
  sendToSellerOnDispute,
};
