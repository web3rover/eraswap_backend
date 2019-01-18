const RPCDirectory = require('../../Nodes/index').RPCDirectory;
const Withdrawals = require('../../models/Withdrawal');

const getDetails = async () => {
    try {
        const ethRPC = RPCDirectory["ETH"];
        var details = await ethRPC._getGasTank();
        if (details.error) {
            throw { message: details.error };
        }
        return details;
    } catch (ex) {
        console.log(ex);
        return ex;
    }
}

const getTxnCount = async () => {
    try {
        const ethRPC = RPCDirectory["ETH"];
        var details = await ethRPC._getGasTank();
        if (details.error) {
            throw { message: details.error };
        }
        var count = await Withdrawals.count({ 'txn.sender': details.publicKey });
        return { count: count }
    } catch (ex) {
        console.log(ex);
        return ex;
    }
}

const getTxn = async (params) => {
    try {
        const ethRPC = RPCDirectory["ETH"];
        var details = await ethRPC._getGasTank();
        if (details.error) {
            throw { message: details.error };
        }
        var data = await Withdrawals.find({ 'txn.sender': details.publicKey });
        let page = 1;
        let results = 10;
        let count = data.length;
        if (count > 0) {
            if (params.page) {
                page = params.page;
            }
            if (params.results) {
                results = parseInt(params.results);
            }

            let start = results * ((page > 0 ? page : 1) - 1);
            let end = (start + results) > count ? count : (start + results);
            return { txns: data.slice(start, end) };
        }
        return { data: [] };
    } catch (ex) {
        console.log(ex);
        return ex;
    }
}

module.exports = {
    getDetails,
    getTxnCount,
    getTxn,
}
