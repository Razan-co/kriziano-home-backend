const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // assuming seller and buyer are in same model
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
      },
      price: {
        type: Number,
        required: true
      }
    }
  ],
  shippingInfo: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'card', 'upi'],
    default: 'cod'
  },
  paymentInfo: {
    id: String, // payment gateway id (e.g., Stripe/Razorpay ID)
    status: String
  },
  totalAmount: {
    type: Number,
    required: true
  },
  taxPrice: {
    type: Number,
    default: 0
  },
  shippingPrice: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  isCancelRequested: {
    type: Boolean,
    default: false
  },
  cancelStatus: {
    type: String,
    enum: ['approve', 'reject', null],
    default: null
  },
  isOrderLive: {
    type: Boolean,
    default: true
  },
  deliveredAt: Date,
  cancelledAt: Date,
  paymentAt: Date
}, {
  timestamps: true
})

const OrderModel = mongoose.model('Order', orderSchema)
module.exports = OrderModel
