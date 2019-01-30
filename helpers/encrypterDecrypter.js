let Cryptr, cryptr;
const config = require('../configs/config');
try {
    Cryptr = require('cryptr');
    cryptr = new Cryptr(config.CRYPTR.password);
} catch (err) {
    console.log(err);
    process.exit();
}

module.exports = {
    cryptr
}