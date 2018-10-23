const express = require('express');

const router = express.Router();

router.post('/login', (req, res) => {
    res.send('Implement LoginHere')
});

module.exports = router;
