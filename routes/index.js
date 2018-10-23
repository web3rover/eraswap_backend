const api = {};

api.includeRoutes = app => {
  var userAuth = require('./user.auth');

  app.use('/auth', userAuth);
};

module.exports = api;
