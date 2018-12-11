var mongoose = require('mongoose');
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcrypt-nodejs');

var AdminSchema = new mongoose.Schema(
{
    username: {
        type: String,
        unique: '({VALUE}) Already Exist in Username',
        required: true,
      },
      name:{
        type:String,
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
      adminLevel:{
        type:Number,
        default:0 
      },
      admin:{
        type:Boolean,
        default:true
      }

}
);

AdminSchema.pre('save', function(next) {
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
  
  
  AdminSchema.methods.comparePassword = function(pass, cb) {
    Admins.findOne({_id:this._id}).select('_id').select('+password').exec().then(data=>{
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
  
  AdminSchema.plugin(beautifyUnique,{
    defaultMessage:'username or email already exist'
  });

const Admins = mongoose.model('Admins', AdminSchema);
module.exports = Admins;
