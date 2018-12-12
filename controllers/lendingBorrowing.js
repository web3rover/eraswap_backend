const walletCont = require('./wallets');
const escrow = require('../controllers/escrow.cont');
const request = require('request-promise');
const config = require('../configs/config');
const rpcDirectory = require('../Nodes').RPCDirectory;
const Withdrawals = require('../models/Withdrawal');

var Blockcluster = require('blockcluster');
const shortid = require("shortid");

const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.host,
    instanceId: config.BLOCKCLUSTER.instanceId
});

const getCoinsOptions = async () => {
    try {
        const coins = Object.keys(rpcDirectory);
        return coins;
    } catch (ex) {
        return ex;
    }
}

const getCollateralCoinsOptions = async crypto => {
    try {
        var coins = Object.keys(rpcDirectory);
        coins.splice(coins.indexOf(crypto), 1);
        return coins;
    } catch (ex) {
        return ex;
    }
}

const placeOrder = async (user, body) => {
    console.log(user, body);
    try {
        var coin = body.orderType == "lend" ? body.coin : body.collateral;
        var op = await checkBalanceAndSendToEscrow(user, coin, body.amount);
        if (op.success) {
            var result = saveRecord(user, body, op.dbObject);
            return result;
        }
        else {
            return op;
        }
    } catch (ex) {
        return ex;
    }
}

const saveRecord = async (user, body, withdrawal) => {
    try {
        var identifier = shortid.generate();

        var dbEntry = await Withdrawals.findById(withdrawal._id, );

        var show = dbEntry.status == "Confirmed";

        var data = {
            ...body,
            userId: user._id,
            username: user.username,
            withdrawalId: withdrawal._id,
            show: show,
            agreementOrderId: "",
            agreementDate: "",
        }

        var res = await node.callAPI('assets/issueSoloAsset', {
            assetName: "LBOrder",
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: identifier
        });

        console.log(res);

        //update agreement meta data
        res = await node.callAPI('assets/updateAssetInfo', {
            assetName: "LBOrder",
            fromAccount: node.getWeb3().eth.accounts[0],
            identifier: identifier,
            "public": data
        });

        console.log(res);

        dbEntry["orderId"] = identifier;
        await dbEntry.save();

        return { success: true };
    } catch (ex) {
        return ex;
    }
}

const checkBalanceAndSendToEscrow = async (user, coin, amount) => {
    if (user.email) {
        var balance = await walletCont.getBalance(user.email, coin);
        balance = balance.balance;
        try {
            var data = await request('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&CMC_PRO_API_KEY='
                + config.coinMktCapKey + '&symbol=' + coin);
            var price = JSON.parse(data).data[coin].quote.USD.price;
            console.log(price);
            var coinAmtRequired = amount / price;
            if (balance >= coinAmtRequired) {
                coinAmtRequired = Math.round(coinAmtRequired * 10 ** 8) / 10 ** 8;
                console.log("Deducting " + coinAmtRequired + " " + coin + " from user wallet.");
                var sendToEscrow = await walletCont.sendToEscrow(user.email, coinAmtRequired, coin);
                return sendToEscrow;
            }
            else {
                return {
                    message: "Insufficient funds in " + coin + " wallet required " + coinAmtRequired + " got " + balance
                }
            }
        } catch (ex) {
            console.log(ex);
            return {
                message: ex.message
            }
        }
    }
}

const getOrderBook = async (user) => {

    let data = await node.callAPI("assets/search", {
        $query: {
            "show": true,
            "status": "open",
            "agreementOrderId": "",
            "agreementDate": ""
        },
        $sort: {
            timestamp: 1
        }
    });
    var result = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i].username == user.username) {
            data[i]["selfOrder"]=true;
        }
        result.push(data[i]);
    }
    return result;
}

module.exports = {
    getCoinsOptions,
    getCollateralCoinsOptions,
    placeOrder,
    getOrderBook,
};
