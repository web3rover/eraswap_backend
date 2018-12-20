module.exports = {
    FRONTEND_HOST: 'http://localhost:3000' || process.env.FRONTEND_HOST,
    mongo: {
        url: 'mongodb://saikatharryc:saikat95@ds129720.mlab.com:29720/test2',
        //url: 'mongodb://localhost:27017/test2',
    },
    BLOCKCLUSTER: {
        host: "app-ap-south-1b.blockcluster.io",
        instanceId: "hwrrhauh",
        assetName: "p2pMarketplace",
        matchAssetName:'MatchData',
        LendBorrowAssetName:"LBOrder",
        agreementsAssetName:'Agreements'
    },
    keys: {
        BITTREX: {
            apiKey: 'a75b68ba617d4e4a99c7d6812f898325',
            secret: 'c15f14f6a9874f498c725af39f224d59',
        },
        POLONIEX: {
            apiKey: 'WXVOIJVV-SLRKFA0B-XAZX8089-VSTUEHJ1',
            secret: 'da7a6a112f47b37fbef7f0dc2e59217ad8a5c20a95379f9b7cea358befccf585a5ab48af2253b6accb67083bb5224bce3a1b2b360dde3187e95293bd79e5bc99',
        },
        BINANCE: {
            apiKey: 'p3iw39fpUogNwFDOF02RQnhJLnxJVILWePQ0wlnwAp9Ijbrsk68a4HJfiDPjJIQm',
            secret: 'x1BlkMdVntAFZ2G44uGmHGsLXnVbAvwu4djt9ollBoHglLcmbCUHPtJyNBkeB01V',
        },
        CRYPTOPIA: {
            apiKey: "000d8e0b0854469b8346f587f806fda1",
            secret: "FmoPYYlwb1+KK8qyiZZm20fABjhSVXKb+ISBh1CU00g="
        },
        OKEX: {
            apiKey: "21aa6369-e743-4278-a86e-9a281893a9c7",
            secret: "2096DEC29C5875235826B84100A95EF2",
            passphrase: 'saikat95',
            password: 'Saikat@95'
        },
        KUKOIN: {
            apiKey: "5bf7dc5dc0391f204e8ccc5a",
            secret: "cf3f1368-8846-46cd-8a36-94dd95bfaf92"
        },
        OKEX_V1: {
            apiKey: "fc217c23-5887-4fc1-bb7a-63c8e649185e",
            secret: "D35802E871C8676199084B7236BF9D2A",
            password: 'Saikat@95'
        }
    },
    JWT: {
        secret: 'HelloBlcko',
        expire: 604800,
    },
    PLATFORM_FEE: 0.5,
    EST_VAL:1, //in USD,
    coinMktCapKey:'1c2d23ed-bdca-4714-b39b-8e33bffe5053',
    NODES: {
        btc: {
            host: '13.233.168.86',
            port: '8555',
            username: 'foo',
            password: 'bar'
        },
        eth: {
            host: '13.233.168.86',
            port: '8545'
        },
        est: {
            host: '13.233.168.86',
            port: '8545',
            contractAddress: '0x5679f3797da4073298284fc47c95b98a74e7eba7',
        }
    },
    SOCIAL:{
        GOOGLE:{
            CLIENT_ID:'524726124380-u1nngf3k396jhtgrbmnqc6gchvsr6s3k.apps.googleusercontent.com',
            CLIENT_SECRET:'kNUGAz_SQpBoZCTyOW7F3JHz',
            REDIRECT_URI:'http://ec2-18-220-230-245.us-east-2.compute.amazonaws.com:3000/login'
        },
        FB:{
            CLIENT_ID:"570289253420635",
            CLIENT_SECRET:'48222bcb575887cd46d1a1996a00be23',
            REDIRECT_URI:'https://7d9a37c6.ngrok.io/login'  //FB needs HTTPS only
        }
    }
};
