const asyncError = require('../middlewares/asyncError')
const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const ErrorHandler = require('../utils/ErrorHandler')
const crypto = require("crypto")


// -------------------- USER SIDE --------------------

//create order (post) -  /order/online/place-order   ps:once order created user should complete the payment  
exports.createOrderOnlinePayment = asyncError(async (req, res, next) => {
  const { items, shippingInfo = {}, paymentMethod } = req.body
  if (!items || items.length === 0)
    return next(new ErrorHandler('No items to order', 400))
  
  const orderItems = []
  let totalAmount = 0
  
  for (const item of items) {
    const product = await Product.findById(item.productId)
    if (!product) return next(new ErrorHandler('Product not found', 404))
    if (product.stock < item.quantity)
      return next(new ErrorHandler(`Insufficient stock for ${product.name}`, 400))

    totalAmount += product.price * item.quantity

    orderItems.push({
      product: product._id,
      quantity: item.quantity
    })
  }

  // Create Razorpay order
  const options = {
    amount: totalAmount * 100,
    currency: 'INR',
    receipt: 'order_rcptid_' + Date.now()
  }

  const razorOrder = await razorpay.orders.create(options)
  if (!razorOrder.id) return next(new ErrorHandler('Razorpay order creation failed'))

  const fullShippingInfo = {
    ...shippingInfo,
    fullName: req.user.name,
    phone: req.user.phone
  }

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingInfo: fullShippingInfo,
    paymentMethod,
    totalAmount,
    totalPrice: totalAmount,
    paymentInfo: {
      id: razorOrder.id,
      status: 'created'
    },
    orderStatus: 'Ordered',
    isPaid: false
  });

  res.status(201).json({ success: true, order })
})

//verify payment  (post)  -   /order/online/verify-payment்
exports.verifyPayment = asyncError(async (req, res, next) => {
  const { paymentId, orderId, signature } = req.body

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  if (generatedSignature !== signature) {
    return next(new ErrorHandler('Payment verification failed', 401))
  }

  // Find and update order
  const order = await Order.findOne({ 'paymentInfo.id': orderId })
  if (!order) return next(new ErrorHandler('Order not found', 404))

  order.isPaid = true
  order.paidAt = new Date()
  order.paymentInfo = {
    id: paymentId,
    status: 'paid'
  }
  await order.save()

  res.status(200).json({ success: true, message: 'Payment verified successfully', order })
})


exports.razorpayWebhook = asyncError(async (req, res, next) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  const signature = req.headers['x-razorpay-signature']
  const body = req.body // raw Buffer

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return res.status(400).json({ success: false, message: 'Invalid signature' })
  }

  const event = JSON.parse(body.toString())

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity

    // Find order by Razorpay order ID stored in paymentInfo.id
    const order = await Order.findOne({ 'paymentInfo.id': payment.order_id })
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    // Update payment info with method, status, etc.
    order.isPaid = true
    order.paidAt = new Date()
    order.paymentInfo = {
      id: payment.id,
      status: payment.status,
      method: payment.method,           // <— update method here
      amount: payment.amount / 100,     // Razorpay amount is in paise
      currency: payment.currency,
      provider: 'razorpay'
    }

    await order.save()
  }

  res.status(200).json({ success: true })
})


exports.getRazorPAyKeyId = (req, res, next) => {
  res.status(200).json({
    success: true,
    key: process.env.KEY_ID
  })
}

// get orders based on user  (get) -   /order/get-order
exports.getMyOrders = asyncError(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id }).populate('items.product', 'name images').sort({ createdAt: -1 })
  if (!orders || orders.length <= 0)
    return next(new ErrorHandler("Order not found", 400))
  res.status(200).json({ success: true, orders })
})

// Get specific order (GET) - /order/:orderId
exports.getSpecificOrder = asyncError(async (req, res, next) => {
  const { orderId } = req.params

  const order = await Order.findById(orderId).populate('user','name email')

  if (!order) return next(new ErrorHandler("Order not found", 404))
  
  const isAdmin = req.user.role === 'admin'
  const isYourOrder = order.user.toString() === req.user._id.toString()

  if (!isAdmin && !isYourOrder) 
    return next(new ErrorHandler("You're not authorized to view this order", 403))

  res.status(200).json({
    success: true,
    order
  })
})


//track rder   - (GET)   -  /order/track/orderId:
exports.trackOrder = asyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId)
    .populate('items.product', 'name images')
    .populate('user', 'name email')

    if (!order) return next(new ErrorHandler("Order not found", 404))

  const isAdmin = req.user.role === 'admin'
  const isYourOrder = order.user.toString() === req.user._id.toString()

  if (!isAdmin && !isYourOrder) 
    return next(new ErrorHandler("You're not authorized to view this order", 403))

  res.status(200).json({ success: true, order })
})

exports.cancelOrderRequest = asyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId)
  if (!order || order.buyer.toString() !== req.user._id.toString())
    return next(new ErrorHandler('Order not found or not authorized', 404))

  if (order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled')
    return next(new ErrorHandler('Order cannot be cancelled at this stage', 400))

  order.isCancelRequested = true
  await order.save()
  res.status(200).json({ success: true, message: 'Cancellation request sent to seller' })
})

// -------------------- SELLER SIDE --------------------

exports.getSellerOrders = asyncError(async (req, res, next) => {
  const orders = await Order.find({ 'items.seller': req.user._id })
    .populate('buyer', 'name email')
    .populate('items.product', 'name')

  res.status(200).json({ success: true, orders })
})

exports.respondToCancelRequest = asyncError(async (req, res, next) => {
  const { orderId } = req.params
  const { action } = req.body // action: 'approve' or 'reject'

  const order = await Order.findById(orderId)
  if (!order) return next(new ErrorHandler('Order not found', 404))

  const isSellerInOrder = order.items.some(item => item.seller.toString() === req.user._id.toString())
  if (!isSellerInOrder) return next(new ErrorHandler('Not authorized for this order', 403))

  if (!order.isCancelRequested) return next(new ErrorHandler('No cancel request found', 400))

  if (action === 'approve') {
    order.orderStatus = 'Cancelled'
    order.cancelledAt = Date.now()
    order.isOrderLive = false
  }

  order.cancelStatus = action
  order.isCancelRequested = false

  await order.save()
  res.status(200).json({ success: true, message: `Order ${action}d successfully` })
})

exports.updateOrderStatus = asyncError(async (req, res, next) => {
  const { orderId } = req.params
  const { status } = req.body // 'Confirmed', 'Shipped', 'Delivered', etc.

  const order = await Order.findById(orderId)
  if (!order) return next(new ErrorHandler('Order not found', 404))

  const isSellerInOrder = order.items.some(item => item.seller.toString() === req.user._id.toString())
  if (!isSellerInOrder) return next(new ErrorHandler('Not authorized for this order', 403))

  order.orderStatus = status

  if (status === 'Delivered') {
    order.deliveredAt = Date.now()
    order.isOrderLive = false
  }

  await order.save()
  res.status(200).json({ success: true, message: 'Order status updated', order })
})


exports.onlinePaymentOrder = asyncError(async (req, res, next) => {
  const { items, shippingInfo } = req.body

  var options = {
    amount,
    currency: 'INR',
    reciept: Date.now() + '_razan_and_co'
  }

  await razorpay.create(options, function (err, order) {
    if (!order)
      return next(new ErrorHandler("Failde to create order", 400))

    res.status(200).json({
      success: true,
      orderId: order.order_id,
      order
    })
  })
})



