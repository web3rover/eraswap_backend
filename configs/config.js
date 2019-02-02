module.exports = {
  FRONTEND_HOST: 'http://localhost:3000' || process.env.FRONTEND_HOST,
  mongo: {
    url: 'mongodb://saikatharryc:saikat95@ds129720.mlab.com:29720/test2' || process.env.MONGO_URL,
  },
  ETHERSCAN: {
    URL: 'http://api-kovan.etherscan.io/api' || process.env.ETHERSCAN_URL,
    ApiKey: 'PE48KRSXDS3V1GFWH9Z91XDG5EEGAMQU8C' || process.env.ETHERSCAN_API_KEY,
  },
  BLOCKCYPHER: {
    URL: 'https://api.blockcypher.com/v1/btc/test3/' || process.env.BLOCKCYPHER_URL,
  },
  BLOCKCLUSTER: {
    host: 'app-ap-south-1b.blockcluster.io' || process.env.BLOCKCLUSTER_HOST,
    instanceId: 'hwrrhauh' || process.env.BLOCKCLUSTER_INSTANCEID,
    assetName: 'p2pMarketplace',
    matchAssetName: 'MatchData',
    LendBorrowAssetName: 'LBOrder',
    agreementsAssetName: 'Agreements',
  },
  keys: {
    BITTREX: {
      apiKey: 'a75b68ba617d4e4a99c7d6812f898325' || process.env.BITTREX_KEY,
      secret: 'c15f14f6a9874f498c725af39f224d59' || process.env.BITTREX_SEC,
    },
    POLONIEX: {
      apiKey: 'MSO0SXBV-3H99FUT1-NIZIDG8A-AW5KMSVY' || process.env.POLONIEX_KEY,
      secret: 'dbf5003faf7614d37bc64e02a5f65f840441429b1e7ee603264694079bf86cfcc24f9b10d39efcd5a31739bc4422f0bf247f0f203be7b402fb16aff94296351f' || process.env.POLONIEX_SEC,
    },
    BINANCE: {
      apiKey: 'p3iw39fpUogNwFDOF02RQnhJLnxJVILWePQ0wlnwAp9Ijbrsk68a4HJfiDPjJIQm' || process.env.BINANCE_KEY,
      secret: 'x1BlkMdVntAFZ2G44uGmHGsLXnVbAvwu4djt9ollBoHglLcmbCUHPtJyNBkeB01V' || process.env.BINANCE_SEC,
    },
    CRYPTOPIA: {
      apiKey: '000d8e0b0854469b8346f587f806fda1' || process.env.CRYPTOPIA_KEY,
      secret: 'FmoPYYlwb1+KK8qyiZZm20fABjhSVXKb+ISBh1CU00g=' || process.env.CRYPTOPIA_SEC,
    },
    KUKOIN: {
      apiKey: '5bf7dc5dc0391f204e8ccc5a' || process.env.KUKOIN_KEY,
      secret: 'cf3f1368-8846-46cd-8a36-94dd95bfaf92' || process.env.KUKOIN_SEC,
    },
  },
  JWT: {
    secret: 'HelloBlcko' || process.env.JWT_SEC,
    expire: 604800,
  },
  CRYPTR: {
    password: 'privateKeyPassword@123' || process.env.cryptrPassword,
  },
  PLATFORM_FEE: 0.5 || process.env.PLATFORM_FEE,
  LB_FEE: 0.25 || process.env.LB_FEE,
  P2P_FEE: 0.25 || process.env.P2P_FEE,
  EST_IN_ETH: 0.00005804 || process.env.EST_IN_ETH, //in eth
  coinMktCapKey: '298dba8f-b0b4-4a72-8c85-a39c525781dc' || process.env.coinMktCapKey,
  NODES: {
    btc: {
      host: '13.233.168.86' || process.env.BTC_HOST,
      port: '8555' || process.env.BTC_PORT,
      username: 'foo' || process.env.BTC_USER,
      password: 'bar' || process.env.BTC_PASS,
    },
    eth: {
      host: '13.233.168.86' || process.env.ETH_HOST,
      port: '8545' || process.env.ETH_PORT,
    },
    est: {
      host: '13.233.168.86' || process.env.EST_HOST,
      port: '8545' || process.env.EST_PORT,
      contractAddress: '0x5679f3797da4073298284fc47c95b98a74e7eba7' || process.env.EST_CONTRACT,
    },
  },
  SOCIAL: {
    GOOGLE: {
      CLIENT_ID: '524726124380-u1nngf3k396jhtgrbmnqc6gchvsr6s3k.apps.googleusercontent.com' || process.env.G_CLIENT_ID,
      CLIENT_SECRET: 'kNUGAz_SQpBoZCTyOW7F3JHz' || process.env.G_CLIENT_SEC,
      REDIRECT_URI: 'http://ec2-18-220-230-245.us-east-2.compute.amazonaws.com:3000/login' || process.env.G_RED_URI,
    },
    FB: {
      CLIENT_ID: '570289253420635' || process.env.F_CLIENT_ID,
      CLIENT_SECRET: '48222bcb575887cd46d1a1996a00be23' || process.env.F_CLIENT_SEC,
      REDIRECT_URI: 'https://7d9a37c6.ngrok.io/login' || process.env.F_RED_URI, //FB needs HTTPS only
    },
  },
  MAIL: {
    ccMail: 'info@eraswaptoken.io' || process.env.CC_MAIL,
    fromMail: 'info@eraswaptoken.io' || process.env.FROM_MAIL,
    SMTP_HOST: 'smtp.gmail.com' || process.env.SMTP_HOST,
    SMTP_PORT: 465 || process.env.SMTP_PORT,
    SECURE: true || process.env.SECURE, //in case port value is 465
    SMTP_USER: 'startsetteam' || process.env.SMTP_USER,
    SMTP_PASS: 'saikat95' || process.env.SMTP_PASS,
  },
};
