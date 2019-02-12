const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallets');

Array.prototype.equals = function(array) {
  // if the other array is a falsy value, return
  if (!array) return false;

  // compare lengths - can save a lot of time
  if (this.length != array.length) return false;

  for (var i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i])) return false;
    } else if (this[i] != array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
};
// Hide method from for-in loops
Object.defineProperty(Array.prototype, 'equals', { enumerable: false });

router.get('/getHistory', async (req, res, next) => {
  walletController
    .getHistory(req.user.email, req.query.crypto)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.get('/getBalance', async (req, res, next) => {
  walletController
    .getBalance(req.user.email, req.query.crypto)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

router.get('/getAddress', async (req, res, next) => {
  try {
    var op = await walletController.getAddress(req.user.email, req.query.crypto);
    if (!op.error) {
      return res.json({ address: op });
    } else {
      return next({ message: op.error });
    }
  } catch (ex) {
    return next({ message: op.message });
  }
});

router.get('/getPrivateKey', async (req, res, next) => {
  try {
    var op = await walletController.getPrivateKey(req.user.email, req.query.crypto, req.user.username);
    if (!op.error) {
      return res.json({ address: op });
    } else {
      return next({ message: op.error });
    }
  } catch (ex) {
    return next({ message: ex.message });
  }
});

router.post('/send', (req, res, next) => {
  /**
   *  Body needs
   *  crypto:
   *  receiver:
   *  amount:
   */
  const keys = ['receiver', 'amount', 'crypto'];
  if (
    !Object.keys(req.body)
      .sort()
      .equals(keys.sort())
  ) {
    return next({
      message: 'all keys are required.',
    });
  }
  const receiver = req.body.receiver;
  walletController
    .send(req.user.email, req.body.amount, receiver, req.body.crypto)
    .then(data => {
      return res.json(data);
    })
    .catch(error => {
      return next(error);
    });
});

module.exports = router;
