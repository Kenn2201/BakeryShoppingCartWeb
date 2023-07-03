const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  cartItems: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CartItem',
      required: true,
    },
    image: {
      type: Object,
      required: true,
    },
<<<<<<< HEAD
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Change this from 'Customer' to 'User'
      required: true,
    },
=======
    customer_id: { type: mongoose.Schema.Types.ObjectId, required: true },
>>>>>>> origin/master
    product_id: {
      type: String,
      required: true,
    },
    product_name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    product_quantity: {
      type: Number,
      required: true,
    },
    units: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    subtotal_per_unit_and_quantity: {
      type: Number,
      required: true,
    },
    overall_total_checkout_price: {
      type: Number,
      required: true,
    },
  }],
  isPaid: {
    type: Boolean,
    default: false,
  },
  isCompleted: {
<<<<<<< HEAD
    type: String,
    enum: ['approved', 'processing', 'cancelled'],
    default: 'processing',
  },
  order_created_at: {
    type: Date,
    default: Date.now,
  },
  order_completed_at: {
    type: Date,
    default: Date.now,
=======
    type: Boolean,
    default: false,
>>>>>>> origin/master
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
});

  
  const Order = mongoose.model('Order', orderSchema);
  module.exports = Order;
  
