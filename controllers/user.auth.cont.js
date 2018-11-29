const jwt = require('jsonwebtoken');

const Users = require('../models/Users');
const config = require('../configs/config');

const register = body => {
    return new Promise(async (resolve, reject) => {
        const savable = new Users(body);
        savable.save((error, saved) => {
            if (error) {
                return reject(error);
            }
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

module.exports = {
    register,
    login,
};
