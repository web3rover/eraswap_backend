const express = require('express');
const router = express.Router();
const userCont = require('../../controllers/admins/users');

router.get('/list',(req,res,next)=>{
   userCont.getListUsers(req.query).then(data=>{
       console.log(data)
       return res.json(data)
   }).catch(error=>{
       return next(error);
   })
});

router.get('/list_count',(req,res,next)=>{
    userCont.getAllUserCount().then(data=>{
        return res.json({totalCount:data});
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

router.get('/dash',(req,res,next)=>{
    if(!req.user.admin){
        return next({status:401,message:"Unauthorized"});
    }
    userCont.getDash().then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});

router.post('/make_admin',(req,res,next)=>{
    if(!req.user.admin){
        return next({status:401,message:"Unauthorized"});
    }
    userCont.createAdmin(req.body.id).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});
router.post('/revoke_admin',(req,res,next)=>{
    if(!req.user.admin){
        return next({status:401,message:"Unauthorized"});
    }
    userCont.revokeAdmin(req.body.id).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});
module.exports = router;