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
  return res.json([
    {
      name: 'bittrex',
      value: 10,
    },
    { name: 'binance', value: 100 },
    { name: 'poloniex', value: 18 },
    { name: 'kraken', value: 17.5 },
    { name: 'bitfinex', value: 6 },
  ]);
});

module.exports = router;
