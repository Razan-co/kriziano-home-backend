const Mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { config } = require('dotenv')
const { default: mongoose } = require('mongoose')
config()

const productSchema = Mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please provide product name"]
    },
    stock:{
        type:Number,
        default:1
    },
    description:{
        type:String,
        required:[true,"Product description required"]
    }

}, { timeStamps: true })



const ProductModel = mongoose.model('product', productSchema)

module.exports = ProductModel