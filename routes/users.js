const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.cont');
router.get('/allUsers',(req,res,next)=>{
    console.log(req.user);
    userController.getUsers().then(data=>{
        return res.json(data);
    }).catch(error=>{
        return next(error);
    })
});


module.exports =router;