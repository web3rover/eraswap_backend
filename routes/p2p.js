const express = require('express');
const router = express.Router();
const currencyCont = require('../controllers/p2p.cont');

router.post('/add_buy_listing',(req,res,next)=>{
    currencyCont.addListing({wantsToBuy:true,username:req.user.username,userId:req.user._id,...req.body}).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});
router.post('/add_sell_listing',(req,res,next)=>{
    currencyCont.addListing({wantsToSell:true,username:req.user.username,userId:req.user._id,...req.body}).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});
router.get('/search_listing',(req,res,next)=>{
    console.log(req.query);
    currencyCont.searchListing(req.query).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});

router.get('/get_count',(req,res,next)=>{
    currencyCont.getCount(req.query).then(data=>{
        return res.json({count:data});
    }).catch(error=>{
        return next(error);
    })
});

module.exports = router;