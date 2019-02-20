const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');

const apiRoutes = require('./routes');

const app = express();

app.use(helmet());
app.use(cors());
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

const config = require('./configs/config');

mongoose.connect(
    config.mongo.url,
    { useNewUrlParser: true }
);

console.log(config.mongo.url);

// enable the use of request body parsing middleware
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
apiRoutes.includeRoutes(app);
const Currency = require('./models/Currency');
Currency.estimatedDocumentCount({}).exec().then(async (isUpdated) => {
    if (!isUpdated) {
        const allCur = await require('./helpers/cryptos').getAllCurrency();
        return Currency.insertMany(allCur);
    } else {
        //do testings here
    }
});
var agenda = require('./agenda')

var escrow = require('./controllers/escrow.cont');
(async () => await escrow.checkEscrow())();

var walletCont = require('./controllers/wallets');
(async () => await walletCont.checkGasTank())();

app.use((err, req, res, next) => {
    // set locals, only providing error in development
    // res.locals.message = err.message;
    // res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    // res.status(err.status || 500).json({ err: err.message });
    const errorObj = {
        service: 'eraswap_back',
    };
    if (err.status === 400) {
        if (err.validationErrors) {
            errorObj.validationErrors = err.validationErrors;
        }
        errorObj.message = err.message || 'Invalid Values Supplied';
        errorObj.head = err.head || null;
    } else if (err.status === 401 || err.status === 403) {
        errorObj.head = err.head || null;
        errorObj.message = err.message || 'Unauthorized User';
    } else if (err.status === 500) {
        errorObj.head = err.head || null;

        errorObj.message = err.message;

        errorObj.message = 'Internal Server Error';
    } else if (err.status === 404) {
        errorObj.head = err.head || null;
        errorObj.message = err.message;
    } else {
        errorObj.head = err.head || null;



        errorObj.message = err.message || 'Unknown Error Occurred';
    }

    next();
    return res.status(err.status || 500).json(errorObj);
});

process.on('SIGTERM', function () {
    agenda.stop();
    process.exit(0);
});
process.on('SIGINT', function () {
    agenda.stop();
    process.exit(0);
});

module.exports = app;
