var Agenda = require('agenda');
var config = require('../configs/config');
var txnCont = require('../controllers/transaction');
var crypto = require('../helpers/cryptos');

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
    const failCount = job.attrs.failCount || 0;
return crypto.getCurrentMarket(jobData.exchangePlatform, jobData.symbol).then(curMar=>{
  return txnCont
  .verifyTxn(jobData.eraswapSendAddress, jobData.lctxid, jobData.tiMeFrom, jobData.exchangePlatform, jobData.exchFromCurrency, jobData.exchFromCurrencyAmt)
  .then(data => {
    // after 8*2 =10 minutes delete the job 
    if(failCount > 7 && !data.txIdExist){
      job.remove();
      done();
    }
    if (data.txIdExist && data.status == "ok" && !data.convertedYet) {
      txnCont.converTdata(curMar.symbol, jobData.lctxid,jobData.exchangePlatform,jobData.exchFromCurrency,jobData.exchToCurrency,jobData.exchFromCurrencyAmt)
      .then(conversation_data=>{
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
       
      }).catch(error_converting=>{
        done(error_converting);
      });
    }else if(data.convertedYet==="started"){
      txnCont.verifyConvertion(jobData.lctxid,jobData.exchangePlatform,curMar.symbol,jobData.exchFromCurrencyAmt).then(verified=>{
        if(!verified.verified && verified.canceled){
          job.remove();
          done();
        }
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
}).catch(error=>{
  done(error);
})
   
});



module.exports =agenda;
