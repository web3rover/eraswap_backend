const Blockcluster = require('blockcluster');

const Users = require('../../models/Users');
const WalletCont = require('../wallets');
const Txns = require('../../models/Transactions');

const escrowCont = require('../escrow.cont');

const config = require('../../configs/config');

const node = new Blockcluster.Dynamo({
  locationDomain: config.BLOCKCLUSTER.host,
  instanceId: config.BLOCKCLUSTER.instanceId,
});

const getListUsers = async params => {
  const limit = Number(params.results) || 10;
  const skip = params.results && params.page ? (Number(params.page) - 1) * Number(params.results) : 0;
  const data = await Users.find({})
    .lean()
    .limit(limit)
    .skip(skip)
    .exec();
  let a = [];
  for (let i of data) {
    try {
      i.walletsDetails = await getUserWalletAndBalance(i.email);
    } catch (err) {
      i.walletsDetails = [
        {
          currency: 'ETH',
          address: 'Not Found or unable to fetch',
          balance: 'Not Found or unable to fetch',
        },
        {
          currency: 'EST',
          address: 'Not Found or unable to fetch',
          balance: 'Not Found or unable to fetch',
        },
        {
          currency: 'BTC',
          address: 'Not Found or unable to fetch',
          balance: 'Not Found or unable to fetch',
        },
      ];
    }
    a.push(i);
  }
  return a;
};

const getAllUserCount = async () => {
  return await Users.countDocuments({}).exec();
};

const getUserWalletAndBalance = async email => {
  let returnable = [];
  const currencies = ['ETH', 'EST', 'BTC'];
  for (let i of currencies) {
    const address = await WalletCont.getAddress(email, i);
    const balance = await WalletCont.getBalance(email, i);
    returnable.push({
      currency: i,
      address: address,
      balance: balance.balance,
    });
  }
  return returnable;
};

const getDash = async () => {
  const userTotal = await Users.countDocuments({}).exec();
  const adminTotal = await Users.countDocuments({ admin: true }).exec();
  const txnsTotal = await Txns.countDocuments({}).exec();
  const txnsFinished = await Txns.countDocuments({ witdrawn: true }).exec();
  const totalListings = await node.callAPI('assets/count', {
    $query: {
      assetName: config.BLOCKCLUSTER.assetName,
      status: 'open',
    },
  });
  const totalActiveListings = await node.callAPI('assets/count', {
    $query: {
      assetName: config.BLOCKCLUSTER.assetName,
      status: 'open',
      show: true,
    },
  });

  const totalMatch = await node.callAPI('assets/count', {
    $query: {
      assetName: config.BLOCKCLUSTER.matchAssetName,
      status: 'open',
    },
  });
  const ethBal = await escrowCont.getBalance('ETH');
  const estBal = await escrowCont.getBalance('EST');
  const btcBal = await escrowCont.getBalance('BTC');
  return {
    users: {
      totalUser: userTotal,
      admin: adminTotal,
    },
    txns: {
      finished: txnsFinished,
      total: txnsTotal,
    },
    p2p: {
      active: totalActiveListings,
      total: totalListings,
      match: totalMatch,
    },
    escrow: {
      eth: ethBal,
      est: estBal,
      btc: btcBal,
    },
  };
};

const createAdmin = async id => {
  return await Users.update(
    { _id: id },
    {
      $set: {
        admin: true,
        adminLevel: 0,
      },
    }
  ).exec();
};
const revokeAdmin = async id => {
  return await Users.update(
    { _id: id },
    {
      $set: {
        admin: false,
        adminLevel: 0,
      },
    }
  ).exec();
};
const searchUser = async keyWord => {
  const data = await Users.find({
    $or: [
      {
        username: { $regex: keyWord ,$options: 'i' },
      },{
        email: { $regex: keyWord ,$options: 'i' },
      },
    ],
  })
    .lean()
    .exec();
  let a = [];
  for (let i of data) {
    try {
      i.walletsDetails = await getUserWalletAndBalance(i.email);
    } catch (err) {
      i.walletsDetails = [
        {
          currency: 'ETH',
          address: 'Not Found or unable to fetch',
          balance: 'Not Found or unable to fetch',
        },
        {
          currency: 'EST',
          address: 'Not Found or unable to fetch',
          balance: 'Not Found or unable to fetch',
        },
        {
          currency: 'BTC',
          address: 'Not Found or unable to fetch',
          balance: 'Not Found or unable to fetch',
        },
      ];
    }
    a.push(i);
  }
  return a;
};
module.exports = {
  getListUsers,
  getAllUserCount,
  getDash,
  createAdmin,
  revokeAdmin,
  getUserWalletAndBalance,
  searchUser,
};
