
const config = require('../configs/config');
const jwt = require('jsonwebtoken');

const api = {};
isAuth =(req,res,next)=>{
  console.log(req.xhr);
    if(req.headers.authorization){
      jwt.verify(req.headers.authorization,config.JWT.secret,(error,decoded)=>{
        if(error){
          return next({
            message:'Unauthenticated',
            status:401
          });
        }
        req.user = {
          _id:decoded._id,
          email:decoded.email,
          username:decoded.username,
          wallet:decoded.wallet || null
        };
        next();
      });
    }else{
      return next({
        message:'Unauthenticated',
        head:'Header is not present in the request.',
        status:401
      });
    }

}
api.includeRoutes = app => {
  var userAuth = require('./user.auth');
  var users = require('./users');
  var currency = require('./cur');
  var txn = require('./txn');
  var p2p = require('./p2p');
  var wallet = require('./wallet');

  app.use('/auth', userAuth);
  app.use('/apis/*',isAuth);
  app.use('/apis/ping',(req,res,next)=>{
    return res.send({'ok':true});
  });
  app.use('/apis/user',users);
  app.use('/apis/cur',currency);
  app.use('/apis/txn', txn);
  app.use('/apis/p2p',p2p);
  app.use('/apis/wallet', wallet);
};

module.exports = api;
