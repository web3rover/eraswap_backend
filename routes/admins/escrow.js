const express = require('express');
const router = express.Router();
const escrowCont = require('../../controllers/admins/escrow');


router.post('/send',(req,res,next)=>{
    if(!req.user.admin){
        return next({status:401,message:"UnAuth"});
    }
    escrowCont.sendAmount(req.body.toAddress,req.body.amount,req.body.crypto).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});

router.get('/getDetails',(req,res,next)=>{
    if(!req.query.crypto){
        return next({status:400,message:"No Coin Found!"});
    }
    escrowCont.getDetails(req.query.crypto).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});

module.exports =router;