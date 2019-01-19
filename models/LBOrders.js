var mongoose = require('mongoose');
var LBOrderSchema = new mongoose.Schema({
    identifier: { type: String, unique: 'Order ({VALUE}) Already Exist', }
});

const LBOrders = mongoose.model('LBOrder', LBOrderSchema);
module.exports = LBOrders;
