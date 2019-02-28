const walletCont = require('./wallets');
const escrow = require('../controllers/escrow.cont');
const request = require('request-promise');
const config = require('../configs/config');
const rpcDirectory = require('../Nodes').RPCDirectory;
const Withdrawals = require('../models/Withdrawal');
const Users = require('../models/Users');
const Coins = require('../models/Coins');
const LBOrders = require('../models/LBOrders');
const BigNumber = require('bignumber.js');
var Blockcluster = require('blockcluster');
const shortid = require("shortid");
const moment = require('moment');

const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.host,
    instanceId: config.BLOCKCLUSTER.instanceId
});

const getFees = async (amount, collateralCoin) => {
    try {
        let fee = 0;
        if (collateralCoin == 'EST') {
            fee = new BigNumber(amount).multipliedBy(config.LB_FEE).dividedBy(2).dividedBy(100);
        } else {
            fee = new BigNumber(amount).multipliedBy(config.LB_FEE).dividedBy(100);
        }
        return {fee: fee};
    } catch (ex) {
        return ex;
    }
}

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
        } else {
            return op;
        }
    } catch (ex) {
        return ex;
    }
}

const deleteOrder = async (user, orderId) => {
    try {

        var order = await node.callAPI('assets/search', {
            assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
            "uniqueIdentifier": orderId,
            "email": user.email,
            "status": "open",
            "show": true,
        });

        if (order.length > 0) {
            var userObj = await Users.findById(user._id).populate('wallet');

            if (userObj) {

                var refund = await refundOrderAmount(userObj, order[0]);
                if (refund.success) {

                    var res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: orderId,
                        email: user.email,
                        "public": {
                            show: false,
                            status: "closed"
                        }
                    });

                    res = await LBOrders.deleteOne({
                        identifier: orderId
                    });

                    console.log(res);
                    return {
                        success: true
                    };
                }
            }
        }
    } catch (ex) {
        return ex;
    }
}

const refundOrderAmount = async (user, order) => {
    try {
        var Withdrawal = await Withdrawals.findById(order.withdrawalId);
        if (Withdrawal) {
            var res = await escrow.send(Withdrawal.type, Withdrawal.txn.sender, order.amountReceived);
            return res;
        }
        return {
            message: "Withdrawals transaction not found in database to make a refund."
        };
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
            amountReceived: dbEntry.txn.amountReceived,
            userId: user._id,
            username: user.username,
            email: user.email,
            withdrawalId: dbEntry._id.toString(),
            show: show,
            agreementOrderId: "",
            agreementDate: "",
        }

        if (data.orderType == "borrow") {
            data["collateralDeducted"] = dbEntry.txn.amount;
        }

        dbEntry["orderInfo"] = {
            orderId: identifier,
            orderAction: "Creation",
            data: data,
        };

        await dbEntry.save();

        console.log({
            assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: identifier
        });

        var res = await node.callAPI('assets/issueSoloAsset', {
            assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: identifier
        });

        console.log(res);
        data["timeStamp"] = +new Date();

        //update agreement meta data
        res = await node.callAPI('assets/updateAssetInfo', {
            assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
            fromAccount: node.getWeb3().eth.accounts[0],
            identifier: identifier,
            "public": data
        });

        console.log(res);
        if (show) {
            res = await (new LBOrders({
                identifier: identifier
            })).save();
        }

        console.log(res);

        return {
            success: true
        };
    } catch (ex) {
        console.log(ex);
        return ex;
    }
}

