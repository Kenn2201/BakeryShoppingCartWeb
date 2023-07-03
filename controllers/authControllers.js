
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { createReadStream } = require('fs');
const { GridFSBucket } = require('mongodb');
const fs = require('fs');

const mongoose = require('mongoose');
const ShoppingCart = require('../models/CartItem');
const { body, validationResult } = require('express-validator');

const userModel = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Products');
const Receipt = require('../models/reciept');
const nodemailer = require('nodemailer');
const path = require('path');

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




// Configure the Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your preferred email service
  auth: {
    user: 'feign12345@gmail.com', // Replace with your email address
    pass: 'nightraid123', // Replace with your email password
  },
});

module.exports.getreciepthistory = async (req, res) => {
  console.log(req.user.id);
  try {
    const user = await User.findById(req.user.id).lean();

    if (!user) {
      return res.status(404).send('User not found');
    }

    const receipts = await Receipt.find({ customer_id: user._id })
      .populate({
        path: 'order_id',
        populate: {
          path: 'order_items.product',
          model: 'Product'
        }
      })
      .populate('customer_id')
      .lean();

    console.log(receipts);

    res.render('reciepthistory', { receipts: receipts }); // Pass receipts as an object property
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports.getreciepthistoryviewpage = async (req, res) => {
  const { receipt_id } = req.params;

  try {
    // Assuming you have a model for receipts, you can fetch the receipt from the database
    const receipt = await Receipt.findById(receipt_id);

    if (!receipt) {
      // Handle case when receipt is not found
      return res.status(404).render('error', { message: 'Receipt not found' });
    }

    // Perform any necessary operations or data retrieval related to the receipt

    // Pass the "receipt" variable to the template
    res.render('reciepthistoryviewpage', { receipts: [receipt] });
  } catch (error) {
    // Handle any errors that occur during the retrieval
    console.error(error);
    res.status(500).render('error', { message: 'An error occurred' });
  }
};









module.exports.process_payment = async (req, res) => {
  try {
    console.log('Processing payment...');
    const orderId = req.body._id;
    console.log('Request body:', req.body);
    console.log('Order ID:', orderId);
    const order = await Order.findById(orderId);
    console.log('Order:', order);

    if (!order) {
      console.log('Order not found');
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update the order's isPaid and isCompleted fields
    order.isPaid = true;
    order.isCompleted = true;
    const updatedOrder = await order.save();
    console.log('Updated Order:', updatedOrder);

    // Update the user's currency balance
    const customer_id = order.cartItems[0].customer_id;
    console.log('Customer ID:', customer_id);
    const user = await User.findById(customer_id);
    console.log('User:', user);

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    if (isNaN(user.currency)) {
      console.log('Invalid currency value');
      return res.status(400).json({ message: 'Invalid currency value' });
    }

    // Calculate the total checkout price from the cart items
    const totalCheckoutPrice = order.cartItems.reduce((sum, item) => sum + item.overall_total_checkout_price, 0);

    const updatedCurrency = user.currency - totalCheckoutPrice;

    if (updatedCurrency < 0) {
      console.log('Insufficient funds');
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    user.currency = updatedCurrency;
    await user.save();

    try {
      // Update the product's quantity and sold_count
      for (const item of order.cartItems) {
        const product = await Product.findOne({ product_id: item.product_id });
      
        if (!product) {
          console.log('Product not found');
          return res.status(404).json({ message: 'Product not found' });
        }
      
        if (product.product_quantity < item.product_quantity) {
          console.log('Insufficient product quantity');
          return res.status(400).json({ message: 'Insufficient product quantity' });
        }
      
        console.log('Before update: product_quantity:', product.product_quantity, 'sold_count:', product.sold_count);
      
        product.product_quantity -= item.product_quantity;
        product.sold_count += item.product_quantity;
      
        await product.save();
      
        console.log('After update: product_quantity:', product.product_quantity, 'sold_count:', product.sold_count);
      }
    } catch (error) {
      console.log('Error updating product quantities:', error);
      return res.status(500).json({ message: 'Error updating product quantities' });
    }

    // Create a new receipt
    const newReceipt = new Receipt({
      receipt_id: uuidv4(),
      customer_id: user._id,
      order_id: updatedOrder._id,
      customer_email: user.email,
      order_created_at: order.createdAt,
      order_completed_at: order.updatedAt,
      order_items: order.cartItems // Add order_items field and set its value to cartItems from the order
    });
    

try {
  const savedReceipt = await newReceipt.save();
  console.log('New Receipt:', savedReceipt);
  console.log('Receipt saved to the database.');

  // Clear cartItems from the order
  order.cartItems = [];
  await order.save();
  console.log('Order with cleared cartItems:', order);
} catch (error) {
  console.log('Error:', error);
}

    

    // Send a success response
    res.status(200).json({ message: 'Payment processed successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error processing payment' });
  }
};









module.exports.cancel_payment = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Move cart items from order to shopping cart
    const cartItems = order.cartItems;
    await Promise.all(
      cartItems.map(async (item) => {
        const shoppingCartItem = new ShoppingCart({
          customer_id: item.customer_id,
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          product_quantity: item.product_quantity,
          units: item.units,
          price: item.price,
          subtotal_per_unit_and_quantity: item.subtotal_per_unit_and_quantity,
          overall_total_checkout_price: item.overall_total_checkout_price,
          image: item.image,
        });
        await shoppingCartItem.save();
      })
    );

    // Delete the current order
    await Order.findByIdAndDelete(order._id);

    res.status(200).json({ message: 'Payment cancelled, items moved back to shopping cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error cancelling payment' });
  }
};



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
// Add a product to the shopping cart
module.exports.shoppingcart_post = async (req, res) => {
  try {
    const { product_id, product_quantity } = req.body;

    // Retrieve the referenced product
    const product = await Product.findById(product_id);

    // Check if the product already exists in the shopping cart
    const existingCartItem = await ShoppingCart.findOne({
      customer_id: req.user.id,
      product_id: product.product_id
    });

    if (existingCartItem) {
      // Update the quantity and subtotal of the existing item
      existingCartItem.product_quantity += product_quantity;
      existingCartItem.subtotal_per_unit_and_quantity = existingCartItem.price * existingCartItem.product_quantity;
      existingCartItem.overall_total_checkout_price = existingCartItem.subtotal_per_unit_and_quantity;
      
      await existingCartItem.save();
    } else {
      // Create a new shopping cart item
      const shoppingCartItem = new ShoppingCart({
        customer_id: req.user.id,
        product_id: product.product_id,
        product_name: product.product_name,
        description: product.description,
        product_quantity,
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
    }

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

    res.render('productview', { product , user: req.user});
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


// Add the following controller function
module.exports.updateQuantityShoppingCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Update the quantity of the product in the shopping cart
    await ShoppingCart.findByIdAndUpdate(productId, { $set: { product_quantity: quantity } });

    // Calculate the new subtotal based on the updated quantity
    const product = await ShoppingCart.findById(productId);
    const subtotal = product.price * quantity;
    product.subtotal_per_unit_and_quantity = subtotal;

    // Update the overall total checkout price
    const shoppingCartItems = await ShoppingCart.find({ customer_id: product.customer_id });
    let overallTotal = 0;
    shoppingCartItems.forEach((item) => {
      overallTotal += item.subtotal_per_unit_and_quantity;
    });
    product.overall_total_checkout_price = subtotal;

    // Save the updated product in the shopping cart
    await product.save();

    res.sendStatus(200);
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.sendStatus(500);
  }
};



module.exports.viewsellerorders = async (req, res) => {
  try {
    const orders = await Order.aggregate([
      {
        $lookup: {
          from: 'users', // The collection name in the database (it should be the plural and lowercase version of the model name)
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer_info',
        },
      },
      {
        $unwind: '$customer_info',
      },
    ]);

    res.render('orders', { orders });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};


module.exports. productordersaccpetorcancelled = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    // Find the order
    console.log('Finding the order...');
    const order = await Order.findById(orderId);

    if (!order) {
      console.log('Order not found');
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create a copy of the order
    const orderCopy = { ...order._doc };

    // Update the order's status
    console.log('Updating the order status...');
    order.isCompleted = status;
    const updatedOrder = await order.save();

    // Update the user's currency balance
    console.log('Updating user currency balance...');
    const customer_id = order.cartItems[0].customer_id;
    const user = await User.findById(customer_id);

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    if (isNaN(user.currency)) {
      console.log('Invalid currency value');
      return res.status(400).json({ message: 'Invalid currency value' });
    }

    // Calculate the total checkout price from the ordered items
    console.log('Calculating total checkout price...');
    const totalCheckoutPrice = order.cartItems.reduce((sum, item) => sum + item.subtotal_per_unit_and_quantity, 0);

    const updatedCurrency = user.currency - totalCheckoutPrice;

    if (updatedCurrency < 0) {
      console.log('Insufficient funds');
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    user.currency = updatedCurrency;
    await user.save();

    // Update the product's quantity and sold_count
    console.log('Updating product quantity and sold count...');
    for (const item of order.cartItems) {
      const product = await Product.findOne({ product_id: item.product_id });

      if (!product) {
        console.log('Product not found');
        return res.status(404).json({ message: 'Product not found' });
      }

      if (product.product_quantity < item.product_quantity) {
        console.log('Insufficient product quantity');
        return res.status(400).json({ message: 'Insufficient product quantity' });
      }

      product.product_quantity -= item.product_quantity;
      product.sold_count += item.product_quantity;

      await product.save();
    }

    // Update the order's isPaid field and create a receipt
  console.log('Updating order isPaid field and creating a receipt...');
  order.isPaid = status === 'approved';
  // Add these lines inside the productordersaccpetorcancelled function, right after updating the order's isPaid field
order.order_created_at = new Date();
order.order_completed_at = new Date();
await order.save();


    const newReceipt = new Receipt({
      receipt_id: uuidv4(),
      customer_id: user._id,
      order_id: updatedOrder._id,
      customer_email: user.email,
      order_created_at: order.createdAt,
      order_completed_at: order.updatedAt,
      order_items: order.cartItems,
    });

    const savedReceipt = await newReceipt.save();

    console.log('Order status updated successfully');
    return res.json({ success: true, order: orderCopy }); // Sending the copy of the order
  } catch (error) {
    console.log('Error updating order status:', error);
    return res.status(500).json({ message: 'Error updating order status' });
  }
};



module.exports.getsaletotalreciept = async (req, res) => {
  try {
    const orders = await Order.find({}).exec();
    console.log('Orders:', orders); // Debugging
    const userIds = orders.map(order => order.customer_id);
    console.log('User IDs:', userIds); // Debugging
    const users = await User.find({ _id: { $in: userIds } }).exec();
    console.log('Users:', users); // Debugging

    // Combine order and user data
    const ordersWithUserData = orders.map(order => {
      const user = users.find(user => user._id.toString() === order.customer_id.toString());
      let totalAmount = 0; // Initialize totalAmount to 0
      if (order.cartItems && order.cartItems.length > 0) {
        for (const item of order.cartItems) {
          totalAmount += item.overall_total_checkout_price || 0; // Add the item's price to the totalAmount
        }
      }
      return {
        ...order._doc,
        user,
        totalAmount,
      };
    });

    res.render('salesreport', { orders: ordersWithUserData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales data' });
  }
};




module.exports.approveprocessingorders = async (req, res) => {
  try {
    const { orderId, status, isPaid } = req.body;

    // Find the order
    console.log('Finding the order...');
    const order = await Order.findById(orderId);

    if (!order) {
      console.log('Order not found');
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update the order's status
    console.log('Updating the order status...');
    order.isCompleted = status === 'approved' ? 'approved' : 'cancelled';
    order.isPaid = isPaid;
    
    const updatedOrder = await order.save();

    console.log('Order status updated successfully');
    return res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.log('Error updating order status:', error);
    return res.status(500).json({ message: 'Error updating order status' });
  }
};






module.exports.createOrder = async (req, res) => {
  try {
    const { selectedProducts } = req.body;

    if (!selectedProducts || selectedProducts.length === 0) {
      return res.status(400).json({ error: 'No items found in the shopping cart' });
    }

    const cartItems = await ShoppingCart.find({ _id: { $in: selectedProducts } }).lean();

    if (cartItems.length !== selectedProducts.length) {
      return res.status(400).json({ error: 'Some items were not found in the shopping cart' });
    }

    const mappedCartItems = cartItems.map(item => {
      return {
        customer_id: item.customer_id,
        user_id: req.user._id, // Use req.user._id instead of userModel._id
        overall_total_checkout_price: item.overall_total_checkout_price,
        subtotal_per_unit_and_quantity: item.subtotal_per_unit_and_quantity,
        price: item.price,
        units: item.units,
        product_quantity: item.product_quantity,
        description: item.description,
        product_name: item.product_name,
        product_id: item.product_id,
        image: item.image,
        _id: item._id
      };
    });
    

    const order = new Order({
      cartItems: mappedCartItems,
      isPaid: false,
      isCompleted: false,
      customer_id: cartItems[0].customer_id,
    });

    const savedOrder = await order.save();
    await ShoppingCart.deleteMany({ _id: { $in: selectedProducts } });

    res.status(200).json({ orderId: savedOrder._id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'An error occurred while creating the order' });
  }
};



module.exports.payment_page_get = async (req, res) => {
  try {
    const orderId = mongoose.Types.ObjectId(req.params.orderId);
    console.log('Requested orderId:', orderId);

    const order = await Order.findById(orderId).populate('cartItems');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const modifiedCartItems = order.cartItems.map((item) => {
      return {
        _id: item._id,
        user_id: item.user_id,
        image: item.image,
        customer_id: item.customer_id,
        product_id: item.product_id,
        product_name: item.product_name,
        description: item.description,
        product_quantity: item.product_quantity,
        units: item.units,
        price: item.price,
        subtotal_per_unit_and_quantity: item.subtotal_per_unit_and_quantity,
        overall_total_checkout_price: item.overall_total_checkout_price,
        __v: item.__v,
      };
    });

    order.cartItems = modifiedCartItems;

    res.render('paymentpage', { order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
};







// Delete a product from the shopping cart
module.exports.delete_product_cart = async (req, res) => {
  const { productIds } = req.body;
  const userId = req.user.id;

  try {
    // Delete the selected products from the shopping cart
    await ShoppingCart.deleteMany({ _id: { $in: productIds }, customer_id: userId });

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



