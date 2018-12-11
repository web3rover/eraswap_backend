const Users = require('../../models/Users');
const WalletCont = require('../wallets');

const getListUsers = async(params)=>{
    const limit= Number(params.results) || 10;
    const skip =params.results && params.page ?  (Number(params.page)-1)*Number(params.results) :0;
    return await Users.find({}).limit(limit).skip(skip).exec();
};

const getAllUserCount = async()=>{
    return await Users.countDocuments({}).exec();
};

const getUserWalletAndBalance = async(email)=>{
   let returnable=[];
   const currencies = ['ETH','EST','BTC'];
   for(let i of currencies){
      const address = await WalletCont.getAddress(email,i);
      const balance = await WalletCont.getBalance(email,i);
      returnable.push({
          currency:i,
          address:address,
          balance:balance
      });
   }
   return returnable;
}

module.exports={
    getListUsers,
    getAllUserCount,
    getUserWalletAndBalance
}