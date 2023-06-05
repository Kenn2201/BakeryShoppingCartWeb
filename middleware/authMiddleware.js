const jwt = require('jsonwebtoken');
const { secret } = require('../controllers/authControllers');
const userModel = require('../models/User');

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, secret, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect('/login');
      } else {
        req.user = decodedToken;
        next();
      }
    });
  } else {
    res.redirect('/login');
  }
};

const requireAdminOrSeller = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'seller')) {
      next();
    } else {
      res.redirect('/');
    }
  });
};

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

module.exports = { requireAuth, checkUser, requireAdminOrSeller };