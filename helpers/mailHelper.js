const nodemailer = require("nodemailer");

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

module.exports ={
    SendMail
}