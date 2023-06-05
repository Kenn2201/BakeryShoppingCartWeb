const jwt = require('jsonwebtoken');
const {secret} = require('../controllers/authControllers');
const userModel = require('../models/User');

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  // Check if the JWT exists
  if (token) {
    jwt.verify(token, secret, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect('/login'); // Redirect to login page if the token is invalid or expired
      } else {
        // Populate req.user with the decoded token data
        req.user = decodedToken;
        next(); // Call the next middleware or controller function
      }
    });
  } else {
    res.redirect('/login'); // Redirect to login page if the token is missing
  }
};


// check current user
const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, secret, async (err, decodedToken) => {
      if (err) {
        res.locals.user = null;
        next();
      } else {
        let user = await userModel.findById(decodedToken.id);
        res.locals.user = user;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};

module.exports = { requireAuth, checkUser };