const nodemailer = require('nodemailer');
const ejs = require('ejs');

const PasswordReset = require('../templates/passwordReset');
const EmailVerificationTemplate = require('../templates/signup');
const PrivateKey = require('../templates/privateKey');
const config = require('../configs/config');

//Enter valid gmail credentials
//*****Allow less secure to send mails in gmail settings*****
var transporter = nodemailer.createTransport({
  host: config.MAIL.SMTP_HOST,
  port: config.MAIL.SMTP_PORT,
  secure: config.MAIL.SECURE, // true for 465, false for other ports
  auth: {
    user: config.MAIL.SMTP_USER, // generated ethereal user
    pass: config.MAIL.SMTP_PASS, // generated ethereal password
  },
});

const SendMail = (message, p2p = null) => {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: config.MAIL.fromMail, // sender address
      to: message.to, // list of receivers
      subject: message.subject, // Subject line
      html: message.body,
    };
    if (p2p) {
      mailOptions['cc'] = p2p + ',' + config.MAIL.ccMail;
    }
    transporter.sendMail(mailOptions, function(err, info) {
      if (err) {
        console.log('Send mail err ' + err);
        return reject({ success: false });
      } else {
        console.log('Mail send ' + info);
        console.log(info);
        return resolve({ success: true });
      }
    });
  });
};

const EJSMapping = {
  'email-verification.ejs': EmailVerificationTemplate,
  'PrivateKey.ejs': PrivateKey,
  'PasswordReset.ejs': PasswordReset,
};

function getEJSTemplate({ fileName }) {
  return new Promise(resolve => {
    if (!fileName) {
      throw { status: 400, message: 'No file specified!' };
    }
    const content = EJSMapping[fileName];
    resolve(
      ejs.compile(content, {
        cache: true,
        filename: fileName,
      })
    );
  });
}

module.exports = {
  SendMail,
  getEJSTemplate,
};
