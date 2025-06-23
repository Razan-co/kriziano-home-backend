const Product = require('../models/productModel')
const Review = require('../models/reviewModel')
const Order = require('../models/orderModel')
const ErrorHandler = require('../utils/ErrorHandler')
const asyncError = require('../middlewares/asyncError')
const ApiFeatures = require('../utils/ApiFeatures')

// Create Product
exports.createProduct = asyncError(async (req, res, next) => {
  const product = await Product.create({ ...req.body, createdBy: req.user.id })
  res.status(201).json({ success: true, product })
})

// Update Product
exports.updateProduct = asyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id)

  if (!product) return next(new ErrorHandler("Product not found", 404))

  if (product.createdBy.toString() !== req.user.id)
    return next(new ErrorHandler("You are not authorized to update this product", 403))

  Object.assign(product, req.body) // Merge updates
  await product.save()

  res.status(200).json({ success: true, product })
})


// Delete Product
exports.deleteProduct = asyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id)

  if (!product) return next(new ErrorHandler("Product not found", 404))

  if (product.createdBy.toString() !== req.user.id)
    return next(new ErrorHandler("You are not authorized to delete this product", 403))
  await product.deleteOne()
  res.status(200).json({ 
    success: true, 
    message: "Product deleted successfully"
   })
})


// Get Single Product
exports.getProduct = asyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
  if (!product) return next(new ErrorHandler("Product not found", 404))
  res.status(200).json({ success: true, product })
})

// Get All Products (with filters, search, rating, pagination)
exports.getAllProducts = asyncError(async (req, res, next) => {
  const resultPerPage = 10
  const totalCount = await Product.countDocuments()

  const features = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter()
    .filterByRating()
    .paginate(resultPerPage)

  const products = await features.query

  if(!products||products.length<1)
    return next(new ErrorHandler("Products not found ,add product to view",400))

  res.status(200).json({
    success: true,
    totalCount,
    count: products.length,
    products
  })
})

// Add Review
exports.addReview = asyncError(async (req, res, next) => {
  const { productId } = req.params
  const { rating, text } = req.body
  const userId = req.user._id

  // Check if user bought the product
  const hasPurchased = await Order.findOne({
    user: userId,
    'products.product': productId
  })

  if (!hasPurchased) {
    return next(new ErrorHandler("You must buy this product before reviewing", 403))
  }

  // Check if already reviewed
  const existingReview = await Review.findOne({ user: userId, product: productId })
  if (existingReview) {
    return next(new ErrorHandler("You have already reviewed this product", 400))
  }

  const review = await Review.create({
    user: userId,
    product: productId,
    rating,
    text
  })

  res.status(201).json({
    success: true,
    message: "Review added successfully",
    review
  })
})

// Update Review
exports.updateReview = asyncError(async (req, res, next) => {
  const { productId } = req.params
  const { rating, text } = req.body
  const userId = req.user._id

  const review = await Review.findOne({ user: userId, product: productId })
  if (!review) {
    return next(new ErrorHandler("Review not found", 404))
  }

  review.rating = rating ?? review.rating
  review.text = text ?? review.text
  await review.save() // triggers post-save hook

  res.status(200).json({
    success: true,
    message: "Review updated successfully",
    review
  })
})

// Delete Review
exports.deleteReview = asyncError(async (req, res, next) => {
  const { productId } = req.params
  const userId = req.user._id

  const review = await Review.findOneAndDelete({ user: userId, product: productId })
  if (!review) {
    return next(new ErrorHandler("Review not found", 404))
  }

  res.status(200).json({
    success: true,
    message: "Review deleted successfully"
  })
})
