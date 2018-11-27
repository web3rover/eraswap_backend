var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var WalletSchema = new mongoose.Schema(
  {
    type: {type: String, required: true},
    publicKey: {type: String, required: true},
    privateKey: String,
    password: {type: String, required: true},
    owner: { type: Schema.Types.ObjectId, ref: 'Users', required: false },
    gasTank: { type: Boolean, require: false },
  }
);

const Wallet = mongoose.model('Wallet', WalletSchema);
module.exports = Wallet;
