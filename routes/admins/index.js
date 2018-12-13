const express = require('express');
const router = express.Router();

const users = require('./users');
const txns = require('./txn');
const p2p = require('./p2p');
const escrow = require('./escrow');

router.use('/users',users);
router.use('/p2p',p2p);
router.use('/txns',txns);
router.use('/escrow',escrow);

module.exports = router;