var Agenda = require('agenda');
const request = require('request-promise');


var config = require('../configs/config');
var txnCont = require('../controllers/transaction');
var crypto = require('../helpers/cryptos');
var Users = require('../models/Users');
var Wallets = require('../models/Wallets');
var Coins = require('../models/Coins');
var ethRpc = null;

var Blockcluster = require('blockcluster');
const shortid = require("shortid");

const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.host,
    instanceId: config.BLOCKCLUSTER.instanceId
});

const agenda = new Agenda({
    db: {
        address: config.mongo.url
    },
    collection: 'agendaJobs'
});

var start = async function () {
    await agenda._ready;

    await agenda.start();

    await agenda.every('*/1 * * * *', 'fetch coin value');

    console.log("Started agenda");

    agenda.define('fetch coin value', async (job, done) => {
        const coins = ['ETH', 'BTC'];
        const currency = ["AED", "USD", "INR", "LBP", "BOB", "CRC", "PHP", "PLN", "JPY", "JOD", "PAB", "GBP", "DZD", "CHF", "ARS", "SAR", "EGP", "CNY", "ZAR", "OMR", "AUD", "SGD", "NOK", "MAD", "ILS", "NIO", "HKD", "TWD", "BGN", "ISK", "UYU", "KRW", "THB", "RSD", "IDR", "CLP", "RUB", "PEN", "DOP", "UAH", "CAD", "MXN", "NZD", "RON", "MKD", "GTQ", "SEK", "MYR", "QAR", "BHD", "HNL", "HRK", "COP", "ALL", "DKK", "BRL", "EUR", "HUF", "IQD"];

        for (let coin of coins) {
            for (let cur of currency) {
                try {
                    var data = await request('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=' + cur + '&CMC_PRO_API_KEY='
                        + config.coinMktCapKey + '&symbol=' + coin);
                    var price = JSON.parse(data).data[coin].quote[cur]['price'];
                    await Coins.update({ name: 'coinData', in: cur }, { $set: { [coin]: price, in: cur } }, { upsert: true }).exec();
                    if (coin == 'ETH') {
                        // may be get this val from an api
                        const currentESTPrice = config.EST_IN_ETH; //ETH value of EST
                        const EST = currentESTPrice * price; //USD value of EST
                        await Coins.update({ name: 'coinData', in: cur }, { $set: { EST: EST, EST_IN_ETH: currentESTPrice, in: cur } }, { upsert: true }).exec();
                    }
                } catch (ex) {
                    console.log(cur);
                    done(cur);
                }
            }
        }

        done();
    });


    agenda.define('CheckForTxn and Send', (job, done) => {
        // console.log(job.data);
        const jobData = job.attrs.data;
        const failCount = job.attrs.failCount || 0;
        return crypto.getCurrentMarket(jobData.exchangePlatform, jobData.symbol).then(curMar => {
            return txnCont
                .verifyTxn(jobData.eraswapSendAddress, jobData.lctxid, jobData.tiMeFrom, jobData.exchangePlatform, jobData.exchFromCurrency, jobData.exchFromCurrencyAmt)
                .then(data => {
                    // after 65*2 =130 minutes delete the job 
                    if (failCount > 65 && !data.txIdExist) {
                        job.remove();
                        done();
                    }
                    if (data.txIdExist && data.status == "ok" && !data.convertedYet) {
                        txnCont.converTdata(curMar.symbol, jobData.lctxid, jobData.exchangePlatform, jobData.exchFromCurrency, jobData.exchToCurrency, jobData.exchFromCurrencyAmt, jobData.platformFeePayOpt, jobData.userEmail)
                            .then(conversation_data => {
                                // if(conversation_data.status=="closed"&& conversation_data.cost ==jobData.exchFromCurrencyAmt){
                                //   txnCont
                                // .sendToCustomer(data._id, jobData.userID, jobData.exchangePlatform, jobData.eraswapSendAddress, data.amtToSend, jobData.exchToCurrency)
                                // .then(dataOfSending => {
                                //   if (dataOfSending && dataOfSending.id) {
                                //      job.remove();
                                //      done();
                                //   }
                                // })
                                // .catch(error_sending => {
                                //   return done({
                                //     stack: error_sending,
                                //   });
                                // });    
                                // }
                                done();

                            }).catch(error_converting => {
                                done(error_converting);
                            });
                    } else if (data.convertedYet === "started") {
                        txnCont.verifyConvertion(jobData.lctxid, jobData.exchangePlatform, curMar.symbol, jobData.exchFromCurrencyAmt).then(verified => {
                            if (!verified.verified && verified.canceled) {
                                job.remove();
                                done();
                            }
                            if (verified.verified && verified.amtToSend) {
                                txnCont
                                    .sendToCustomer(data._id, jobData.userID, jobData.exchangePlatform, jobData.eraswapSendAddress, verified.amtToSend, jobData.exchToCurrency)
                                    .then(dataOfSending => {
                                        if (dataOfSending && dataOfSending.id) {
                                            job.remove();
                                            done();
                                        }
                                    })
                                    .catch(error_sending => {
                                        return done({
                                            stack: error_sending,
                                        });
                                    });
                            }
                        }).catch(error_verfctn => {
                            console.log(1, JSON.stringify(error_verfctn));
                            done(error_verfctn);
                        });
                    } else if (data.convertedYet === "finished" && data.amtToSend) {
                        txnCont
                            .sendToCustomer(data._id, jobData.userID, jobData.exchangePlatform, jobData.eraswapSendAddress, data.amtToSend, jobData.exchToCurrency)
                            .then(dataOfSending => {
                                if (dataOfSending && dataOfSending.id) {
                                    job.remove();
                                    done();
                                }
                            })
                            .catch(error_sending => {
                                return done({
                                    stack: error_sending,
                                });
                            });
                    } else {
                        return done({
                            message: 'Verification failed. No deposit Found.',
                        });
                    }
                })
                .catch(error => {
                    console.log(2, JSON.stringify(error));
                    return done({
                        message: error.message || 'Verification failed.',
                        error: error,
                    });
                });
        }).catch(error => {
            console.log(3, JSON.stringify(error));
            done(error);
        })

    });

    agenda.define('supply eth for gas', async (job, done) => {
        const { crypto, userPublicKey, gasEstimate, receiver, amount, dbObject } = job.attrs.data;

        /*Send eth to receiver address and get the transaction hash*/
        console.log("Send " + gasEstimate + " eth to " + userPublicKey + " for gas.");
        try {
            ethRpc = ethRpc ? ethRpc : require('../Nodes').RPCDirectory['ETH'];
            var result = await ethRpc._getGasForTokenTransfer(gasEstimate, userPublicKey);
            if (!result.error && result.dbObject) {
                var txn = await require('../models/Withdrawal').findById(dbObject._id);
                txn["waitFor"] = result.dbObject._id;
                await txn.save();
                job.remove();
                done();
            }
            else {
                await reSchedule(result.error, job, 5, done);
            }
        } catch (ex) {
            await reSchedule(ex.message, job, 5, done);
        }
    });

    agenda.define('Check gas txn before token transfer', async (job, done) => {
        const { crypto, txnHash, sender, receiver, amount, dbObject } = job.attrs.data;
        try {
            var RPC = require('../Nodes').RPCDirectory[crypto];
            var confirmations = await RPC._getConfirmations(txnHash);
            console.log("Confirmations (gas):", confirmations, txnHash);
            if (confirmations >= 14) {
                await agenda.schedule("in 5 seconds", 'Send tokens', {
                    crypto: crypto,
                    sender: sender,
                    receiver: receiver,
                    amount: amount,
                    dbObject: dbObject,
                });
                job.remove();
                done();
            }
            else {
                await reSchedule(null, job, 5, done);
            }
        } catch (ex) {
            await reSchedule(ex.message, job, 5, done);
        }
    });

    agenda.define('Send tokens', async (job, done) => {
        const { crypto, sender, receiver, amount, dbObject } = job.attrs.data;
        console.log("Sending tokens");

        try {
            var RPC = require('../Nodes').RPCDirectory[crypto];
            if (RPC && RPC._initiateTransfer) {
                var result = await RPC._initiateTransfer(sender, receiver, amount, dbObject);
                if (result.error) {
                    await reSchedule(result.error, job, 5, done);
                } else {
                    job.remove();
                    done();
                }
            }
            else {
                console.log("RPC module or initiate transfer function missing!");
                job.remove();
                done("RPC module or initiate transfer function missing!");
            }
        } catch (ex) {
            await reSchedule(ex.message, job, 5, done);
        }
    });

    agenda.define('Check pending withdrawals', async (job, done) => {
        const Withdrawals = require('../models/Withdrawal');
        var pendingWithdrawals = await Withdrawals.find({
            status: "Pending",
            "txnHash": { "$exists": true, "$ne": "" },
            "error": "",
        });

        if (pendingWithdrawals) {
            for (var i = 0; i < pendingWithdrawals.length; i++) {
                try {
                    var RPC = require('../Nodes').RPCDirectory[pendingWithdrawals[i].type];
                    var confirmations = await RPC._getConfirmations(pendingWithdrawals[i].txnHash);
                    console.log("Confirmations (pending " + pendingWithdrawals[i].type + " transfer):", confirmations, pendingWithdrawals[i].txnHash);
                    if (confirmations >= 14) {
                        pendingWithdrawals[i]["status"] = "Confirmed";
                        await checkIfOrderAndUpdate(pendingWithdrawals[i]);
                        await pendingWithdrawals[i].save();

                        var dependentTxn = await checkDependancy(pendingWithdrawals[i]);
                        //crypto, txnHash, sender, receiver, amount, dbObject
                        if (dependentTxn) {
                            await agenda.schedule("in 5 seconds", "Check gas txn before token transfer", {
                                crypto: dependentTxn.type,
                                txnHash: pendingWithdrawals[i].txnHash,
                                sender: dependentTxn.txn.sender,
                                receiver: dependentTxn.txn.receiver,
                                amount: dependentTxn.txn.amount,
                                dbObject: dependentTxn
                            });
                        }
                    }
                    else {
                        pendingWithdrawals[i].status = "Checking Confirmation"
                        await pendingWithdrawals[i].save()
                        await agenda.every('5 seconds', 'Check confirmations for withdrawals',
                            { dbObject: pendingWithdrawals[i] });
                        job.remove();
                        done();
                    }
                } catch (ex) {
                    await reSchedule(ex.message, job, 10, done);
                }
            }
        }
        await reSchedule(null, job, 10, done);
    });

    agenda.define('Check confirmations for withdrawals', async (job, done) => {
        const { dbObject } = job.attrs.data;
        const Withdrawals = require('../models/Withdrawal');
        var withdrawal = await Withdrawals.findById(dbObject._id.toString());
        if (!withdrawal) {
            done();
        }
        try {
            if (withdrawal.status != "Error") {
                var RPC = require('../Nodes').RPCDirectory[withdrawal.type];
                var confirmations = await RPC._getConfirmations(dbObject.txnHash);
                console.log("Confirmations (" + dbObject.type + "):", confirmations, dbObject.txnHash);
                var withdrawal = await Withdrawals.findById(dbObject._id.toString());
                if (confirmations >= 14 && withdrawal.type != "BTC") {
                    if (withdrawal) {
                        withdrawal.status = "Confirmed";
                        await checkIfOrderAndUpdate(withdrawal);
                        await withdrawal.save();

                        var dependentTxn = await checkDependancy(withdrawal);
                        //crypto, txnHash, sender, receiver, amount, dbObject
                        if (dependentTxn) {
                            await agenda.schedule("in 5 seconds", "Check gas txn before token transfer", {
                                crypto: dependentTxn.type,
                                txnHash: withdrawal.txnHash,
                                sender: dependentTxn.txn.sender,
                                receiver: dependentTxn.txn.receiver,
                                amount: dependentTxn.txn.amount,
                                dbObject: dependentTxn
                            });
                        }
                    }
                    job.remove();
                    done();
                }
                else if (withdrawal.type == "BTC" && confirmations > 4) {
                    if (withdrawal) {
                        withdrawal.status = "Confirmed";
                        await checkIfOrderAndUpdate(withdrawal);
                        await withdrawal.save();
                    }
                }
                else {
                    await reSchedule(null, job, 10, done);
                }
            } else {
                job.remove();
                done();
            }
        } catch (ex) {
            await reSchedule(ex.message, job, 10, done);
        }
    });

    agenda.define('On error reSchedule withdrawals', async (job, done) => {
        const Withdrawals = require('../models/Withdrawal');
        var failedWithdrawals = await Withdrawals.find({
            status: "Error",
            "error": { "$exists": true, "$ne": "" }
        });
        if (failedWithdrawals) {
            for (var i = 0; i < failedWithdrawals.length; i++) {
                try {
                    var txn = failedWithdrawals[i];
                    txn.status = "Retrying"
                    txn = await txn.save();
                    if (txn.type == "ETH") {
                        var RPC = require('../Nodes').RPCDirectory[txn.type];
                        await RPC.resend(txn);
                    }
                    else if (txn.type == "BTC") {

                    }
                    else {
                        await agenda.schedule("in 5 seconds", 'Send tokens', {
                            crypto: txn.type,
                            sender: txn.txn.sender,
                            receiver: txn.txn.receiver,
                            amount: txn.txn.amount,
                            dbObject: txn,
                        });
                    }
                } catch (ex) {
                    await reSchedule(ex.message, job, 5, done);
                }
            }
        }
        await reSchedule(null, job, 10, done);
    });

    agenda.define('Check missing wallets and add', async (job, done) => {
        var rpcDirectory = require('../Nodes').RPCDirectory;
        var wallets = Object.keys(rpcDirectory);
        var len = wallets.length;
        var str = "wallet"
        var allUsers = Users.find({ walletCreationInProgress: false, activated: true }).populate('wallet');
        var incompleteWallets = await allUsers.$where('this.wallet.length < 3').exec();
        if (incompleteWallets.length > 0) {
            for (var i = 0; i < incompleteWallets.length; i++) {
                await addMissingWallets(incompleteWallets[i]);
            }
        }
        reSchedule(null, job, 30, done);
    });

    agenda.define('Match orders and create agreements', async (job, done) => {
        try {
            let lendingOrders = await node.callAPI("assets/search", {
                $query: {
                    "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
                    "show": true,
                    "status": "open",
                    "agreementDate": "",
                    "agreementOrderId": "",
                    "orderType": "lend"
                }
            });
            if (lendingOrders.length > 0) {
                let borrowingOrders = await node.callAPI("assets/search", {
                    $query: {
                        "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
                        "show": true,
                        "status": "open",
                        "agreementDate": "",
                        "agreementOrderId": "",
                        "orderType": "borrow"
                    }
                });
                if (borrowingOrders.length > 0) {
                    var skip = [];
                    for (var i = 0; i < lendingOrders.length; i++) {
                        for (var j = 0; j < borrowingOrders.length; j++) {
                            if (skip.indexOf(j) == -1 && lendingOrders[i].username != borrowingOrders[j].username && lendingOrders[i].coin == borrowingOrders[j].coin && lendingOrders[i].collateral == borrowingOrders[j].collateral
                                && lendingOrders[i].interest == borrowingOrders[j].interest && lendingOrders[i].duration == borrowingOrders[j].duration
                                && lendingOrders[i].amount == borrowingOrders[j].amount) {
                                console.log("Orders matched!!", lendingOrders[i].uniqueIdentifier, borrowingOrders[j].uniqueIdentifier);
                                var res = await createAgreement(lendingOrders[i], borrowingOrders[j]);
                                console.log(res);
                                skip.push(j);
                                break;
                            }
                        }
                    }
                }
            }
            reSchedule(null, job, 20, done);
        }
        catch (ex) {
            console.log(ex);
            reSchedule(null, job, 20, done);
        }
    });

    agenda.define('Handle Borrowers emi', async (job, done) => {
        try {
            var agreements = await node.callAPI("assets/search", {
                $query: {
                    "assetName": config.BLOCKCLUSTER.agreementsAssetName,
                    "status": "open",
                    "active": true,
                }
            });

            const Withdrawals = require('../models/Withdrawal');
            const walletCont = require('../controllers/wallets');
            const escrowCont = require('../controllers/escrow.cont');

            var today = new Date();
            var date = today.getDate();
            var currentMonth = today.getMonth();
            var year = today.getFullYear();

            for (var i = 0; i < agreements.length; i++) {

                var payUsingCollateral = false;
                var paymentDate = new Date(agreements[i].nextPaymentDate);

                if (paymentDate.getMonth() == currentMonth && paymentDate.getFullYear() == year && paymentDate.getDate() == date) {

                    var coinBalance = await walletCont.getBalance(agreements[i].borrowerEmail, agreements[i].coin);
                    if (!coinBalance.message) {
                        coinBalance = coinBalance.balance;

                        var receiverKey = await walletCont.getAddress(agreements[i].lenderEmail, agreements[i].coin);
                        if (receiverKey.message) {
                            throw receiverKey;
                        }
                        if (coinBalance > agreements[i].emi) {
                            var emiDeduction = await walletCont.send(agreements[i].borrowerEmail, agreements[i].emi, receiverKey, agreements[i].coin);

                            if (emiDeduction.success) {
                                var dbObject = await Withdrawals.findById(emiDeduction.dbObject._id);
                                dbObject["agreementInfo"] = {
                                    agreementId: agreements[i].uniqueIdentifier,
                                    type: "emi payment",
                                    mode: "coin"
                                };
                                dbObject = await dbObject.save();

                                var nextPaymentDate = new Date(agreements[i].nextPaymentDate)
                                var paymentDate = + nextPaymentDate.setDate(nextPaymentDate.getDate() + Number(30));

                                var res = await node.callAPI('assets/updateAssetInfo', {
                                    assetName: config.BLOCKCLUSTER.agreementsAssetName,
                                    fromAccount: node.getWeb3().eth.accounts[0],
                                    identifier: agreements[i].uniqueIdentifier,
                                    "public": {
                                        nextPaymentDate: paymentDate,
                                    }
                                });

                                console.log(res);
                            }
                            else {
                                payUsingCollateral = true;
                            }
                        }
                        if (payUsingCollateral || coinBalance < agreements[i].emi) {
                            var receiverCollateralKey = await walletCont.getAddress(agreements[i].lenderEmail, agreements[i].collateralCoin);
                            if (receiverCollateralKey.message) {
                                throw receiverCollateralKey;
                            }
                            var emiDeductionInCollateral = await escrowCont.send(agreements[i].collateralCoin, receiverCollateralKey, agreements[i].emiInCollateral);
                            if (emiDeductionInCollateral.success) {
                                var dbObject = await Withdrawals.findById(emiDeductionInCollateral.dbObject._id);
                                dbObject["agreementInfo"] = {
                                    agreementId: agreements[i].uniqueIdentifier,
                                    type: "emi payment",
                                    mode: "collateral"
                                };
                                dbObject = await dbObject.save();

                                var today = new Date();
                                var paymentDate = + today.setDate(today.getDate() + Number(30));

                                var res = await node.callAPI('assets/updateAssetInfo', {
                                    assetName: config.BLOCKCLUSTER.agreementsAssetName,
                                    fromAccount: node.getWeb3().eth.accounts[0],
                                    identifier: agreements[i].uniqueIdentifier,
                                    "public": {
                                        nextPaymentDate: paymentDate,
                                    }
                                });

                                console.log(res);
                            }
                            else {
                                console.log(emiDeductionInCollateral);
                            }
                        }
                    }
                    else {
                        console.log(balance);
                    }
                }
            }

            reSchedule(null, job, 60 * 60 * 24, done);
        } catch (ex) {
            console.log(ex);
            reSchedule(ex.message, job, 10, done);
        }
    });

    await agenda.schedule('in 20 seconds', 'Match orders and create agreements');

    await agenda.schedule('in 30 seconds', 'Check missing wallets and add');

    await agenda.schedule('in 15 seconds', 'Check pending withdrawals');

    await agenda.schedule('in 15 seconds', 'On error reSchedule withdrawals');

    await agenda.schedule('in 20 seconds', 'Handle Borrowers emi');
};

