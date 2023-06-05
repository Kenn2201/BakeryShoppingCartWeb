const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: true,
  },
  product_id: {
    type: String,
    default: uuidv4(),
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: null,
  },
  previous_price: {
    type: Number,
    default: null,
  },
  product_quantity: {
    type: Number,
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
  units: {
    type: String,
    enum: ['whole', 'half', 'slice'],
    default: 'whole',
  },
  sold_count: {
    type: Number,
    default: 0,
  },
});



const Product = mongoose.model('Product', productSchema);

module.exports = Product;
