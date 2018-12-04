# eraswap_backend - Install and Run

1. Install Node.js and NPM
3. git clone https://github.com/BlockClusterApp/eraswap_backend.git
4. cd eraswap_backend && npm install
5. npm run start

# Permission

`sudo chmod -R 757 ~/EthData_test/` to allow parity to write to it

`--warp-barrier` is `9575000` because highestBlock (9578178) rounded down to the nearest 5k, so 9575000

Once snapshot download is complete, add these to resume normal syncing: `"--no-ancient-blocks", "--no-warp"`. 
