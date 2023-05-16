const express = require('express');
const mongoose = require('mongoose');
const app = express();
const authRoutes = require('./routes/routes');
const { requireAuth,checkUser } = require('./middleware/authMiddleware');
const userModel = require('./models/User');

// middleware
app.use(express.static('public'));
app.use(express.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// view engine
app.set('view engine', 'ejs');

// database connection
const dbURI = 'mongodb+srv://test123:123456!@cluster0.34gh2cq.mongodb.net/node-auth';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true })
  .then((result) => app.listen(3000))
  .catch((err) => console.log(err));

// routes
app.get('*',checkUser);
app.get('/', (req, res) => res.render('home'));

app.get('/smoothies', requireAuth, (req, res) => res.render('smoothies'));
app.get('/adminsmoothies',requireAuth,(req, res) => res.render('adminsmoothies'));



app.get('/userlists', requireAuth, function(req, res) {
  userModel.find({}, function(err, users) {
    if (err) throw err;
    const currentUser = res.locals.user; // Get the current user from res.locals
    const filteredUsers = users.filter(user => user._id.toString() !== currentUser._id.toString()); // Filter out the current user
    res.render('userlists', { users: filteredUsers });
  });
});


app.get('/editusers', requireAuth, function(req, res) {
  userModel.find({}, function(err, users) {
    if (err) throw err;
    const currentUser = res.locals.user; // Get the current user from res.locals
    const filteredUsers = users.filter(user => user._id.toString() !== currentUser._id.toString()); // Filter out the current user
    res.render('editusers', { users: filteredUsers });
  });
});


app.post('/edituserstatus', requireAuth, function(req, res) {
  const data = Array.isArray(req.body) ? req.body : [req.body]; // Ensure data is an array

  // Loop through the data and update the status field in MongoDB
  data.forEach((item) => {
    const { userId, status } = item;

    // Update the user's status field in MongoDB
    userModel.updateOne({ _id: userId }, { $set: { status: status } }, (err, result) => {
      if (err) {
        console.log(err);
        // Handle the error accordingly
      } else {
        console.log('User Status updated:', userId);
        console.log(result);
        // Status updated successfully
      }
    });
  });

  res.json({ message: 'Status updated successfully' });
});


app.post('/editusers', requireAuth, function(req, res) {
  const userId = req.body.userId; // Retrieve userId from the request body

  userModel.findByIdAndUpdate(userId, { isUserDeleted: true }, function(err, user) {
    if (err) {
      console.error('Error soft deleting user:', err);
      res.status(500).json({ error: 'An error occurred while soft deleting the user' });
    } else {
      console.log('User soft deleted:', userId);
      res.status(200).json({ message: 'User soft deleted successfully' });
    }
  });
});

app.delete('/deleteuser/:userId', requireAuth, function(req, res) {
  const userId = req.params.userId;
  userModel.findByIdAndDelete(userId, function(err, user) {
    if (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'An error occurred while deleting the user' });
    } else {
      console.log('User has been deleted:', userId);
      res.status(200).json({ message: 'User deleted successfully' });
    }
  });
});

// Handle POST request to update user list
app.use(authRoutes);



