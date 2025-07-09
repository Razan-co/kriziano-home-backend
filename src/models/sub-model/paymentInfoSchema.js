const mongoose = require('mongoose')

const paymentInfoSchema = new mongoose.Schema({
    id: { type: String, required: true }, // Razorpay/Stripe Payment ID
    status: {
        type: String,
        enum: ['paid', 'unpaid'],
        default: 'unpaid'
    },
    method: { type: String }, // 'card', 'upi', etc.
    amount: { type: Number },
    currency: { type: String, default: 'INR' },
    provider: { type: String } // 'razorpay', 'stripe', etc.
}, { _id: false })

module.exports=paymentInfoSchema


