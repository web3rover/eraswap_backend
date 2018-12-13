const escrowCont = require('../escrow.cont');

const sendAmount = async(toAddress,Amount,cryptoCoin)=>{
    return await escrowCont.send(cryptoCoin,toAddress,Amount);
    //may be log here and send the response.
}

const getDetails = async(cryptoCoin)=>{
    const address = await escrowCont.getDepositAddress(cryptoCoin);
    const balance = await escrowCont.getBalance(cryptoCoin);
    return {address:address,balance:balance};
}


module.exports ={
    sendAmount,
    getDetails
}
