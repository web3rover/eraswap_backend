const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallets');

router.get('/getHistory', async (req, res, next) => {
    walletController.getHistory(req.user.email,req.query.crypto).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    });
});

router.get('/getBalance', async (req, res, next) => {
    walletController.getBalance(req.user.email,req.query.crypto).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    });
});

router.get('/getAddress', async (req, res, next) => {
   
    try {
        var op = await walletController.getAddress(req.user.email, req.query.crypto);
        if (!op.error) {
            return res.json({ address: op });
        }
        else {
            return next({ message: op.error });
        }
    } catch (ex) {
        return next({ message: op.message });
    }
});

router.get('/getPrivateKey', async (req, res, next) => {
  
    try {
        var op = await walletController.getPrivateKey(req.user.email, req.query.crypto,req.user.username);
        if (!op.error) {
            return res.json({ address: op });
        }
        else {
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
  walletController.send(req.user.email,req.body.amount,req.body.receiver,req.body.crypto).then(data=>{
    return res.json(data);
  }).catch(error=>{
      return next(error);
  })
   
});

module.exports = router;