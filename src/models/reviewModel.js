const mongoose = require('mongoose')
const Product = require('./productModel')

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
})

// Prevent duplicate reviews by same user on same product
reviewSchema.index({ product: 1, user: 1 }, { unique: true })

// Static method to update average rating and count
reviewSchema.statics.updateProductRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numOfReviews: { $sum: 1 }
      }
    }
  ])

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: stats[0].averageRating,
      numOfReviews: stats[0].numOfReviews
    })
  } else {
    await Product.findByIdAndUpdate(productId, {
      averageRating: 0,
      numOfReviews: 0
    })
  }
}

// Run after save
reviewSchema.post('save', async function () {
  await this.constructor.updateProductRating(this.product)
})

// Run after delete
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.updateProductRating(doc.product)
  }
})

const ReviewModel = mongoose.model('Review', reviewSchema)
module.exports = ReviewModel
