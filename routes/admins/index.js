const express = require('express');
const router = express.Router();

const users = require('./users');
const txns = require('./txn');

router.use('/users',users);
router.use('/txns',txns);

module.exports = router;