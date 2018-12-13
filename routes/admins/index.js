const express = require('express');
const router = express.Router();

const users = require('./users');
const txns = require('./txn');
const p2p = require('./p2p');

router.use('/users',users);
router.use('/p2p',p2p);
router.use('/txns',txns);

module.exports = router;