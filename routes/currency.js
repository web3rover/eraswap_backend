const express = require('express');
const router = express.Router();
const currencyCont = require('../controllers/currency');
router.get('/get_all_supported_currency',(req,res,next)=>{
 currencyCont.get_supported_currency().then(data=>{
    return res.json(data);
 }).catch(error=>{
    return next({
        message:'Unknwn Error Occured.',
        error:error,
        status:400
    });
 });
});

module.exports =router;