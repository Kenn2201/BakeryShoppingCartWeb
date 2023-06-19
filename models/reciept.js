const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  receipt_id: {
    type: String,
    required: true,
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customer_email: {
    type: String,
    required: true,
  },
  order_created_at: {
    type: Date,
    default: Date.now,
  },
  order_completed_at: {
    type: Date,
    default: Date.now,
  },
  order_items: [{ // Add order_items field to the schema
    type: Object,
    required: true,
  }]
});

const Receipt = mongoose.model('Receipt', receiptSchema);

module.exports = Receipt;
