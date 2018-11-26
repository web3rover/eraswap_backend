FROM ethereum/client-go

EXPOSE 30303

EXPOSE 8545

EXPOSE 8546

CMD ["-syncmode", "light", "--rpc", \
 "--rpcport", "8545", "--rpcaddr", "0.0.0.0", "--rpccorsdomain", "*", \
 "--rpcapi", "eth,web3,net,admin,personal", "--cache=3072"]