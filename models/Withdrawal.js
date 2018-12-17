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
        waitFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' },
        source: String,
        orderInfo : Object,
    }
);

const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);
module.exports = Withdrawal;
