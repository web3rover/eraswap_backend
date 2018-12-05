var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var WithdrawalSchema = new mongoose.Schema(
    {
        type: { type: String, required: true },
        status: { type: String, required: true },
        txn: Object,
        txnHash: String,
        error: String,
        gasDetails: Object,
    }
);

const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);
module.exports = Withdrawal;
