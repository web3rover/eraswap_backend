const express = require('express');
const router = express.Router();
const txnCont = require('../../controllers/admins/txns');

router.get('/list',(req,res,next)=>{
    txnCont.getTxns(req.query).then(data=>{
        console.log(data)
        return res.json(data)
    }).catch(error=>{
        return next(error);
    })
});

router.get('/search',(req,res,next)=>{
    txnCont.searchTxns(req.query).then(data=>{
        console.log(data)
        return res.json(data)
    }).catch(error=>{
        return next(error);
    })
});
router.get('/list_count',(req,res,next)=>{
    txnCont.getTxnCount().then(data=>{
        console.log(data)
        return res.json({totalCount:data})
    }).catch(error=>{
        return next(error);
    })
});


module.exports = router;