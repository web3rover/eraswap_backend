const walletCont = require('./wallets');
const escrow = require('../controllers/escrow.cont');
const request = require('request-promise');
const config = require('../configs/config');
const rpcDirectory = require('../Nodes').RPCDirectory;
const Withdrawals = require('../models/Withdrawal');
const Users = require('../models/Users');

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
        var op = await checkBalanceAndSendToEscrow(user, body.coin, body.collateral, body.amount, body.orderType);
        if (op.success) {
            var result = await saveRecord(user, body, op.dbObject);
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

        var dbEntry = await Withdrawals.findById(withdrawal._id);

        var show = dbEntry.status == "Confirmed";

        var data = {
            ...body,
            userId: user._id,
            username: user.username,
            email: user.email,
            withdrawalId: withdrawal._id,
            show: show,
            agreementOrderId: "",
            agreementDate: "",
        }

        if (data.orderType == "borrow") {
            data["collateralDeducted"] = dbEntry.txn.amount;
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

        dbEntry["orderInfo"] = {
            orderId: identifier,
            orderAction: "Creation"
        };

        await dbEntry.save();

        return { success: true };
    } catch (ex) {
        return ex;
    }
}

const getCoinRate = async (coin) => {
    try {
        var data = await request('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&CMC_PRO_API_KEY='
            + config.coinMktCapKey + '&symbol=' + coin);
        var price = JSON.parse(data).data[coin].quote.USD.price;
        return price;
    } catch (ex) {
        console.log(ex);
        return ex;
    }
}

const checkBalanceAndSendToEscrow = async (user, coin, collateral, amount, type) => {
    if (user.email) {
        var coinToDeduct = type == "lend" ? coin : collateral;
        var balance = await walletCont.getBalance(user.email, coinToDeduct);
        balance = balance.balance;
        try {
            var coinAmtRequired = amount;
            if (type == "borrow") {
                coinAmtRequired = type == "borrow" ? (coinAmtRequired * 2) : coinAmtRequired;
                var coinPrice = await getCoinRate(coin);
                var collateralPrice = await getCoinRate(collateral);

                var coinAmtReqInUSD = coinPrice * coinAmtRequired;
                var collateralRequired = coinAmtReqInUSD / collateralPrice;
                coinAmtRequired = collateralRequired;
            }
            if (balance >= coinAmtRequired) {
                coinAmtRequired = Math.round(coinAmtRequired * 10 ** 8) / 10 ** 8;
                console.log("Deducting " + coinAmtRequired + " " + coinToDeduct + " from user wallet.");
                var sendToEscrow = await walletCont.sendToEscrow(user.email, coinAmtRequired, coinToDeduct);
                return sendToEscrow;
            }
            else {
                return {
                    message: "Insufficient funds in " + coinToDeduct + " wallet required " + coinAmtRequired + " got " + balance
                }
            }
        } catch (ex) {
            console.log(ex);
            return ex;
        }
    }
}

const getOrderBook = async (user) => {
    let data = await node.callAPI("assets/search", {
        $query: {
            "assetName": "LBOrder",
            "status": "open",
            "show": true,
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
            data[i]["selfOrder"] = true;
        }
        result.push(data[i]);
    }
    return result;
}

const getAgreements = async (user) => {
    let allAssets = await node.callAPI("assets/search", {
        $query: {
            "assetName": "Agreements"
        }
    });
    let lenderData = await node.callAPI("assets/search", {
        $query: {
            "assetName": "Agreements",
            "status": "open",
            "active": "true",
            "lender": user.username,
        },
        $sort: {
            timestamp: 1
        }
    });

    let borrowerData = await node.callAPI("assets/search", {
        $query: {
            "assetName": "Agreements",
            "status": "open",
            "active": "true",
            "borrower": user.username,
        },
        $sort: {
            timestamp: 1
        }
    });

    var data = [...lenderData, ...borrowerData];
    if (data.length > 0) {
        data.sort(function (a, b) { return a.agreementDate - b.agreementDate });

        for (var i = 0; i < data.length; i++) {
            data["user"] = data.lender == user.username ? data.borrower : data.lender;
            data["type"] = data.lender == user.username ? "Lend" : "Borrow";
            data["nextPayment"] = "Still working on this";
        }

        return data;
    }
    return [];
}

const apply = async (user, orderId) => {
    try {

        let data = await node.callAPI("assets/search", {
            $query: {
                "assetName": "LBOrder",
                "uniqueIdentifier": orderId,
                "show": true,
                "status": "open",
                "agreementDate": "",
                "agreementOrderId": "",
            }
        });

        if (data.length > 0) {
            var order = data[0];

            var coinToescrow = order.orderType == "lend" ? order.collateral : order.coin;

            var balance = await walletCont.getBalance(user.email, coinToescrow);
            balance = balance.balance;

            var coinAmtRequired = order.amount;
            coinAmtRequired = order.orderType == "borrow" ? coinAmtRequired : coinAmtRequired * 2;

            if (order.orderType == "lend") {
                var coinPrice = await getCoinRate(order.coin);
                var collateralPrice = await getCoinRate(order.collateral);

                var coinAmtReqInUSD = coinPrice * coinAmtRequired;
                var collateralRequired = coinAmtReqInUSD / collateralPrice;
                coinAmtRequired = collateralRequired;
            }

            if (balance >= coinAmtRequired) {
                var email = "";
                if (order.email) {
                    email = order.email;
                }
                else {
                    var userDbObj = await Users.findOne({ username: order.username });
                    if (userDbObj) {
                        email = userDbObj.email;
                    }
                }

                //Locking the order to apply
                var res = await node.callAPI('assets/updateAssetInfo', {
                    assetName: "LBOrder",
                    fromAccount: node.getWeb3().eth.accounts[0],
                    identifier: orderId,
                    "public": {
                        show: false,
                    }
                });

                var withdrawal = await walletCont.sendToEscrow(email, coinAmtRequired, coinToescrow);

                if (withdrawal.message) {
                    throw withdrawal.message;
                }
                else {
                    withdrawal = withdrawal.dbObject;
                    var identifier = shortid.generate();
                    var newOrderData = {
                        orderType: order.orderType == "lend" ? "borrow" : "lend",
                        coin: order.coin,
                        collateral: order.collateral,
                        interest: order.interest,
                        duration: order.duration,
                        amount: order.amount,
                        userId: user._id,
                        username: user.username,
                        email: user.email,
                        withdrawalId: withdrawal._id,
                        show: false,
                        agreementOrderId: "",
                        agreementDate: "",
                    }

                    if (newOrderData.orderType == "borrow") {
                        newOrderData["collateralDeducted"] = coinAmtRequired;
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
                        "public": newOrderData
                    });

                    console.log(res);

                    var dbObject = await Withdrawals.findById(withdrawal._id);
                    dbObject["orderInfo"] = {
                        orderId: identifier,
                        orderType: order.orderType == "lend" ? "borrow" : "lend",
                        orderAction: "Apply",
                        orderToApply: orderId,
                    };
                    await dbObject.save();
                    return { success: true };
                }
            }
            else {
                throw { message: "Insufficient balance in " + coinToescrow + " wallet. Required " + coinAmtRequired + " found " + balance };
            }
        } else {
            throw { message: "Order is not available to apply!" };
        }
    } catch (ex) {
        console.log(ex);
        return ex;
    }
}

module.exports = {
    getCoinsOptions,
    getCollateralCoinsOptions,
    placeOrder,
    getOrderBook,
    apply,
    getAgreements,
};