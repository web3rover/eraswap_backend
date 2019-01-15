const express = require('express');
const router = express.Router();
const currencyCont = require('../controllers/currency');
const walletCont = require('../controllers/wallets');
const Coins = require('../models/Coins');
const request = require('request-promise');
const config = require('../configs/config');

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
  currencyCont
    .getMax(req.query.from, req.query.to)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});
router.get('/checkFee',async(req,res,next)=>{
  if(!req.query.amount || !req.query.fromSymbol){
    return next({
      status:400,
      message:'Invalid request.'
    })
  }
  const fromCurMarketVal = await request('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&CMC_PRO_API_KEY='+config.coinMktCapKey+'&symbol=' + req.query.fromSymbol);
     const fromCurVal = req.query.amount*JSON.parse(fromCurMarketVal).data[req.query.fromSymbol].quote.USD.price;
     const EST_VAL = await Coins.findOne({name:'coinData',in:'USD'}).select('EST').exec();
     const eqvEstVal = fromCurVal/EST_VAL['EST'];
    const ESTfeeAmt = (eqvEstVal * (config.PLATFORM_FEE / 2)) / 100;
    const SourcefeeAmt = (req.query.amount * config.PLATFORM_FEE)/100
    return res.json({
      EST:ESTfeeAmt.toFixed(3),
      [req.query.fromSymbol]:SourcefeeAmt.toFixed(3)
    });
});
router.get('/checkVal', (req, res, next) => {
  if (!req.query.currency) {
    return next({
      message: 'No Currency Found',
      status: 400,
    });
  }
  return Coins.findOne({ name: 'coinData', in: 'USD' })
    .select({ [req.query.currency]: 1, EST: 1 })
    .lean()
    .exec()
    .then(async data => {
      if (!data[req.query.currency]) {
        var capdata = await request(
          'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&CMC_PRO_API_KEY=' + config.coinMktCapKey + '&symbol=' + req.query.currency
        );
        var price = JSON.parse(capdata).data[req.query.currency].quote['USD']['price'];
        // await Coins.update({ name: 'coinData', in: 'USD' }, { $set: {  [req.query.currency]: price,in:'USD' } }, { upsert: true }).exec();
        data = { ...data, [req.query.currency]: price };
      }
      if (req.query.platform === 'EST') {
        walletCont
          .getBalance(req.user.email, 'EST')
          .then(balanceData => {
            const fromCurVal = Number(req.query.amount) * data[req.query.currency];
            const eqvEstVal = fromCurVal / data['EST'];
            const deductableAmount = (eqvEstVal * (config.PLATFORM_FEE / 2)) / 100; //usually for EST it will be half.

            if (balanceData && Number(balanceData.balance) >= deductableAmount) {
              console.log('Its having enough amount to pay');
              return res.json(data);
            } else {
              return next({ status: 400, message: 'User Does not have enough amount to payoff fee. required fee is ' + deductableAmount + 'EST' });
            }
          })
          .catch(error => {
            return next(error);
          });
      } 
      // else if (req.query.platform == "source") {
      //   walletCont
      //     .getBalance(req.user.email, req.query.currency)
      //     .then(balanceData => {
      //       const deductableAmount = (Number(req.query.amount) * config.PLATFORM_FEE) / 100;

      //       if (balanceData && Number(balanceData.balance) >= deductableAmount) {
      //         console.log('Its having enough amount to pay');
      //         return res.json(data);
      //       } else {
      //         return next({ status: 400, message: 'User Does not have enough amount to payoff fee. required fee is ' + deductableAmount + 'EST' });
      //       }
      //     })
      //     .catch(error => {
      //       return next(error);
      //     });
      // } 
      else {
        return res.json(data);
      }
    })
    .catch(error => {
      return next(error);
    });
});
router.get('/get_epositAddress', (req, res, next) => {
  if (!req.query.platform || !req.query.symbol) {
    return next({
      status: 400,
      message: 'Please pass all the params.',
    });
  }
  return currencyCont
    .getAddress(req.query.platform, req.query.symbol)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next({
        status: 400,
        message: error.message,
        stack: error.stack,
      });
    });
});
router.get('/getPrice', (req, res, next) => {
  const platform = req.query.platform;
  const symbol = req.query.symbol;
  if (!platform || !symbol) {
    return next({
      status: 400,
      message: 'Please pass all the params.',
    });
  }
  currencyCont
    .getCurrentMarket(platform, symbol)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next({
        status: 400,
        message: error.message,
        stack: error.stack,
      });
    });
});
router.get('/current_BTC', (req, res, next) => {
  let cryptoCur = req.query.cryptoCur;
  let cur = req.query.currency;
  return Coins.findOne({ name: 'coinData', in: cur })
    .select(cryptoCur)
    .exec()
    .then(data => {
      if (data) {
        const price = data[req.query.cryptoCur];
        return res.send({ data: price });
      } else {
        return next('Error Occured');
      }
    })
    .catch(error => {
      return next(error);
    });
});
module.exports = router;
