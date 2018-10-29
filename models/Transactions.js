const mongoose = require('mongoose');

const TxnSchema = new mongoose.Schema({
userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Users',
    required:true
},
txnId:{
    type:String,
    required:true
},
txnStatus:{
    type:String,
    
},
exchFromCurrency:{
    type:String,
    required:true
},
exchFromCurrencyAmt:{
    type:Number,
    required:true
},
exchToCurrency:{
    type:String,
    required:true
},
exchToCurrencyAmt:{
    type:Number,
    required:true
},
allExchResult:{
    type:Object
},
toAddress:{
    type:String,
    required:true
},
fromAddress:{
    type:String,
    required:true
},
eraswapAcceptAddress:{
    type:String,
    require:true
},
eraswapSendAddress:{
    type:String,
    require:true
},
exchangePlatform:{
    type:String,
    required:true
}
},{timestamps:true});

const Txn = mongoose.model('Txn', TxnSchema);
module.exports = Txn;
