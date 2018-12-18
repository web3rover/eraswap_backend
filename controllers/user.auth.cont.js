const jwt = require('jsonwebtoken');
var rp = require('request-promise');

const Users = require('../models/Users');
const config = require('../configs/config');
const helper = require('../helpers/mailHelper');

const register = body => {
    return new Promise(async (resolve, reject) => {
        const savable = new Users(body);
        savable.save(async (error, saved) => {
            if (error) {
                return reject(error);
            }
            const URL = `${config.FRONTEND_HOST}/activate?id=${savable._id}`;
            const ejsTemplate = await helper.getEJSTemplate({ fileName: 'email-verification.ejs' });
            const finalHTML = ejsTemplate({
                link: URL,
            });
            await helper.SendMail({ to: savable.email, subject: '[Eraswap] Activation Email', body: finalHTML });
            return resolve(saved);
        });
    });
};

const login = body => {
    return new Promise((resolve, reject) => {
        Users.findOne({ username: body.username })
            .exec()
            .then(user => {
                if (!user) {
                    return reject(new Error('User Not found'));
                }
                if (!user.activated) {
                    return reject(new Error('Account not activated'));
                }
                user.comparePassword(body.password, (error, isMatch) => {
                    if (isMatch && !error) {
                        var token = jwt.sign(user.toObject(), config.JWT.secret, { expiresIn: config.JWT.expire });
                        return resolve({ token: token, user: user });
                    } else {
                        return reject(new Error('wrong password'));
                    }
                });
            })
            .catch(error => {
                return reject(error);
            });
    });
};

const createAccountForSocial = async (email, username, type, name) => {
    let userData = await Users.findOne({
        username: username,
        email: email,
        is_fb: type == 'fb' ? true : false,
        is_google: type == 'google' ? true : false,
    })
        .lean()
        .exec();
    let user;
    if (!userData) {
        userData = new Users({
            name: name,
            email: email,
            password: Date.now(),
            username: username,
            is_fb: type == 'fb' ? true : false,
            is_google: type == 'google' ? true : false,
            activated: true,
            walletCreationInProgress: false,
        });
        await userData.save();
        user = userData.toObject();
    } else {
        user = userData;
    }

    delete user.password;
    var token = jwt.sign(user, config.JWT.secret, { expiresIn: config.JWT.expire });
    return { token: token, user: user };
};

const facebookLogin = async code => {
    const access_tokenObj = await rp(
        `https://graph.facebook.com/v3.2/oauth/access_token?client_id=${config.SOCIAL.FB.CLIENT_ID}&redirect_uri=${config.SOCIAL.FB.REDIRECT_URI}&client_secret=${config.SOCIAL.FB.CLIENT_SECRET}&code=${code}`,
        { method: 'GET' }
    );
    const data = await rp('https://graph.facebook.com/me?fields=name,email,id&access_token=' + JSON.parse(access_tokenObj).access_token);
    const ProfileData = JSON.parse(data);
    if (!ProfileData.email) {
        return Promise.reject({ status: 400, message: 'No email found associated with your account.' });
    } else {
        //create an user with this things if not exists,
        // obviously login from those things
        return await createAccountForSocial(ProfileData.email, ProfileData.id, 'fb', ProfileData.name);
    }
};

const googleLogin = async code => {
    const postData = {
        method: 'POST',
        uri: 'https://accounts.google.com/o/oauth2/token',
        body: {
            client_id: config.SOCIAL.GOOGLE.CLIENT_ID,
            client_secret: config.SOCIAL.GOOGLE.CLIENT_SECRET,
            redirect_uri: config.SOCIAL.GOOGLE.REDIRECT_URI,
            grant_type: 'authorization_code',
            code: code,
        },
        json: true
    };

    const access_tokenObj = await rp(postData);
    const data = await rp(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=` + access_tokenObj.access_token);
    const ProfileData = JSON.parse(data);
    if (!ProfileData.email) {
        return Promise.reject({ status: 400, message: 'No email found associated with your account.' });
    } else {
        //create an user with this things if not exists,
        // obviously login from those things
        return await createAccountForSocial(ProfileData.email, ProfileData.id, 'google', ProfileData.name);
    }
};

const forgotPassword = async email => {
    try {
        var user = await Users.findOne({ email: email });
        if (user) {
            user["passwordResetCode"] = randomString(40);
            user = await user.save();

            const URL = `${config.FRONTEND_HOST}/reset?id=${user.passwordResetCode}`;
            const ejsTemplate = await helper.getEJSTemplate({ fileName: 'PasswordReset.ejs' });
            const finalHTML = ejsTemplate({
                link: URL,
            });
            await helper.SendMail({ to: email, subject: '[Eraswap] Reset Your Password', body: finalHTML });
            return ({ success: true });
        } else {
            return({ message: "User with email address does not exist" });
        }
    } catch (ex) {
        return (ex);
    }
};

const randomString = length => {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz1234567890_-.";
    for (let i = 0; i < length; i++) {
        text += possible[Math.floor(Math.random() * possible.length)];
    }
    return text;
};

const resetPassword = async (code, password) => {
    try {
        if (code && password) {
            var user = await Users.findOne({ passwordResetCode: code });
            if (user) {
                user["password"] = password;
                user["passwordResetCode"] = "";
                user = await user.save();
                return { success: true };
            } else {
                return ({ message: "Password reset link expired" });
            }
        } else {
            return ({ message: "Missing arguments" });
        }
    } catch (ex) {
        return (ex);
    }
}

const activateAccount = async id => {
    return await Users.update({ _id: id }, { $set: { activated: true } }).exec();
};

module.exports = {
    register,
    login,
    activateAccount,
    facebookLogin,
    googleLogin,
    forgotPassword,
    resetPassword,
};
