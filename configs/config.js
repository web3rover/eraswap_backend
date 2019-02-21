module.exports = {
  FRONTEND_HOST: process.env.FRONTEND_HOST || 'http://localhost:3000',
  mongo: {
    url: process.env.MONGO_URL || 'mongodb://localhost:27017/test2',
  },
  ETHERSCAN: {
    URL: process.env.ETHERSCAN_URL || 'http://api-ropsten.etherscan.io/api',
    ApiKey: process.env.ETHERSCAN_API_KEY || 'PE48KRSXDS3V1GFWH9Z91XDG5EEGAMQU8C',
  },
  BLOCKCYPHER: {
    URL: process.env.BLOCKCYPHER_URL || 'https://api.blockcypher.com/v1/btc/test3/',
  },
  BLOCKCLUSTER: {
    host: process.env.BLOCKCLUSTER_HOST || 'app-sf2.blockcluster.io',
    instanceId: process.env.BLOCKCLUSTER_INSTANCEID || 'gxrbffiv',
    assetName: 'p2pMarketplace',
    matchAssetName: 'MatchData',
    LendBorrowAssetName: 'LBOrder',
    agreementsAssetName: 'Agreements',
  },
  keys: {
    BITTREX: {
      apiKey: process.env.BITTREX_KEY || 'a75b68ba617d4e4a99c7d6812f898325',
      secret: process.env.BITTREX_SEC || 'c15f14f6a9874f498c725af39f224d59',
    },
    POLONIEX: {
      apiKey: process.env.POLONIEX_KEY || 'MSO0SXBV-3H99FUT1-NIZIDG8A-AW5KMSVY',
      secret: process.env.POLONIEX_SEC || 'dbf5003faf7614d37bc64e02a5f65f840441429b1e7ee603264694079bf86cfcc24f9b10d39efcd5a31739bc4422f0bf247f0f203be7b402fb16aff94296351f',
    },
    BINANCE: {
      apiKey: process.env.BINANCE_KEY || 'p3iw39fpUogNwFDOF02RQnhJLnxJVILWePQ0wlnwAp9Ijbrsk68a4HJfiDPjJIQm',
      secret: process.env.BINANCE_SEC || 'x1BlkMdVntAFZ2G44uGmHGsLXnVbAvwu4djt9ollBoHglLcmbCUHPtJyNBkeB01V',
    },
    CRYPTOPIA: {
      apiKey: process.env.CRYPTOPIA_KEY || '000d8e0b0854469b8346f587f806fda1',
      secret: process.env.CRYPTOPIA_SEC || 'FmoPYYlwb1+KK8qyiZZm20fABjhSVXKb+ISBh1CU00g=',
    },
    KUKOIN: {
      apiKey: process.env.KUKOIN_KEY || '5c6d76b91cde786a8363f637',
      secret: process.env.KUKOIN_SEC || '4174aca5-2d4a-4216-baec-c18f5edcf31e',
      password: process.env.KUKOIN_PASS || 'saikat95',
    },
  },
  JWT: {
    secret: process.env.JWT_SEC || 'HelloBlcko',
    expire: 604800,
  },
  CRYPTR: {
    password: process.env.cryptrPassword || 'privateKeyPassword@123',
  },
  PLATFORM_FEE: process.env.PLATFORM_FEE || 0.5,
  LB_FEE: process.env.LB_FEE || 0.25,
  P2P_FEE: process.env.P2P_FEE || 0.25,
  EST_IN_ETH: process.env.EST_IN_ETH || 0.00005804, //in eth
  coinMktCapKey: process.env.coinMktCapKey || 'd5d13fac-ccfd-49d6-9d1b-8301920fe0f6',
  NODES: {
    btc: {
      host: process.env.BTC_HOST || '13.233.168.86',
      port: process.env.BTC_PORT || '8555',
      username: process.env.BTC_USER || 'foo',
      password: process.env.BTC_PASS || 'bar',
      feeIncreaseFactor: 30 || process.env.feeIncreaseFactor, //The factor by which you want to increase btc txn fees for
      //faster transaction confirmation.
    },
    eth: {
      host: process.env.ETH_HOST || '13.233.168.86',
      port: process.env.ETH_PORT || '8545',
    },
    est: {
      host: process.env.EST_HOST || '13.233.168.86',
      port: process.env.EST_PORT || '8545',
      contractAddress: process.env.EST_CONTRACT || '0x722dd3f80bac40c951b51bdd28dd19d435762180',
    },
  },
  SOCIAL: {
    GOOGLE: {
      CLIENT_ID: process.env.G_CLIENT_ID || '524726124380-u1nngf3k396jhtgrbmnqc6gchvsr6s3k.apps.googleusercontent.com',
      CLIENT_SECRET: process.env.G_CLIENT_SEC || 'kNUGAz_SQpBoZCTyOW7F3JHz',
      REDIRECT_URI: process.env.G_RED_URI || 'http://ec2-18-220-230-245.us-east-2.compute.amazonaws.com:3000/login',
    },
    FB: {
      CLIENT_ID: process.env.F_CLIENT_ID || '570289253420635',
      CLIENT_SECRET: process.env.F_CLIENT_SEC || '48222bcb575887cd46d1a1996a00be23',
      REDIRECT_URI: process.env.F_RED_URI || 'https://7d9a37c6.ngrok.io/login', //FB needs HTTPS only
    },
  },
  MAIL: {
    ccMail: process.env.CC_MAIL || 'info@eraswaptoken.io',
    fromMail: process.env.FROM_MAIL || 'info@eraswaptoken.io',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: process.env.SMTP_PORT || 465,
    SECURE: process.env.SECURE || true, //in case port value is 465
    SMTP_USER: process.env.SMTP_USER || 'startsetteam',
    SMTP_PASS: process.env.SMTP_PASS || 'saikat95',
  },
};
