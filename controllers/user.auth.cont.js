const jwt = require('jsonwebtoken');

const Users = require('../models/Users');
const config = require('../configs/config');
const helper = require('../helpers/mailHelper');

const register = body => {
    return new Promise(async (resolve, reject) => {
        const savable = new Users(body);
        savable.save(async(error, saved) => {
            if (error) {
                return reject(error);
            }
            const URL = `${config.FRONTEND_HOST}/activate?id=${savable._id}`;
            const ejsTemplate = await helper.getEJSTemplate({fileName:'email-verification.ejs'});
            const finalHTML = ejsTemplate({
                link:URL
            });
            await helper.SendMail({to:savable.email,subject:"[Eraswap] Activation Email",body:finalHTML});
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
                if(!user.activated){
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

const activateAccount = async(id)=>{
   return await Users.update({ _id:id },{$set:{activated:true}}).exec();
}
module.exports = {
    register,
    login,
    activateAccount
};
