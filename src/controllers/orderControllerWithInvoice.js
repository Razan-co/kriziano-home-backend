
const asyncError = require('../middlewares/asyncError')
const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const ErrorHandler = require('../utils/ErrorHandler')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

// Helper to generate invoice PDF
const generateInvoice = async (order, res) => {
  const doc = new PDFDocument()
  const filePath = path.join(__dirname, `../invoices/invoice-${order._id}.pdf`)
  doc.pipe(fs.createWriteStream(filePath))

  doc.fontSize(20).text('Invoice', { align: 'center' })
  doc.moveDown()
  doc.fontSize(14).text(`Order ID: ${order._id}`)
  doc.text(`Buyer: ${order.buyer.name}`)
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`)
  doc.text(`Status: ${order.status}`)
  doc.moveDown()

  order.products.forEach((item, i) => {
    doc.text(`Product ${i + 1}: ${item.product.name}`)
    doc.text(`Qty: ${item.quantity}`)
    doc.text(`Price: ₹${item.price}`)
    doc.moveDown()
  })

  doc.text(`Total Amount: ₹${order.totalAmount}`, { align: 'right' })
  doc.end()

  return filePath
}

// Place order
exports.placeOrder = asyncError(async (req, res, next) => {
  const { products } = req.body
  const buyer = req.user._id

  if (!products || products.length === 0)
    return next(new ErrorHandler('No products provided', 400))

  let totalAmount = 0
  const orderProducts = []

  for (const item of products) {
    const product = await Product.findById(item.productId)
    if (!product) return next(new ErrorHandler('Product not found', 404))

    totalAmount += product.price * item.quantity
    orderProducts.push({
      product: product._id,
      seller: product.createdBy,
      quantity: item.quantity,
      price: product.price
    })
  }

  const order = await Order.create({
    buyer,
    products: orderProducts,
    totalAmount
  })

  res.status(201).json({ success: true, order })
})

// Get user's orders
exports.getMyOrders = asyncError(async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id }).populate('products.product')
  res.status(200).json({ success: true, orders })
})

// Track single order
exports.trackOrder = asyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('products.product')
    .populate('buyer', 'name email')

  if (!order || order.buyer._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Order not found or unauthorized', 404))
  }

  res.status(200).json({ success: true, order })
})

// Request cancellation
exports.requestCancel = asyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
  if (!order || order.buyer.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Order not found or unauthorized', 404))
  }

  if (order.status === 'Cancelled' || order.cancelRequested)
    return next(new ErrorHandler('Already cancelled or requested', 400))

  order.cancelRequested = true
  await order.save()

  res.status(200).json({ success: true, message: 'Cancellation request sent' })
})

// Seller confirms or rejects cancel
exports.respondCancelRequest = asyncError(async (req, res, next) => {
  const { decision } = req.body
  const order = await Order.findById(req.params.id)

  if (!order) return next(new ErrorHandler('Order not found', 404))
  const isSeller = order.products.some(p => p.seller.toString() === req.user._id.toString())
  if (!isSeller) return next(new ErrorHandler('Unauthorized', 403))

  if (decision === 'approve') {
    order.status = 'Cancelled'
    order.cancelRequested = false
  } else {
    order.cancelRequested = false
  }

  await order.save()
  res.status(200).json({ success: true, message: `Request ${decision}` })
})

// Generate Invoice
exports.generateInvoice = asyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('products.product buyer')

  if (!order) return next(new ErrorHandler('Order not found', 404))
  if (order.buyer._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Unauthorized to access this invoice', 403))
  }

  const filePath = await generateInvoice(order, res)
  res.download(filePath)
})
