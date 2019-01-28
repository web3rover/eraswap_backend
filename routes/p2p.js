const express = require('express');
const router = express.Router();
const currencyCont = require('../controllers/p2p.cont');
const Coins = require('../models/Coins');
const config = require('../configs/config');

router.post('/add_buy_listing', (req, res, next) => {
  currencyCont
    .addListing({ show: true, wantsToBuy: true, email: req.user.email, username: req.user.username, userId: req.user._id, ...req.body })
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});
router.post('/add_sell_listing', (req, res, next) => {
  return Coins.findOne({ name: 'coinData', in: 'USD' })
    .select({ [req.body.cryptoCur]: 1, EST: 1 })
    .lean()
    .exec()
    .then(async data => {
      if (!data[req.body.cryptoCur]) {
        var capdata = await request(
          'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?convert=USD&CMC_PRO_API_KEY=' + config.coinMktCapKey + '&symbol=' + req.query.currency
        );
        var price = JSON.parse(capdata).data[req.body.cryptoCur].quote['USD']['price'];
        // await Coins.update({ name: 'coinData', in: 'USD' }, { $set: {  [req.query.currency]: price,in:'USD' } }, { upsert: true }).exec();
        data = { ...data, [req.body.cryptoCur]: price };
      }
      if (req.query.platform === 'EST') {
        walletCont
          .getBalance(req.user.email, 'EST')
          .then(balanceData => {
            const fromCurVal = Number(req.body.maxAmt) * data[req.body.cryptoCur];
            const eqvEstVal = fromCurVal / data['EST'];
            const deductableAmount = (eqvEstVal * (config.P2P_FEE / 2)) / 100; //usually for EST it will be half.

            if (balanceData && Number(balanceData.balance) >= deductableAmount) {
              currencyCont
                .addListing({ show: true, wantsToSell: true, email: req.user.email, username: req.user.username, userId: req.user._id, ...req.body })
                .then(data => {
                  return res.json(data);
                })
                .catch(error => {
                  return next(error);
                });
            } else {
              return next({ status: 400, message: 'User Does not have enough amount to payoff fee. required fee is ' + deductableAmount + 'EST' });
            }
          })
          .catch(error => {
            return next(error);
          });
      } else if (req.query.platform == 'source') {
        walletCont
          .getBalance(req.user.email, req.body.cryptoCur)
          .then(balanceData => {
            const deductableAmount = (Number(req.body.maxAmt) * config.P2P_FEE) / 100;

            if (balanceData && Number(balanceData.balance) >= deductableAmount) {
              currencyCont
                .addListing({ show: true, wantsToSell: true, email: req.user.email, username: req.user.username, userId: req.user._id, ...req.body })
                .then(data => {
                  return res.json(data);
                })
                .catch(error => {
                  return next(error);
                });
            } else {
              return next({ status: 400, message: 'User Does not have enough amount to payoff fee. required fee is ' + deductableAmount + 'EST' });
            }
          })
          .catch(error => {
            return next(error);
          });
      } else {
        return res.json(data);
      }
    })
    .catch(error => {
      return next(error);
    });
});
router.get('/search_listing', (req, res, next) => {
  console.log(req.query);
  currencyCont
    .searchListing(req.query, req.user._id)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.get('/my_listings', (req, res, next) => {
  currencyCont
    .getAllListings({ ...req.query, query: { userId: req.user._id } })
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});
router.get('/my_listings_count', (req, res, next) => {
  currencyCont
    .getListingCount({ userId: req.user._id })
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.get('/get_count', (req, res, next) => {
  currencyCont
    .getCount(req.query, req.user._id)
    .then(data => {
      return res.json({ count: data });
    })
    .catch(error => {
      return next(error);
    });
});
router.post('/change_status', (req, res, next) => {
  currencyCont
    .updateListing(req.user._id, req.body.id, req.body.active)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});
/**
 *  body:
 *  amountAsked
 * specialMessage
 * wantsToBuy
 * username // of opposite person
 */
router.post('/showInterest', (req, res, next) => {
  let message = {
    subject: `[Eraswap Marketplace] ${req.user.username} just showed interest on your listing.`,
    body: `<body>
                Hi, ${req.body.username},
                <br />
                ${req.user.username} Just showed You interest on your listing.
                <br />
                he/she Interested to ${req.body.wantsToBuy ? 'buy your' : 'sell to you'} the listed asset,
                <br />
                Special Message from user: <i><b>${req.body.specialMessage || '-'}</b></i>
                <br />
                Please contact to email: ${req.user.email} .
                <br />
                Thank you!
              </body>`,
  };
  const savableData = {
    userId: req.user._id,
    amount: req.body.askAmount,
    message: req.body.specialMessage,
    sellerEmail: req.body.wantsToBuy ? req.body.email : req.user.email,
    sellerFeeCoin: req.body.feeCoin,
  };

  currencyCont
    .recordRequest(req.body.uniqueIdentifier, req.body.wantsToBuy ? 'Buy' : 'Sell', savableData)
    .then(loggedData => {
      return currencyCont
        .showInterestMailSender(req.body, message, req.user.email)
        .then(data => {
          return res.json(data);
        })
        .catch(error => {
          return next(error);
        });
    })
    .catch(errorLogging => {
      return next(errorLogging);
    });
});

router.get('/getInterests', (req, res, next) => {
  currencyCont
    .getUserListInterests(req.query.listingId)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.post('/makeMatch', (req, res, next) => {
  /**
   * req.body:
   * listingId,
   * sellerEmail
   * requester
   * amount
   * cryptoCurrency
   */
  currencyCont
    .matchingHandler(req.body.listingId, req.body.sellerEmail, req.user._id, req.body.requester, req.body.amount, req.body.cryptoCurrency, req.body.feeCoin)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.get('/myListMatches', (req, res, next) => {
  currencyCont
    .getMyListMatches(req.user._id)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});
router.get('/requesterListMatches', (req, res, next) => {
  currencyCont
    .requesterListMatches(req.user._id)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});
router.get('/getMyOwnInterests', (req, res, next) => {
  currencyCont
    .getMyOwnInterests(req.user._id)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.get('/getMyrequests', (req, res, next) => {
  currencyCont
    .getSentInterests(req.user._id)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.post('/change_status_paid', (req, res, next) => {
  currencyCont
    .change_status_paid(req.body.id)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.post('/finishDeal', (req, res, next) => {
  currencyCont
    .finishDeal(req.body.id, req.body.record, req.body.item)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

module.exports = router;
