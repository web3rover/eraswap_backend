const ethNode = require("../../EthRpc");
var config = require('../../../configs/config');
var password = config.ethWalletApi.password;

let ethRpc = new ethNode("http://52.172.135.196:8545");

ethRpc.getAddress("yash@uk.com").then(op => {
    if (!op.error) {
        console.log(op);
        ethRpc.getBalance(op.data).then(console.log);
    }
});

ethRpc.SendEthToEmail("yash@uk.com", "uk@uk.com", "0.1").then(op => {
    console.log(op);
});

// walletApi.createNewWallet("uk123").then(op => {
//     if(op.error){
//         console.log(op);
//     }
//     else{
//         console.log(op.data);
//     }
// });

//ethRpc.GetAccounts().then(console.log).catch(console.log);

//ethRpc.CreateAccount().then(console.log).catch(console.log);

// var seed = "";
// walletApi.generate_seed().then(seedPhrase => {
//     seed = seedPhrase;
//     console.log(seed);

//     var name = "uk";
//     walletApi.createKeystore(seed, password)
//         .then(function (ks) {
//             return walletApi.saveProfile(name, ks.keystore, ks.privateKey, ks.address);
//         })
//         .then(function (saved) {
//             console.log('saved', saved);
//             walletApi.getProfile(name).then(profile => { console.log(profile); }).catch(console.log);
//         })
//         .catch(function (error) { console.log(error); });
// });