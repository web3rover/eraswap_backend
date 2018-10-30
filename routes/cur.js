const express = require('express');
const router = express.Router();
const currencyCont = require('../controllers/currency');

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
module.exports = router;
