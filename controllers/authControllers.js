const userModel = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
const User = require('../models/User');


function handleErrors(err) {
  let errors = { email: '', password: '' };

  if (err.message === 'incorrect email') {
    errors.email = 'That email is not registered';
  }

  if (err.message === 'incorrect password') {
    errors.password = 'That password is incorrect';
  }

  if (err.message === 'This account is disabled by the admin') {
    errors.email = 'This account is disabled by the admin';
  }

  if (err.message === 'This account is soft deleted by the admin') {
    errors.email = 'This account is soft deleted by the admin';
  }

  if (err.message.includes('user validation failed')) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
}



const maxTokenAge = 3 * 24 * 60 * 60;
const createToken = (id, role) =>{
  return jwt.sign({id,role},secret,{
    expiresIn: maxTokenAge
  });
}
module.exports = {secret};




module.exports.login_get = (req,res) => {
    res.render('login');
}

module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.login(email, password);

    if (user.status === 'disabled') {
      throw Error('This account is disabled by the admin');
    }

    if (user.isUserDeleted === 'true') {
      throw Error('This account is soft deleted by the admin');
    }

    const userToken = createToken(user._id, user.role);
    res.cookie('jwt', userToken, { httpOnly: true, maxAge: maxTokenAge * 1000 });

    if (user.role === 'admin') {
      res.status(200).json({ userLogin: user._id, role: 'admin' });
    } else {
      res.status(200).json({ userLogin: user._id, role: 'user' });
    }
  } catch (err) {
    console.log(err);
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};


module.exports.userlists_get = async (req, res) => {
  try {
    const users = await userModel.find();
    res.render('userlists', { users });
  } catch (err) {
    console.log(err);
    res.status(400).send('Error fetching users');
  }
};




module.exports.edituserlists_get = async (req, res) => {
  try {
    const users = await userModel.find();
    res.render('editusers', { users });
  } catch (err) {
    console.log(err);
    res.status(400).send('Error fetching users');
  }
};

module.exports.toggleDeleted = async (req, res) => {
  const userId = req.body.userId;
  try {
    await userModel.findByIdAndUpdate(userId, { isUserDeleted: true });
    console.log('User soft deleted:', userId);
    res.status(200).json({ message: 'User soft deleted successfully' });
  } catch (err) {
    console.error('Error soft deleting user:', err);
    res.status(500).json({ error: 'An error occurred while soft deleting the user' });
  }
};

module.exports.deleteuserlists = async (req, res) => {
  const userId = req.body.userId;
  try {
    await userModel.findByIdAndDelete(userId);
    console.log('User has been deleted:', userId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'An error occurred while deleting the user' });
  }
};



module.exports.updateuserstatus_update = async (req, res) => {
  const { userId, status } = req.body;

  try {
    // Update the user's status field in MongoDB
    const result = await userModel.updateOne({ _id: userId }, { $set: { status: status } });
    console.log('User Status updated:', userId);
    console.log(result);

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while updating user status' });
  }
};





module.exports.signup_get = (req,res) => {
    res.render('signup');
}

module.exports.signup_post = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const newUser = await userModel.create({ email, password, role });
    const userToken = createToken(newUser._id);
    res.cookie('jwt',userToken,{httpOnly: true, maxTokenAge: maxTokenAge * 1000});

    if (newUser.role === 'admin') {
      res.status(200).json({ newUser: newUser._id, role: 'admin' });
    } else {
      res.status(200).json({ newUser: newUser._id, role: 'user' });
    }
  } catch (err) {
    const errors = handleErrors(err);
    if (err.code === 11000) {
      errors.email = 'Email already exists. Try creating a new one.';
      res.status(400).json({ errors });
    } else {
      console.log(err);
      res.status(400).json({ errors });
    }
  }
};

  
  
module.exports.logout_get = (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}



