const express = require('express');
const router = express.Router();
const currencyCont = require('../controllers/p2p.cont');

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
  currencyCont
    .addListing({ show: true, wantsToSell: true, email: req.user.email, username: req.user.username, userId: req.user._id, ...req.body })
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});
router.get('/search_listing', (req, res, next) => {
  console.log(req.query);
  currencyCont
    .searchListing(req.query)
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
    .getCount(req.query)
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
  };

  currencyCont
    .recordRequest(req.body.uniqueIdentifier, req.body.wantsToBuy ? 'Sell' : 'Buy', savableData)
    .then(loggedData => {
      return currencyCont
        .showInterestMailSender(req.body, message,req.user.email)
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
    .matchingHandler(req.body.listingId, req.body.sellerEmail, req.user._id, req.body.requester, req.body.amount, req.body.cryptoCurrency)
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

router.get('/getMyrequests',(req,res,next)=>{
  currencyCont.getSentInterests(req.user._id).then(data => {
    return res.json(data);
  })
  .catch(error => {
    return next(error);
  });
});

router.post('/change_status_paid',(req,res,next)=>{
  currencyCont.change_status_paid(req.body.id).then(data => {
    return res.json(data);
  })
  .catch(error => {
    return next(error);
  });
});

router.post('/finishDeal',(req,res,next)=>{
  currencyCont.finishDeal(req.body.id,req.body.record,req.body.item).then(data => {
    return res.json(data);
  })
  .catch(error => {
    return next(error);
  });
});

module.exports = router;
