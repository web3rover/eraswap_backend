const express = require('express');
const router = express.Router();

const users = require('./users');
const txns = require('./txn');
const p2p = require('./p2p');
const escrow = require('./escrow');
const lb = require('./l&b');

router.use('/users',users);
router.use('/p2p',p2p);
router.use('/txns',txns);
router.use('/escrow',escrow);
router.use('/lb',lb);

module.exports = router;