const getCoinRate = async (coin) => {
    try {
        const data = await Coins.findOne({
            name: 'coinData',
            in: 'USD'
        }).select(coin).exec();
        return data[coin];
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

                var coinAmtReqInUSD = new BigNumber(coinPrice).multipliedBy(coinAmtRequired);
                var collateralRequired = new BigNumber(coinAmtReqInUSD.toNumber()).dividedBy(collateralPrice);
                coinAmtRequired = collateralRequired;
            }
            if (balance >= coinAmtRequired) {
                coinAmtRequired = Math.round(coinAmtRequired * 10 ** 8) / 10 ** 8;
                console.log("Deducting " + coinAmtRequired + " " + coinToDeduct + " from user wallet.");
                var sendToEscrow = await walletCont.sendToEscrow(user.email, coinAmtRequired, coinToDeduct);
                return sendToEscrow;
            } else {
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
    try {
        let data = await node.callAPI("assets/search", {
            $query: {
                "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
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
            data[i]["timeStampStr"] = getTimeStamp(data[i]["timeStamp"]);
            data[i]["collateralAmount"] = data[i]["amount"] * 2;
            result.push(data[i]);
        }
        return result;
    } catch (ex) {
        console.log(ex);
    }
}

const getTimeStamp = (date) => {
    if(!date) return "";
    var momentStr = moment(date).fromNow();
    if (new Date(date).getDate() != new Date().getDate()) {
        return new Date(date).toUTCString();
    } else {
        return momentStr;
    }
}

const getAgreements = async (user) => {
    let lenderData = await node.callAPI("assets/search", {
        $query: {
            "assetName": config.BLOCKCLUSTER.agreementsAssetName,
            "status": "open",
            "active": true,
            "lenderEmail": user.email,
        },
        $sort: {
            timestamp: 1
        }
    });

    let borrowerData = await node.callAPI("assets/search", {
        $query: {
            "assetName": config.BLOCKCLUSTER.agreementsAssetName,
            "status": "open",
            "active": true,
            "borrowerEmail": user.email,
        },
        $sort: {
            timestamp: 1
        }
    });

    var data = [...lenderData, ...borrowerData];
    if (data.length > 0) {
        data.sort(function (a, b) {
            return a.agreementDate - b.agreementDate
        });

        for (var i = 0; i < data.length; i++) {
            data[i]["user"] = data[i].lender == user.username ? data[i].borrower : data[i].lender;
            data[i]["type"] = data[i].lender == user.username ? "Lend" : "Borrow";
            data[i]["nextPayment"] = data[i].emi;
        }

        return data;
    }
    return [];
}

const apply = async (user, orderId) => {
    try {

        let data = await node.callAPI("assets/search", {
            $query: {
                "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
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
                } else {
                    var userDbObj = await Users.findOne({
                        username: order.username
                    });
                    if (userDbObj) {
                        email = userDbObj.email;
                    }
                }

                //Locking the order to apply
                var res = await node.callAPI('assets/updateAssetInfo', {
                    assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                    fromAccount: node.getWeb3().eth.accounts[0],
                    identifier: orderId,
                    "public": {
                        show: false,
                    }
                });

                res = await LBOrders.deleteOne({
                    identifier: orderId
                });

                var withdrawal = await walletCont.sendToEscrow(user.email, coinAmtRequired, coinToescrow);

                if (withdrawal.message) {
                    throw withdrawal.message;
                } else {
                    withdrawal = withdrawal.dbObject;
                    var identifier = shortid.generate();
                    var newOrderData = {
                        orderType: order.orderType == "lend" ? "borrow" : "lend",
                        coin: order.coin,
                        collateral: order.collateral,
                        interest: order.interest,
                        duration: order.duration,
                        amount: order.amount,
                        amountReceived: withdrawal.amountReceived,
                        userId: user._id,
                        username: user.username,
                        email: user.email,
                        withdrawalId: withdrawal._id.toString(),
                        show: false,
                        agreementOrderId: "",
                        agreementDate: "",
                    }

                    if (newOrderData.orderType == "borrow") {
                        newOrderData["collateralDeducted"] = coinAmtRequired;
                    }

                    var dbObject = await Withdrawals.findById(withdrawal._id);
                    dbObject["orderInfo"] = {
                        orderId: identifier,
                        orderType: order.orderType == "lend" ? "borrow" : "lend",
                        orderAction: "Apply",
                        orderToApply: orderId,
                        data: newOrderData,
                    };
                    await dbObject.save();

                    var res = await node.callAPI('assets/issueSoloAsset', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        toAccount: node.getWeb3().eth.accounts[0],
                        identifier: identifier
                    });

                    console.log(res);
                    newOrderData["timeStamp"] = +new Date();

                    //update agreement meta data
                    res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: identifier,
                        "public": newOrderData
                    });

                    console.log(res);

                    return {
                        success: true
                    };
                }
            } else {
                throw {
                    message: "Insufficient balance in " + coinToescrow + " wallet. Required " + coinAmtRequired + " found " + balance
                };
            }
        } else {
            throw {
                message: "Order is not available to apply!"
            };
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
    deleteOrder,
    getFees,
};