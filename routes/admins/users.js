const express = require('express');
const router = express.Router();

router.get('/list',(req,res,next)=>{
    return res.json("Haiyo");
});

module.exports = router;