const express = require('express');
const router = express.Router();
const txnCont = require('../../controllers/admins/txns');

router.get('/txn',(req,res,next)=>{
    txnCont.getTxns(req.query).then(data=>{
        console.log(data)
        return res.json(data)
    }).catch(error=>{
        return next(error);
    })
});

outer.get('/txn_count',(req,res,next)=>{
    txnCont.getTxnCount().then(data=>{
        console.log(data)
        return res.json({totalCount:data})
    }).catch(error=>{
        return next(error);
    })
});


module.exports = router;