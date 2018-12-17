const nodemailer = require("nodemailer");
const ejs = require('ejs');

const EmailVerificationTemplate = require('../templates/signup');
const PrivateKey  = require('../templates/privateKey');

//Enter valid gmail credentials
//*****Allow less secure to send mails in gmail settings*****
var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "startsetteam", // generated ethereal user
      pass: "saikat95" // generated ethereal password
    }
  });

const SendMail = (message)=>{
return new Promise((resolve,reject)=>{
    const mailOptions = {
        from: "info@blockcluster.io", // sender address
        to: message.to, // list of receivers
        subject: message.subject, // Subject line
        html:message.body
      };
  transporter.sendMail(mailOptions, function(err, info) {
    if (err) {
      console.log("Send mail err " + err);
      return reject({ success: false });
    } else {
      console.log("Mail send " + info);
      console.log(info);
      return resolve({ success: true });
    }
  });
});
}

const EJSMapping = {
  'email-verification.ejs': EmailVerificationTemplate,
  'PrivateKey.ejs':PrivateKey
};

function getEJSTemplate({fileName}) {
  return new Promise(resolve => {
    if(!fileName){
      throw {status:400,message:"No file specified!"}
    }
    const content = EJSMapping[fileName];
    resolve(ejs.compile(content, {
      cache: true,
      filename: fileName
    }));
  });
}

module.exports ={
    SendMail,
    getEJSTemplate
}