start();

async function createAgreement(lendingOrder, borrowingOrder) {
    try {
        if (lendingOrder && borrowingOrder) {

            lendingOrder = await node.callAPI("assets/search", {
                $query: {
                    "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
                    "uniqueIdentifier": lendingOrder.uniqueIdentifier
                }
            });

            borrowingOrder = await node.callAPI("assets/search", {
                $query: {
                    "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
                    "uniqueIdentifier": borrowingOrder.uniqueIdentifier
                }
            });

            if (lendingOrder.length > 0 && borrowingOrder.length > 0) {
                if (lendingOrder[0].show && borrowingOrder[0].show) {

                    lendingOrder = lendingOrder[0];
                    borrowingOrder = borrowingOrder[0];

                    var res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: lendingOrder.uniqueIdentifier,
                        "public": {
                            show: false,
                        }
                    });

                    console.log(res);

                    res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: borrowingOrder.uniqueIdentifier,
                        "public": {
                            show: false,
                        }
                    });

                    console.log(res);

                    var identifier = shortid.generate();
                    res = await node.callAPI('assets/issueSoloAsset', {
                        assetName: config.BLOCKCLUSTER.agreementsAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        toAccount: node.getWeb3().eth.accounts[0],
                        identifier: identifier
                    });

                    console.log(res);
                    var timestamp = + new Date();
                    var month = new Date(timestamp).getMonth() + 1;
                    var year = new Date(timestamp).getFullYear();

                    var principlePerMonth = lendingOrder.amount / lendingOrder.duration;
                    var interest = principlePerMonth * lendingOrder.interest / 100;
                    var emi = principlePerMonth + interest;

                    var principlePerMonthInCollateral = borrowingOrder.collateralDeducted / lendingOrder.duration;
                    var interestInCollateral = principlePerMonthInCollateral * lendingOrder.interest / 100;
                    var emiInCollateral = principlePerMonthInCollateral + interest;

                    var agreementData = new Date(timestamp);
                    var paymentDate = + agreementData.setDate(agreementData.getDate() + Number(30));

                    let fee = 0;
                    if (lendingOrder.coin == 'EST') {
                        fee = (lendingOrder.amount * (config.LB_FEE / 2)) / 100;
                    } else {
                        fee = (lendingOrder.amount * (config.LB_FEE)) / 100;
                    }

                    var agreementData = {
                        lendOrderId: lendingOrder.uniqueIdentifier,
                        borrowOrderId: borrowingOrder.uniqueIdentifier,
                        lenderEmail: lendingOrder.email,
                        borrowerEmail: borrowingOrder.email,
                        lender: lendingOrder.username,
                        borrower: borrowingOrder.username,
                        coin: lendingOrder.coin,
                        amount: lendingOrder.amount,
                        fee: fee,
                        collateralCoin: lendingOrder.collateral,
                        interest: lendingOrder.interest,
                        months: lendingOrder.duration,
                        agreementDate: timestamp,
                        nextPaymentDate: paymentDate,
                        emiPaidCount: 0,
                        emiPaidInCollateral: 0,
                        emi: emi,
                        emiInCollateral: emiInCollateral,
                        active: true,
                    };

                    //update agreement meta data
                    res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.agreementsAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: identifier,
                        "public": agreementData
                    });

                    console.log(res);

                    lendingOrder["agreementOrderId"] = identifier;
                    lendingOrder["agreementDate"] = timestamp;

                    borrowingOrder["agreementOrderId"] = identifier;
                    borrowingOrder["agreementDate"] = timestamp;


                    var res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: lendingOrder.uniqueIdentifier,
                        "public": lendingOrder
                    });

                    console.log(res);

                    var res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: borrowingOrder.uniqueIdentifier,
                        "public": borrowingOrder
                    });

                    console.log(res);

                    var escrowCont = require('../controllers/escrow.cont');
                    var walletCont = require('../controllers/wallets');

                    var amountAfterFeeDeduction = (agreementData.amount - fee);

                    var publicKey = await walletCont.getAddress(borrowingOrder.email, agreementData.coin);
                    if (!publicKey.error) {
                        var op = await escrowCont.send(agreementData.coin, publicKey, amountAfterFeeDeduction);
                        console.log(op);
                    }
                    else {
                        throw { message: publicKey.error };
                    }
                }
            }
        }
    } catch (ex) {
        console.log(ex);
    }
}

