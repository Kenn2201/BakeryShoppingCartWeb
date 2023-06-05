const userModel = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { createReadStream } = require('fs');
const { GridFSBucket } = require('mongodb');
const Product = require('../models/Products');

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ShoppingCart = require('../models/CartItem');

const { body, validationResult } = require('express-validator');


function handleErrors(err) {
  let errors = {
    email: '',
    password: '',
    contactNumber: '',
    name: '',
    age: '',
    address: '',
  };

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

module.exports.sellerproductslists_get = async (req, res) => {
  try {
    const products = await Product.find();
    const yourUserId = req.user.id; // Assuming your user ID is stored in req.user._id
    res.render('sellerproductslists', { products, yourUserId });
  } catch (err) {
    console.log(err);
    res.status(400).send('Error fetching products');
  }
};

module.exports.cart_items_count_get = async (req, res) => {
  try {
    const user = req.user.id;
    const cartItemCount = await CartItem.countDocuments({ user });
    res.json({ count: cartItemCount });
  } catch (err) {
    console.log(err);
    res.status(400).send('Error fetching cart items count');
  }
};

module.exports.cart_count_get = async (req, res) => {
  try {
    // Fetch the product and cart data here
    // For example:
    // const product = ...;

    const cart = {
      totalItems: 0
    };

    res.render('home', { product: product, });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Retrieve the shopping cart items for the current user
module.exports.shoppingcart_get = async (req, res) => {
  try {
    // Retrieve shopping cart items for the logged-in user
    const currentUser = req.user; // Assuming you are using a middleware to store the user object in the request
    const currency = currentUser.currency;
    const userId = req.user.id;
    const shoppingCartItems = await ShoppingCart.find({ customer_id: userId });

    res.render('shoppingCart', { product: shoppingCartItems, user: req.user ,user: currentUser, currency: currency});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Add a product to the shopping cart
module.exports.shoppingcart_post = async (req, res) => {
  try {
    const { product_id, product_quantity } = req.body;

    // Retrieve the referenced product
    const product = await Product.findById(product_id);

    // Create a new shopping cart item
    const shoppingCartItem = new ShoppingCart({
      customer_id: req.user.id, // Assign the ID of the logged-in user
      product_id: product.product_id,
      product_name: product.product_name,
      description: product.description,
      product_quantity, // Use the provided quantity
      units: product.units,
      price: product.price,
      subtotal_per_unit_and_quantity: product.price * product_quantity,
      overall_total_checkout_price: product.price * product_quantity,
    });

    // Populate the image property with contentType and data
    shoppingCartItem.image = {
      contentType: product.image.contentType,
      data: product.image.data,
    };

    // Save the shopping cart item
    await shoppingCartItem.save();

    res.status(201).json({ message: 'Product added to the shopping cart successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};









module.exports.productpage_get = async (req, res) => {
  try {
    const products = await Product.find();
    res.render('productpage', { products }); // Pass the products data to the view
  } catch (err) {
    console.log(err);
    res.render('error', { message: 'Error fetching product page' });
  }
};


module.exports.view_product_get = async (req, res) => {
  try {
    const productId = req.params.productId; // Use params instead of query
    const product = await Product.findById(productId);

    if (!product) {
      // Handle product not found
      return res.render('error', { message: 'Product not found' });
    }

    res.render('productview', { product });
  } catch (err) {
    // Handle error
    console.log(err);
    res.render('error', { message: 'Internal server error' });
  }
};




module.exports.productpage_post = async (req, res) => {
  try {
    const { productId } = req.body;
    const products = await Product.find();
    const selectedProduct = products.find(product => product.id === productId);
    res.render('productpage', { products, selectedProduct });
  } catch (err) {
    console.log(err);
    res.status(400).send('Error fetching product details');
  }
};



module.exports.sellerproductadd_get = (req, res) => {
  res.render('sellerproductadd');
};

module.exports.sellerui_get = (req, res) => {
  res.render('sellerui');
};


module.exports.selleraddproduct_post = [
  // Validate and sanitize the request body fields
  body('product_name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').trim().notEmpty().withMessage('Price is required'),
  body('product_quantity').trim().notEmpty().withMessage('Quantity is required'),
  body('units').trim().notEmpty().withMessage('Units is required'), // Add validation for the units field

  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(req.body); // Debug statement
        console.log(errors.array()); // Debug statement
        return res.status(400).json({ errors: errors.array() });
      }

      const { product_name, description, price, product_quantity, units } = req.body; // Include units in destructuring
      const { filename, mimetype } = req.file;

      const image = {
        data: fs.readFileSync(path.join('uploads', filename)),
        contentType: mimetype
      };

      const user = req.user.id; // Assuming req.user contains the user's ObjectId

      const product = new Product({
        product_name,
        description,
        price,
        product_quantity,
        units, // Include units in the product creation
        image,
        user,
        product_id: uuidv4() // Generate a unique product ID dynamically
      });

      await product.save();

      res.redirect('/selleruiproductlists');
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
];







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

module.exports.edit_product_get = async (req, res) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId);
    res.render('sellerproductedit', { product });
  } catch (err) {
    console.log(err);
    res.status(400).send('Error fetching product');
  }
};




module.exports.edit_product_post = async (req, res) => {
  const productId = req.params.productId;
  try {
    const { name, description, price, discount, units } = req.body; // Include units in destructuring

    const product = await Product.findById(productId);
    product.product_name = name;
    product.description = description;
    product.price = price;
    product.units = units; // Assign the units value to the product

    if (discount && parseFloat(discount) < parseFloat(price)) {
      const newDiscountedPrice = parseFloat(discount);
      product.previous_price = parseFloat(price);
      product.discount = newDiscountedPrice;
      product.price = parseFloat(price) - newDiscountedPrice;
    } else {
      product.previous_price = undefined;
      product.discount = undefined;
    }

    if (req.file) {
      const { filename, mimetype } = req.file;

      const image = {
        data: fs.readFileSync(path.join('uploads', filename)),
        contentType: mimetype
      };

      product.image = image;
    }

    await product.save();

    res.redirect('/selleruiproductlists');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Delete a product from the shopping cart
module.exports.delete_product_cart = async (req, res) => {
  const productId = req.params.productId;
  const userId = req.user.id;

  try {
    // Delete the product from the shopping cart
    await ShoppingCart.deleteOne({ customer_id: userId, product_id: productId });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};




module.exports.delete_product = async (req, res) => {
  const productId = req.params.productId;
  try {
    await Product.findByIdAndDelete(productId);
    console.log('Product has been deleted:', productId);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'An error occurred while deleting the product' });
  }
};



module.exports.signup_get = (req,res) => {
    res.render('signup');
}

module.exports.signup_post = async (req, res) => {
  const { email, password, contactNumber, customerName, age, address } = req.body;

  try {
    const newUser = await userModel.create({ email, password, contactNumber, customerName, age, address });
    const userToken = createToken(newUser._id);
    res.cookie('jwt', userToken, { httpOnly: true, maxTokenAge: maxTokenAge * 1000 });

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



