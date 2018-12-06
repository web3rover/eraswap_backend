const Web3 = require('web3');
const web3 = new Web3();
const request = require('request');
const Users = require('../models/Users');
const Wallets = require('../models/Wallets');
const Withdrwals = require('../models/Withdrawal');
var keythereum = require('keythereum');

class EthRpc {
  constructor(host, port) {
    if (!host || !port) {
      throw 'Please provide host & port of node!';
    } else {
      this.host = host;
      this.port = port;
      web3.setProvider(new web3.providers.HttpProvider('http://' + host + ':' + port));
    }
  }

  async createWallet(email) {
    try {
      var op = await web3.eth.personal.newAccount(email);

      var keyFile = await this._getPrivateKey(op, email);

      if (!keyFile.error) {
        //return { publicKey: op, privateKey: "0x" + privKey.privateKey, password: email };
        return { publicKey: op, keyObject: keyFile.data, password: email };
      } else return keyFile;
    } catch (ex) {
      return ex;
    }
  }

  async createEscrow() {
    try {
      var date = new Date();
      var timestamp = date.getTime();
      var escrow = await this.createWallet('escrow_' + timestamp);
      escrow['type'] = 'eth';
      escrow['escrow'] = true;
      return escrow;
    } catch (ex) {
      return ex;
    }
  }

  async getAddress(email) {
    try {
      var user = await Users.findOne({ email: email }).populate('wallet');
      var address = '';
      for (var i = 0; i < user.wallet.length; i++) {
        if (user.wallet[i].type == 'eth') {
          address = user.wallet[i].publicKey;
          break;
        }
      }
      if (address == '') {
        return { error: 'Eth wallet not found!' };
      }
      return { data: address };
    } catch (ex) {
      return { error: ex.message };
    }
  }

  async getBalance(address) {
    try {
      var balance = await web3.eth.getBalance(address);

      return web3.utils.fromWei(balance, 'ether');
    } catch (ex) {
      return { error: ex.message };
    }
  }

  async send(sender, receiver, amount) {
    try {
      var pwd = await this._getPassword(sender);

      var withdrwal = new Withdrwals({
        type: 'Eth',
        status: 'Pending',
        txn: {
          operation: 'send',
          sender: sender,
          receiver: receiver,
          amount: amount,
        },
      });
      var dbObject = await withdrwal.save();

      await web3.eth.personal.unlockAccount(sender, pwd, null);
      web3.eth
        .sendTransaction({
          from: sender,
          to: receiver,
          value: web3.utils.toWei(amount.toString(), 'ether'),
        })
        .on('transactionHash', async function(hash) {
          dbObject['txnHash'] = hash;
          dbObject['error'] = '';
          dbObject['status'] = 'Pending';
          await dbObject.save();
        })
        .on('error', async err => {
          dbObject['error'] = err.message;
          dbObject['status'] = 'Error';
          dbObject['txnHash'] = '';
          await dbObject.save();
          console.log(err);
        });

      return { success: true, dbObject: dbObject };
    } catch (ex) {
      return { error: ex.message };
    }
  }

  async resend(dbObject) {
    if (dbObject) {
      if (dbObject._id) {
        var withdrwal = await Withdrwals.findById(dbObject._id);
        if (withdrwal) {
          var txn = withdrwal.txn;
          var pwd = await this._getPassword(txn.sender);

          await web3.eth.personal.unlockAccount(txn.sender, pwd, null);
          web3.eth
            .sendTransaction({
              from: txn.sender,
              to: txn.receiver,
              value: web3.utils.toWei(txn.amount.toString(), 'ether'),
            })
            .on('transactionHash', async function(hash) {
              withdrwal['txnHash'] = hash;
              withdrwal['error'] = '';
              withdrwal['status'] = 'Pending';
              await withdrwal.save();
            })
            .on('error', async err => {
              withdrwal['error'] = err.message;
              withdrwal['status'] = 'Error';
              withdrwal['txnHash'] = '';
              await withdrwal.save();
              console.log(err);
            });
        } else {
        }
      } else {
      }
    } else {
    }
  }

