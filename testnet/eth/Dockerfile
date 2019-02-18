FROM parity/parity:stable


EXPOSE 30303

EXPOSE 8545

EXPOSE 8546

CMD ["--jsonrpc-interface", "all", \
 "--chain", "ropsten", "--dapps-apis-all", "--jsonrpc-apis", "all", "--min-peers", "25", "--max-peers", "50"]
