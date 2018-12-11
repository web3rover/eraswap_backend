const express = require('express');
const router = express.Router();
const userCont = require('../../controllers/admins/users');

router.get('/list',(req,res,next)=>{
   userCont.getListUsers(req.query).then(data=>{
       return res.json(data)
   }).catch(error=>{
       return next(error);
   })
});

router.get('/list_count',(req,res,next)=>{
    userCont.getAllUserCount().then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    });
});

router.get('/walletDetails',(req,res,next)=>{
    userCont.getUserWalletAndBalance(req.query.email).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error)
    });
});

module.exports = router;