async function addMissingWallets(user) {
    try {
        var foundUser = await Users.findById(user._id);
        if (foundUser) {
            foundUser.walletCreationInProgress = true;
            await foundUser.save();
        }
        else {
            console.log("User " + foundUser.username + " not found!");
        }
        var RPCDirectory = require('../Nodes').RPCDirectory;
        var walletlist = Object.keys(RPCDirectory);

        var found = false;
        for (var i = 0; i < walletlist.length; i++) {
            found = false;
            for (var j = 0; j < user.wallet.length; j++) {
                if (user.wallet[j].type == walletlist[i].toLowerCase()) {
                    console.log("Escrow wallet found", walletlist[i]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                var RPC = RPCDirectory[walletlist[i]];
                var newWallet = await RPC.createWallet(user.email);
                newWallet = { ...newWallet, type: walletlist[i].toLowerCase(), owner: user._id }
                var wallet = await new Wallets(newWallet).save();
                console.log(walletlist[i] + " " + "Wallet created for user: " + user.username);
                foundUser = await Users.findById(user._id);
                if (foundUser) {
                    foundUser.wallet.push(wallet._id);
                    foundUser.walletCreationInProgress = false;
                    await foundUser.save();
                }
                else {
                    console.log("User " + foundUser.username + " not found!");
                }
            }
        }
    } catch (ex) {
        console.log(ex);
    }
}

async function checkDependancy(txn) {
    try {
        var Withdrawal = require('../models/Withdrawal');
        var withdrawal = await Withdrawal.findOne({ waitFor: txn._id, status: { "$exists": true, "$ne": "Confirmed" } });
        if (withdrawal) {
            return withdrawal;
        }
    } catch (ex) {
        console.log(ex);
        return ex;
    }
}

function getLastDateOfMonth(Year, Month) {
    return (new Date((new Date(Year, Month + 1, 1)) - 1));
}

async function checkIfOrderAndUpdate(withdrawal) {
    const Withdrawals = require('../models/Withdrawal');
    if (withdrawal && withdrawal.orderInfo) {
        if (withdrawal.orderInfo.orderId && withdrawal.orderInfo.orderAction == "Creation") {
            try {
                var orderData = await node.callAPI("assets/search", {
                    $query: {
                        "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
                        "uniqueIdentifier": withdrawal.orderInfo.orderId
                    }
                });

                if (orderData.length > 0) {
                    if (orderData[0].show == true)
                        return;
                    var res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: withdrawal.orderInfo.orderId,
                        "public": {
                            show: true,
                        }
                    });

                    console.log(res);
                    return;
                }
                else {
                    var identifier = shortid.generate();

                    var res = await node.callAPI('assets/issueSoloAsset', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        toAccount: node.getWeb3().eth.accounts[0],
                        identifier: identifier
                    });

                    console.log(res);

                    orderData = withdrawal.orderInfo.data;
                    orderData["show"] = true;

                    //update agreement meta data
                    res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: identifier,
                        "public": orderData
                    });

                    console.log(res);

                    var dbObj = await Withdrawals.findById(withdrawal._id);
                    dbObj.orderInfo.orderId = identifier;
                    await dbObj.save();
                }
            } catch (ex) {
                var dbObj = await Withdrawals.findById(withdrawal._id);
                dbObj.status = "Pending";
                await dbObj.save();

                console.log(ex.message);
                return;
            }
        }
        else if (withdrawal.orderInfo.orderId && withdrawal.orderInfo.orderAction == "Apply") {
            try {
                var newOrderData = await node.callAPI("assets/search", {
                    $query: {
                        "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
                        "uniqueIdentifier": withdrawal.orderInfo.orderId,
                    }
                });

                if (newOrderData.length > 0) {
                    var order1 = newOrderData[0];
                    if (order1["agreementDate"] == "" && order1["status"] == "open" && order1["agreementOrderId"] == "") {

                        let data1 = await node.callAPI("assets/search", {
                            $query: {
                                "assetName": config.BLOCKCLUSTER.LendBorrowAssetName,
                                "uniqueIdentifier": withdrawal.orderInfo.orderToApply,
                                "agreementDate": "",
                                "status": "open",
                                "agreementOrderId": "",
                            }
                        });

                        if (data1.length > 0) {

                            var order2 = data1[0];

                            var lendOrder = withdrawal.orderInfo.orderType == "lend" ? order1 : order2;
                            var borrowOrder = withdrawal.orderInfo.orderType == "borrow" ? order1 : order2;

                            var identifier = shortid.generate();
                            var res = await node.callAPI('assets/issueSoloAsset', {
                                assetName: config.BLOCKCLUSTER.agreementsAssetName,
                                fromAccount: node.getWeb3().eth.accounts[0],
                                toAccount: node.getWeb3().eth.accounts[0],
                                identifier: identifier
                            });

                            console.log(res);
                            var timestamp = + new Date();
                            var paymentDate = new Date(timestamp).setDate(new Date(timestamp).getDate() + Number(30));
                            var month = new Date(timestamp).getMonth() + 1;
                            var year = new Date(timestamp).getFullYear();

                            var principlePerMonth = lendOrder.amount / lendOrder.duration;
                            var interest = principlePerMonth * lendOrder.interest / 100;
                            var emi = principlePerMonth + interest;

                            var principlePerMonthInCollateral = borrowOrder.collateralDeducted / lendOrder.duration;
                            var interestInCollateral = principlePerMonthInCollateral * lendOrder.interest / 100;
                            var emiInCollateral = principlePerMonthInCollateral + interest;

                            let fee = 0;
                            if (lendOrder.coin == 'EST') {
                                fee = (lendOrder.amount * (config.LB_FEE / 2)) / 100;
                            } else {
                                fee = (lendOrder.amount * (config.LB_FEE)) / 100;
                            }

                            var agreementData = {
                                lendOrderId: lendOrder.uniqueIdentifier,
                                borrowOrderId: borrowOrder.uniqueIdentifier,
                                lenderEmail: lendOrder.email,
                                borrowerEmail: borrowOrder.email,
                                lender: lendOrder.username,
                                borrower: borrowOrder.username,
                                coin: lendOrder.coin,
                                collateralCoin: lendOrder.collateral,
                                interest: lendOrder.interest,
                                amount: lendOrder.amount,
                                fee: fee,
                                months: lendOrder.duration,
                                agreementDate: timestamp,
                                nextPaymentDate: + paymentDate,
                                emi: emi,
                                emiInCollateral: emiInCollateral,
                                emiPaidCount: 0,
                                emiPaidInCollateral: 0,
                                active: true,
                            };

                            //update agreement meta data
                            res = await node.callAPI('assets/updateAssetInfo', {
                                assetName: config.BLOCKCLUSTER.agreementsAssetName,
                                fromAccount: node.getWeb3().eth.accounts[0],
                                identifier: identifier,
                                "public": agreementData
                            });

                            lendOrder["agreementOrderId"] = identifier;
                            lendOrder["agreementDate"] = timestamp;

                            borrowOrder["agreementOrderId"] = identifier;
                            borrowOrder["agreementDate"] = timestamp;


                            var res = await node.callAPI('assets/updateAssetInfo', {
                                assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                                fromAccount: node.getWeb3().eth.accounts[0],
                                identifier: lendOrder.uniqueIdentifier,
                                "public": lendOrder
                            });

                            console.log(res);

                            var res = await node.callAPI('assets/updateAssetInfo', {
                                assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                                fromAccount: node.getWeb3().eth.accounts[0],
                                identifier: borrowOrder.uniqueIdentifier,
                                "public": borrowOrder
                            });

                            console.log(res);

                            var escrowCont = require('../controllers/escrow.cont');
                            var walletCont = require('../controllers/wallets');

                            var amountAfterFeeDeduction = (agreementData.amount - fee);

                            var borrowerPublicKey = await walletCont.getAddress(borrowOrder.email, agreementData.coin);
                            var op = await escrowCont.send(agreementData.coin, borrowerPublicKey, amountAfterFeeDeduction);

                            console.log(op);

                            return;

                        } else {
                            throw { message: "Order does not exists!" };
                        }
                    }
                    else {
                        return;
                    }
                }
                else {
                    var identifier = shortid.generate();

                    var res = await node.callAPI('assets/issueSoloAsset', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        toAccount: node.getWeb3().eth.accounts[0],
                        identifier: identifier
                    });

                    console.log(res);

                    var data = withdrawal.orderInfo.data;
                    data["show"] = true;

                    //update agreement meta data
                    res = await node.callAPI('assets/updateAssetInfo', {
                        assetName: config.BLOCKCLUSTER.LendBorrowAssetName,
                        fromAccount: node.getWeb3().eth.accounts[0],
                        identifier: identifier,
                        "public": data
                    });

                    console.log(res);

                    var dbObj = await Withdrawals.findById(withdrawal._id);
                    dbObj.orderInfo.orderId = identifier;
                    await dbObj.save();
                }
            } catch (ex) {
                var dbObj = await Withdrawals.findById(withdrawal._id);
                dbObj.status = "Pending";
                await dbObj.save();

                console.log(ex.message);
                return;
            }
        }
    }
    else if (withdrawal && withdrawal.agreementInfo) {
        try {
            let agreementData = await node.callAPI("assets/search", {
                $query: {
                    "assetName": config.BLOCKCLUSTER.agreementsAssetName,
                    "uniqueIdentifier": withdrawal.agreementInfo.agreementId,
                    "status": "open",
                    "active": true,
                }
            });

            if (agreementData.length > 0) {
                var agreement = agreementData[0];

                var updates = {};
                if (withdrawal.agreementInfo.mode == "coin") {
                    updates["emiPaidCount"] = agreement.emiPaidCount + 1;
                } else {
                    updates["emiPaidInCollateral"] = agreement.emiPaidInCollateral + 1;
                }

                if (agreement.months == (agreement.emiPaidCount + agreement.emiPaidInCollateral + 1)) {
                    updates["nextPaymentDate"] = "";
                    updates["active"] = false;
                    updates["agreementEndDate"] = + new Date();
                }

                var res = await node.callAPI('assets/updateAssetInfo', {
                    assetName: config.BLOCKCLUSTER.agreementsAssetName,
                    fromAccount: node.getWeb3().eth.accounts[0],
                    identifier: agreement.uniqueIdentifier,
                    "public": updates
                });

                console.log(res);
            }
            else {
                throw { message: "Agreement" + withdrawal.agreementInfo.agreementId + "not found!" };
            }
        } catch (ex) {
            console.log(ex);
        }
    }
}

function findDaysDifference(date1, date2) {
    //Get 1 day in milliseconds
    var oneDay_ms = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = date2_ms - date1_ms;

    // Convert back to days and return
    return Math.round(difference_ms / oneDay_ms);
}

async function reSchedule(error, job, seconds, done) {
    //console.log("Rescheduling => ", job.attrs.name);
    await agenda.schedule("in " + seconds + " seconds", job.attrs.name, job.attrs.data);
    job.remove();
    done(error);
}

module.exports = agenda;
