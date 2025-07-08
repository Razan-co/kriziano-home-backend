const mongoose = require('mongoose')
const {addressSchema} = require('../sub-model/addressModel')

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
      }
    }
  ],
  shippingInfo: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address:{
        type:mongoose.Types.ObjectId,
        required:[true,"Please provid address ID to make orders"]
    }
  },

  paymentMethod: {
    type: String,
    enum: ['cod', 'card', 'upi'],
    default: 'cod'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
 paymentInfo: {
  id: String,// Razorpay/Stripe Payment ID
  status: String,
  method: String,
  amount: Number,
  currency: String,
  provider: String
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
    enum: ['Ordered','Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Ordered'
  },
  deliveredAt: Date,
  cancelledAt: Date,


}, {
  timestamps: true
})

const OrderModel = mongoose.model('order', orderSchema)
module.exports = OrderModel
