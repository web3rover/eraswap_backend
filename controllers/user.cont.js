const Users = require('../models/Users');

const getUsers = async () => {
  const query = {};
  return await Users.find(query).exec();
};

module.exports = {
  getUsers,
};
