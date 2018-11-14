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

router.post('/showInterest',(req,res,next)=>{
    
    let message={
        subject:`[Eraswap Marketplace] ${req.user.username} just showed interest on your listing.`,
        body: `<body>
                Hi, ${req.body.username},
                ${req.user.username} Just showed You interest on your listing.
                he/she Interested to ${req.body.wantsToBuy ? 'buy your' : 'sell to you'} the listed asset,
                Please contact to email: ${req.user.email} .
                Thank you!
              </body>`
    };
    currencyCont.showInterestMailSender(req.body,message).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error)
    })
});
module.exports = router;