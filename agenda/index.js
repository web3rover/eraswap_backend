var Agenda = require('agenda');
var config = require('../configs/config');
var txnCont = require('../controllers/transaction');
var crypto = require('../helpers/cryptos');
var ethRpc = null;

const agenda = new Agenda({
    db: {
        address: config.mongo.url
    },
    collection: 'agendaJobs'
});

var start = async function () {
    await agenda._ready;

    await agenda.start();
    console.log("Started agenda");

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
                        txnCont.converTdata(curMar.symbol, jobData.lctxid, jobData.exchangePlatform, jobData.exchFromCurrency, jobData.exchToCurrency, jobData.exchFromCurrencyAmt,jobData.platformFeePayOpt)
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
                    return done({
                        message: error.message || 'Verification failed.',
                        error: error,
                    });
                });
        }).catch(error => {
            done(error);
        })

    });

    agenda.define('supply eth for gas', async (job, done) => {
        const { crypto, userPublicKey, gasEstimate, receiver, amount, dbObject } = job.attrs.data;

        /*Send eth to receiver address and get the transaction hash*/
        console.log("Send " + gasEstimate + " eth to " + userPublicKey + " for gas.");
        try {
            ethRpc = ethRpc ? ethRpc : require('../Nodes').RPCDirectory['Eth'];
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
                        await pendingWithdrawals[i].save();

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
        try {
            if (withdrawal.status != "Error") {
                var RPC = require('../Nodes').RPCDirectory[withdrawal.type];
                var confirmations = await RPC._getConfirmations(dbObject.txnHash);
                console.log("Confirmations (" + dbObject.type + "):", confirmations, dbObject.txnHash);
                var withdrawal = await Withdrawals.findById(dbObject._id.toString());
                if (confirmations >= 14 && withdrawal.type != "Btc") {
                    if (withdrawal) {
                        withdrawal.status = "Confirmed";
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
                else if (withdrawal.type == "Btc" && confirmations > 4) {
                    if (withdrawal) {
                        withdrawal.status = "Confirmed";
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
                    if (txn.type == "Eth") {
                        var RPC = require('../Nodes').RPCDirectory[txn.type];
                        await RPC.resend(txn);
                    }
                    else if (txn.type == "Btc") {

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

    await agenda.every('15 seconds', 'Check pending withdrawals');

    await agenda.every('15 seconds', 'On error reSchedule withdrawals');

};

start();

async function checkDependancy(txn) {
    try {
        var withdrawal = await require('../models/Withdrawal')
            .findOne({ waitFor: txn._id, status: { "$exists": true, "$ne": "Confirmed" } });
        if (withdrawal) {
            return withdrawal;
        }
    } catch (ex) {
        console.log(ex);
        return ex;
    }
}


async function reSchedule(error, job, seconds, done) {
    console.log("Rescheduling => ", job.attrs.name);
    await agenda.schedule("in " + seconds + " seconds", job.attrs.name, job.attrs.data);
    job.remove();
    done(error);
}

module.exports = agenda;
