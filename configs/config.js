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
    KRAKEN:{
      apiKey: "/QjQYP0EzexoqNLnLgRQ0R1TioY7gUzBpjGd0O1Eevt38Gt5uYwkbtzJ",
      secret:"C9tE1Afxj/LHATgR2rzZIdozAdBQ+fit/pJJOOo8Hlo/cPuqOwAK1pkbuNKg6c7BsxAO6ugGilOQv3iMxOaK5Q=="
    },
    COINEX:{
      apiKey:"9C11DBDB3EDF47CDA580C9654547E5F8",
      secret:"67E20129ED49469EACBE6397022876CB3ACA035DD0253434"
    },
    YOBIT:{
      apiKey:"855C5F6098C53FF9B78D61615374B5EE",
      secret:"e0cddc4eb63d471e63ad667712a2e36d"
    },
    OKEX:{
      apiKey:"21aa6369-e743-4278-a86e-9a281893a9c7",
      secret:"2096DEC29C5875235826B84100A95EF2"
    },
    OKEX_V1:{
      apiKey:"fc217c23-5887-4fc1-bb7a-63c8e649185e",
      secret:"D35802E871C8676199084B7236BF9D2A"
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
