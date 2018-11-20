// const Client = require('bitcoin-core');
const request = require('request');
const BtcRpc = require('../../BtcRpc');

let BtcNodeHost = "http://52.172.139.25";
let BtcNodePort = 8555;

let username = "foo";
let password = "bar";

let btcRpc = new BtcRpc(BtcNodeHost, BtcNodePort, username, password);
// User and password specified like so: node index.js username password.

btcRpc.GetAddressesForWallet("uk14@uk.com").then(res => console.log(res));
btcRpc.SendBtcToEmail("dhiren", "uk13@uk.com", 0.001).then(res => console.log(res.result));
btcRpc.GetBalanceForWallet("uk14@uk.com").then(console.log);


// const client = new Client(
//     {
//         username: 'foo',
//         password: 'bar',
//         port: '8555'
//     }
// );

// BtcRpcCall("foo", "bar", "loadwallet", ["uk"]).then((responses) => {
//     console.log(responses)

//      let newAddress = "2NBijVKWFgoUVqeCQsqASvNeJtwF6LrppL1";

//     BtcRpcCall("foo", "bar", "getaddressinfo", [newAddress], "/wallet/uk").then(result => {
//         console.log("Address info: "+result);
//     });

//     BtcRpcCall("foo", "bar", "getnewaddress", ["uk"], "/wallet/uk").then(res => {
//          console.log("new address: "+res);
//      });

//     BtcRpcCall("foo", "bar", "getbalance", ["*", 1], "/wallet/uk").then(console.log);

//     BtcRpcCall("foo", "bar", "getwalletinfo", [], "/wallet/uk").then(console.log);

//     BtcRpcCall("foo", "bar", "getaddressesbylabel", ["uk"], "/wallet/uk").then((res) => {
//         console.log(res);
//         BtcRpcCall("foo", "bar", "unloadwallet", ["uk"], "/wallet/uk").then(console.log);
//     });
// });

//client.command([{ method: 'listwallets', parameters: [] }]).then((responses) => console.log(responses));


async function BtcRpcCall(username, password, command, params = [], path = "") {

    if (!params instanceof Array) {
        return "params musg an array";
    }

    let options = {
        url: "http://104.211.92.220:8555" + path,
        //url: "http://localhost:8555" + path,
        method: "post",
        headers:
            {
                "content-type": "text/plain"
            },
        auth: {
            user: username,
            pass: password
        },
        body: JSON.stringify({ "jsonrpc": "1.0", "id": "curltest", "method": command, "params": params })
    };

    let promise = new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                resolve(error);
            } else {
                resolve(body);
            }
        });
    });

    let result = await promise;

    return result;
}