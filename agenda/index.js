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
      if (data.txIdExist && data.status == "ok" && !data.convertedYet) {
        txnCont.converTdata(jobData.lctxid,jobData.exchangePlatform,jobData.exchFromCurrency,jobData.exchToCurrency,jobData.exchFromCurrencyAmt).then(conversation_data=>{
          if(conversation_data.status=="closed"&& conversation_data.cost ==jobData.exchFromCurrencyAmt){
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
          }
         
        }).catch(error_converting=>{
          done(error_converting);
        });
      }else if(data.convertedYet==="started"){
        txnCont.verifyConvertion(jobData.lctxid,jobData.exchangePlatform,jobData.exchFromCurrency+'/'+jobData.exchToCurrency).then(verified=>{
          if(verified.verified && verified.amtToSend){
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
        }).catch(error_verfctn=>{
          done(error_verfctn);
        });
      }else if(data.convertedYet==="finished" && data.amtToSend){
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
        message: error.message||'Verification failed.',
        error: error,
      });
    });
});



module.exports =agenda;