  //Get private key while user account creation
  async _getPrivateKey(address, password) {
    try {
      var keyObject = await this._parityRpcCall('parity_exportAccount', [address, password]);
      console.log(keyObject);
      return { data: keyObject };
    } catch (ex) {
      return { error: ex.message };
    }

    // var privateKey = keythereum.recover(password, keyObject);
    // console.log(privateKey);
  }

  //Get private key of registered user from database
  async getPrivateKey(email) {
    try {
      var user = await Users.findOne({ email: email }).populate('wallet');
      var address = '';
      for (var i = 0; i < user.wallet.length; i++) {
        if (user.wallet[i].type == 'eth') {
          address = user.wallet[i].privateKey;
          break;
        }
      }
      if (!address) {
        return { error: 'Eth wallet not found!' };
      }
      return { data: address };
    } catch (ex) {
      return { error: ex.message };
    }
  }

  async _getGasTank() {
    try {
      var gasTank = await Wallets.findOne({ gasTank: true });
      if (gasTank) {
        var balance = await this.getBalance(gasTank.publicKey);
        return { publicKey: gasTank.publicKey, balance: balance, privateKey: gasTank.privateKey };
      } else {
        return { error: 'Gas tank not found!' };
      }
    } catch (ex) {
      return { error: ex.message };
    }
  }

  async _getGasForTokenTransfer(gasEstimate, userPublicKey) {
    try {
      var gasTank = await this._getGasTank();
      if (gasTank.error) {
        return gasTank;
      } else {
        if (gasTank.balance > gasEstimate) {
          var op = await this._supplyGasForTransaction(gasTank.publicKey, gasTank.privateKey, userPublicKey, gasEstimate);

          return op;
        } else {
          return { error: 'Insufficient balance in gasTank to send the transaction.' };
        }
      }
    } catch (ex) {
      return { error: ex.message };
    }
  }

  async _supplyGasForTransaction(publicKey, privateKey, userPublicKey, amount) {
    try {
      var op = await this.send(publicKey, userPublicKey, amount);
      return op;
    } catch (ex) {
      return { error: ex.message };
    }
  }

  async _createGasTank() {
    try {
      var op = await web3.eth.personal.newAccount('gasTank');

      var privKey = await this._getPrivateKey(op, 'gasTank');
      if (!privKey.error) return { publicKey: op, privateKey: privKey.privateKey ? privKey.privateKey : '', keyObject: privKey.data, password: 'gasTank' };
      else return privKey;
    } catch (ex) {
      return ex;
    }
  }

  async _getConfirmations(txHash) {
    try {
      // Instantiate web3 with HttpProvider
      const trx = await web3.eth.getTransaction(txHash);

      // Get current block number
      const currentBlock = await web3.eth.getBlockNumber();

      // When transaction is unconfirmed, its block number is null.
      // In this case we return 0 as number of confirmations
      return trx && trx.blockNumber  ? currentBlock - trx.blockNumber : 0;
    } catch (error) {
      console.log(error);
    }
  }

  async _parityRpcCall(command, params = [], path = '') {
    if (!params instanceof Array) {
      throw { error: true, message: 'params must an array' };
    } else if (!command) {
      throw { error: true, message: 'Command can not be null' };
    }

    let options = {
      url: 'http://' + this.host + ':' + this.port + path,
      method: 'post',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'curltest', method: command, params: params }),
    };

    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          let result = body;
          let resJSON = null;

          try {
            let resJSON = JSON.parse(result).result;
            if (resJSON.error) {
              reject(resJSON.error);
            } else {
              resolve(resJSON);
            }
          } catch (ex) {
            reject({
              error: true,
              result: result,
              message: ex,
            });
          }
        }
      });
    });
  }

  async _getPassword(address) {
    try {
      var wallet = await Wallets.find({ publicKey: address, type: 'eth' });
      if (wallet.length >= 1) {
        return wallet[0].password;
      }
      return null;
    } catch (ex) {
      return ex;
    }
  }
}

module.exports = EthRpc;
