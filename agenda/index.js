var Agenda = require('agenda');
var config = require('../configs/config');
var txnCont = require('../controllers/transaction');

const agenda = new Agenda({
  db: {
    address: config.mongo.url
  },
  collection:'agendaJobs'
});

(async function() {
  await agenda.start();
  console.log("Started agenda");
})();


agenda.define('CheckForTxn and Send',(job,done)=>{
    // console.log(job.data);
    const jobData = job.attrs.data;
    txnCont
    .verifyTxn(jobData.eraswapSendAddress, jobData.lctxid, jobData.tiMeFrom, jobData.exchangePlatform, jobData.exchFromCurrency, jobData.exchFromCurrencyAmt)
    .then(data => {
      if (data.status === "ok") {
        txnCont
          .sendToCustomer(data._id, jobData.userID, jobData.exchangePlatform, jobData.eraswapSendAddress, jobData.totalExchangeAmout, jobData.exchToCurrency)
          .then(dataOfSending => {
            if (dataOfSending && dataOfSending.id) {
               return done();
               
            } else {
               return done({
                status: 400,
                message: 'We attempted to pay. we will try again, if not received within 5 hours,please contact support',
              });
            }
          })
          .catch(error_sending => {
            agenda.schedule('every 2 minutes','CheckForTxn and Send',jobData);
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
        message: 'Verification failed.',
        error: error,
      });
    });
});



module.exports =agenda;
