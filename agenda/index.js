var Agenda = require('agenda');
var config = require('../configs/config');
var txnCont = require('../controllers/transaction');
var crypto = require('../helpers/cryptos');
var RPCDirectory = require('../Nodes');

const ethRpc = RPCDirectory['Eth'];

const agenda = new Agenda({
    db: {
        address: config.mongo.url
    },
    collection: 'agendaJobs'
});

(async function () {
    await agenda.start();
    console.log("Started agenda");
})();

function reSchedule(error, job, seconds) {
    console.log("Rescheduling => ", job.attrs.name);
    agenda.schedule(new Date(Date.now() + (1000 * seconds)), job.attrs.name, job.attrs.data);
    job.remove();
    done(error);
}


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
                    txnCont.converTdata(curMar.symbol, jobData.lctxid, jobData.exchangePlatform, jobData.exchFromCurrency, jobData.exchToCurrency, jobData.exchFromCurrencyAmt)
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
    const { crypto, userPublicKey, gasEstimate, receiver, amount } = job.attrs.data;

    /*Send eth to receiver address and get the transaction hash*/
    console.log("Send " + gasEstimate + " eth to " + userPublicKey + " for gas.");
    try {
        var result = await ethRpc._getGasForTokenTransfer(gasEstimate, userPublicKey);
        if (!result.error) {
            agenda.schedule(new Date(Date.now() + 10000), 'Check confirmations', {
                crypto: crypto, txnHash: result.txHash,
                sender: userPublicKey, receiver: receiver, amount: amount
            });
            job.remove();
            done();
        }
        else {
            reSchedule(result.error, job, 5);
        }
    } catch (ex) {
        reSchedule(ex.message, job, 5);
    }
});

agenda.define('Check confirmations', async (job, done) => {
    const { crypto, txnHash, sender, receiver, amount } = job.attrs.data;
    try {
        var confirmations = await ethRpc._getConfirmations(txnHash);
        console.log("Confirmations:", confirmations);
        if (confirmations >= 14) {
            agenda.schedule(new Date(Date.now() + 2000), 'Send tokens', {
                crypto: crypto,
                sender: sender,
                receiver: receiver,
                amount: amount
            });
            job.remove();
            done();
        }
        else {
            reSchedule(null, job, 5);
        }
    } catch (ex) {
        reSchedule(ex.message, job, 5);
    }
});

agenda.define('Send tokens', async (job, done) => {
    const { crypto, sender, receiver, amount } = job.attrs.data;
    console.log("Sending tokens");

    try {
        var RPC = RPCDirectory[crypto];
        if (RPC && RPC._initiateTransfer) {
            var result = await RPC._initiateTransfer(sender, receiver, amount);
            if (result.error) {
                reSchedule(result.error, job, 5);
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
        reSchedule(ex.message, job, 5);
    }
});

module.exports = agenda;
