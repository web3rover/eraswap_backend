const Txns = require('../../models/Transactions');


const getTxns = async(params)=>{
    const limit= Number(params.results) || 10;
    const skip =params.results && params.page ?  (Number(params.page)-1)*Number(params.results) :0;
    return await Txns.find({}).lean().sort({
        createdAt:-1
    }).populate({
        path:'userId',
        select:'username'
    }).limit(limit).skip(skip).exec();
};

const getTxnCount = async()=>{
    return await Txns.countDocuments({}).exec();
};



module.exports={
    getTxnCount,
    getTxns
}