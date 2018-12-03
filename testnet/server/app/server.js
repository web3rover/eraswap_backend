const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const keythereum = require('keythereum');
var path = require('path');
const fs = require('fs');

var dataDir = "/root/.ethereum";
console.log(path.join(dataDir, "keystore"))
console.log(fs.readdirSync(keystore))
const port = 8080;

const app = express();

app.use(helmet());
app.use(cors());

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.post('/getPrivateKey', (req, res) => {
    if (!req.body.address || !req.body.password) {
        res.status(400).send({ error: "Invalid arguments" });
    }
    else {
        try {
            var keyObj = keythereum.importFromFile(req.body.address, dataDir);
            console.log(keyObj)
            var privKey = keythereum.recover(req.body.password, keyObj);
            var privateKey = privKey.toString('hex');
            res.status(200).send({ privateKey: privateKey });
        } catch (ex) {
            console.log(ex)
            res.status(400).send({ error: ex });
        }
    }
});

app.listen(port, '0.0.0.0', (err) => {
    if (err) {
        console.log(err);
    }

    console.info('>>> 🌎 Open http://0.0.0.0:%s/ in your browser.', port);
});

module.exports = app;

module.exports = app;
