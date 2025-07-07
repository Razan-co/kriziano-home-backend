const mongoose = require('mongoose')
const slugify = require('slugify')

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter product name'],
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Please enter product description'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Please enter product price'],
    min: [0, 'Price must be at least 0']
  },
  category: {
    type: String,
    required: [true, 'Please enter product category'],
    trim: true
  },
  stock: {
    type: Number,
    required: [true, 'Please enter stock'],
    default: 1,
    min: [0, 'Stock must be 0 or more']
  },
  images: [
    {
      url: {
        type: String,
        required: [true, 'Image URL is required']
      }
    }
  ],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numOfReviews: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // or 'admin'
    required: [true, 'Product must have a creator']
  }
}, {
  timestamps: true
})

productSchema.pre('save', function (next) {
  if (!this.isModified('name')) return next()
  this.slug = slugify(this.name, { lower: true, strict: true })
  next()
})

const ProductModel = mongoose.model('Product', productSchema)
module.exports = ProductModel
