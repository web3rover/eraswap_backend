const mongoose = require('mongoose');
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcrypt-nodejs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: '({VALUE}) Already Exist in Username',
    required: true,
  },
  password: {
    type: String,
    select:false,
    required: true,
  },
  email: {
    type: String,
    unique: 'Email ({VALUE}) Already Exist',
    required: true,
  },
  activated:{
    type:Boolean,
    default:false
  },
  adminLevel:{
    type:Number,
    default:0 
  },
  admin:{
    type:Boolean,
    default:false
  },
  is_fb:{
    type:Boolean,
    default:false
  },
  is_google:{
    type:Boolean,
    default:false
  },
  wallet: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },],
  //add more user metadata here
});

UserSchema.pre('save', function(next) {
  var user = this;
  if (this.isModified('password') || this.isNew) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        return next(err);
      }
      bcrypt.hash(user.password, salt, null, function(err, hash) {
        if (err) {
          return next(err);
        }
        user.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});


UserSchema.methods.comparePassword = function(pass, cb) {
  Users.findOne({_id:this._id}).select('_id').select('+password').exec().then(data=>{
  bcrypt.compare(pass, data.password, function(err, isMatch) {
    if (err) {
      return cb(err);
    }
    return cb(null, isMatch);
  });
}).catch(error=>{
  return cb(error)
});
};

UserSchema.plugin(beautifyUnique,{
  defaultMessage:'username or email already exist'
});
const Users = mongoose.model('Users', UserSchema);
module.exports = Users;
