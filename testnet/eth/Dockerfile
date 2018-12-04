FROM parity/parity:v2.2.3


EXPOSE 30303

EXPOSE 8545

EXPOSE 8546

CMD ["--jsonrpc-interface", "all", \
 "--chain", "kovan", "--dapps-apis-all", "--jsonrpc-apis", "all", "--mode", "active", "--tracing", "off", "--pruning", "fast", "--db-compaction", "ssd", "--cache-size", "2048", "--no-warp"]
