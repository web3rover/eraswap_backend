const agenda = require('../../agenda');
const Wallets = require('../../models/Wallets');
const Web3 = require('web3');

var config = require('../../configs/config');
var mongoose = require('mongoose');

mongoose.connect(
    config.mongo.url,
    { useNewUrlParser: true }
);

var confirmations = 1;

async function getConfirmations(txHash) {
    if (1) {
        confirmations *= 4;
        return confirmations;
    }
    try {
        // Instantiate web3 with HttpProvider
        const web3 = new Web3('https://rinkeby.infura.io/')

        // Get transaction details
        const trx = await web3.eth.getTransaction(txHash)

        // Get current block number
        const currentBlock = await web3.eth.getBlockNumber()

        // When transaction is unconfirmed, its block number is null.
        // In this case we return 0 as number of confirmations
        return trx.blockNumber === null ? 0 : currentBlock - trx.blockNumber
    }
    catch (error) {
        console.log(error)
    }
}

agenda.define('send eth from gas tank', async (job, done) => {
    const { receiver } = job.attrs.data;
    /*Send eth to receiver address and get the transaction hash*/
    console.log("Send eth to receiver address and get the transaction hash");
    var txnHash = "123";
    if (txnHash) {
        agenda.schedule(new Date(Date.now() + 5000), 'Check confirmations1', { txnHash: txnHash });
        job.remove();
        done();
    }
});

agenda.define('Check confirmations1', async (job, done) => {
    const { txnHash } = job.attrs.data;
    var confs = await getConfirmations();
    console.log("Confirmations: " + confs);
    if (confirmations >= 14) {
        agenda.schedule(new Date(Date.now() + 5000), 'Send tokens1', {
            sender: "sender",
            receiver: "receiver",
            amount: "amount"
        });
        job.remove();
        done();
    }
    else {
        console.log("Rescheduling!!");
        agenda.schedule(new Date(Date.now() + 5000), 'Check confirmations1', { txnHash: txnHash });
        job.remove();
        done();
    }
});

agenda.define('Send tokens1', async (job, done) => {
    const { sender, receiver, amount } = job.attrs.data;
    //Send tokens and remove job
    console.log("Send tokens and remove job");
    job.remove();
    done();
});

(async function () {
    await agenda.start();

    await agenda.every('5 seconds', 'send eth from gas tank', { receiver: "address" });
})();