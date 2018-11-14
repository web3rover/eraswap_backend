const express = require('express');
const router = express.Router();
const currencyCont = require('../controllers/currency');
const request = require('request-promise');

router.get('/get_all_supported_currency', (req, res, next) => {
  currencyCont
    .get_supported_currency(req.query.keyWord)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next({
        message: 'Unknwn Error Occured.',
        error: error,
        status: 400,
      });
    });
});
router.get('/get_exchange_values', (req, res, next) => {
  currencyCont.getMax(req.query.from,req.query.to).then(data=>{
    return res.json(data)
  }).catch(error=>{
    return next(error);
  });
});
router.get('/get_epositAddress',(req,res,next)=>{
  if(!req.query.platform || !req.query.symbol){
    return next({
      status:400,
      message:"Please pass all the params."
    });
  }
  currencyCont.getAddress(req.query.platform,req.query.symbol).then(data=>{
    return res.json(data);
  }).catch(error=>{
    return next({
      status:400,
      message:error.message,
      stack:error.stack
    });
  })
});
router.get('/getPrice',(req,res,next)=>{
  const platform = req.query.platform;
  const symbol = req.query.symbol;
  if(!platform || !symbol){
    return next({
      status:400,
      message:"Please pass all the params."
    });
  }
  currencyCont.getCurrentMarket(platform,symbol).then(data=>{
    return res.json(data);
  }).catch(error=>{
    return next({
      status:400,
      message:error.message,
      stack:error.stack
    });
  })
});
router.get('/current_BTC',(req,res,next)=>{
  //https://blockchain.info/tobtc?currency=${req.query.currency}&value=1
  request.get(`https://localbitcoins.com/equation/btc_in_usd*USD_in_${req.query.currency}*1`).then(data=>{
    if(data){
      // const mainData= 1/data;
      return res.send({data:data});
    }else{
      return next("Error Occured");
    }
  }).catch(error=>{
    return next(error);
  })
})
module.exports = router;
