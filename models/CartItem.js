const mongoose = require('mongoose');

const shoppingCartSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
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
  image: {
    data: {
      type: Buffer,
      required: false, // Make it not required
    },
    contentType: {
      type: String,
      required: false, // Make it not required
    },
  },
  product_quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
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
});

const ShoppingCart = mongoose.model('ShoppingCart', shoppingCartSchema);

module.exports = ShoppingCart;
