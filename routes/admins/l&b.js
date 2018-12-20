
const express = require('express');
const router = express.Router();
const lbCont = require('../../controllers/admins/l&b');

router.get('/getCounts',(req,res,next)=>{
    return lbCont.getCounts().then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
})


router.get('/agreements',(req,res,next)=>{
    return lbCont.getAgreements(req.query).then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});

module.exports = router;