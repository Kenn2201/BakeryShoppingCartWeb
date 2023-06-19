const moongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new moongoose.Schema({
  email: {
      type: String,
      required: [true, 'Please enter an email.'],
      unique: true,
      lowercase: true,
      validate: [isEmail, 'Please enter a valid email address.'],
  },
  password: {
      type: String,
      required: [true, 'Please enter a password.'],
      minlength: [6, 'Minimum password length is 6 characters.'],
  },
  role: {
      type: String,
      required: true,
      enum: ['seller', 'user', 'admin'],
      default:'user',

  },
  status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
  },
  isUserDeleted: {
      type: String,
      enum: ['true', 'false'],
      default: 'false',
  },
  contactNumber: {
      type: String,
      required: [true, 'Please enter a contact number.'],
  },
  customerName: {
      type: String,
      required: [true, 'Please enter a name.'],
  },
  age: {
      type: Number,
      required: [true, 'Please enter an age.'],
  },
  address: {
      type: String,
      required: [true, 'Please enter an address.'],
  },
  currency: {
      type: Number,
      default: 1000,
  },
});






userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
      return next();
    }
  
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });

// static method to login user
userSchema.statics.login = async function(email, password) {
    const user = await this.findOne({ email });
    if (user) {
      const auth = await bcrypt.compare(password, user.password);
      if (auth) {
        return user;
      }
      throw Error('incorrect password');
    }
    throw Error('incorrect email');
  };




const User = moongoose.model('User',userSchema);


module.exports = User;
