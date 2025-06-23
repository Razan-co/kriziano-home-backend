const asyncError = require('../middlewares/asyncError')
const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const ErrorHandler = require('../utils/ErrorHandler')

// -------------------- USER SIDE --------------------

exports.createOrder = asyncError(async (req, res, next) => {
  const { items, shippingInfo, paymentMethod } = req.body
  if (!items || items.length === 0) return next(new ErrorHandler('No items to order', 400))

  const orderItems = []
  let totalAmount = 0

  for (const item of items) {
    const product = await Product.findById(item.productId)
    if (!product) return next(new ErrorHandler('Product not found', 404))
    if (product.stock < item.quantity)
      return next(new ErrorHandler(`Insufficient stock for ${product.name}`, 400))

    product.stock -= item.quantity
    await product.save()

    totalAmount += product.price * item.quantity
    orderItems.push({
      product: product._id,
      seller: product.seller,
      quantity: item.quantity,
      price: product.price
    })
  }

  const order = await Order.create({
    buyer: req.user._id,
    items: orderItems,
    shippingInfo,
    paymentMethod,
    totalAmount,
    totalPrice: totalAmount,
    orderStatus: 'Processing',
    isCancelRequested: false
  })

  res.status(201).json({ success: true, order })
})

exports.getMyOrders = asyncError(async (req, res, next) => {
  const orders = await Order.find({ buyer: req.user._id }).populate('items.product', 'name images')
  res.status(200).json({ success: true, orders })
})

exports.trackOrder = asyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId)
    .populate('items.product', 'name images')
    .populate('buyer', 'name email')

  if (!order || order.buyer._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Order not found or not authorized', 404))
  }

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
