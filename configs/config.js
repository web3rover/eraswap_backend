module.exports = {
  mongo: {
    url: 'mongodb://abcd:saikat95@ds129720.mlab.com:29720/test2',
  },
  BLOCKCLUSTER:{
    host:"app-ap-south-1b.blockcluster.io",
    instanceId:"jgvyjgub",
    assetName:"p2pMarketplace"
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
    CRYPTOPIA:{
      apiKey: "000d8e0b0854469b8346f587f806fda1",
      secret:"FmoPYYlwb1+KK8qyiZZm20fABjhSVXKb+ISBh1CU00g="
    },
    OKEX:{
      // apiKey:"21aa6369-e743-4278-a86e-9a281893a9c7",
      // secret:"2096DEC29C5875235826B84100A95EF2"
      apiKey:"bea39634-a54c-47b3-8d6e-7dc6c030eebb",
      secret:"EBA812E08ADCFFB1E3D19BC6E1A685CF",
      passphrase:'callofduty'
    },
    KUKOIN:{
      apiKey:"5bf7dc5dc0391f204e8ccc5a",
      secret:"cf3f1368-8846-46cd-8a36-94dd95bfaf92"
    }, 
    OKEX_V1:{
      apiKey:"37918b2f-2f75-4192-970a-f47b0b322670",
      secret:"A0075626FFF0D092184B1D4956EAEFBD"
    }
  },
  JWT: {
    secret: 'HelloBlcko',
    expire: 604800,
  },
  NODES: {
      btc: {
          host: '52.172.135.196',
          port: '8555',
          username: 'foo',
          password: 'bar'
      },
      eth: {
          host: '52.172.135.196',
          port: '8545'
      }
  }
};
