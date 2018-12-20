const express = require('express');
const router = express.Router();
const p2pCont = require('../../controllers/admins/p2p');

router.get('/list',(req,res,next)=>{
    p2pCont.getListMatches(req.query).then(data=>{
       console.log(data)
       return res.json(data)
   }).catch(error=>{
       return next(error);
   })
});

router.get('/list_count',(req,res,next)=>{
    p2pCont.getAllMatchesCount().then(data=>{
        return res.json({totalCount:data});
    }).catch(error=>{
        return next(error);
    });
});

/**
 * matchId,listingId,owner,requester,amount,cryptoCurrency
 */
router.post('/dispute/send_back_to_seller',(req,res,next)=>{
    p2pCont.sendToSellerOnDispute(req.body.matchId,req.body.listingId,req.body.owner,req.body.requester,req.body.amount,req.body.fee,req.body.cryptoCurrency).then(Data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});

/**
 * matchId,listingId,owner,requester,amount,cryptoCurrency
 */
router.post('/dispute/send_to_buyer',(req,res,next)=>{
    p2pCont.sendToBuyerOnDispute(req.body.matchId,req.body.listingId,req.body.owner,req.body.requester,req.body.amount,req.body.cryptoCurrency).then(Data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});
module.exports =router;