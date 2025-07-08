const Mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { config } = require('dotenv')
const { default: mongoose } = require('mongoose')
config()

const userSchema = Mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please provide your name"]
    },
    userName: {
        type: String,
        required: [true, "Please provide username"]
    },
    phone: {
        type: String,
        required: [true, "Please provide phone number"],
        validate: [(val) => validator.isMobilePhone(val, 'en-IN'), "Enter valid mobile phone number"],
        unique: true
    },
    email: {
        type: String,
        required: [true, "Please provide your email"],
        validate: [validator.isEmail, "Provide a valid Email"],
        unique: true,
        lowerCase: true
    },
    password: {
        type: String,
        required: [true, "Provide your password"],
        select: false
    },
    profileImg: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        required: [true, "Please provide a valid role"],
        default: 'user'
    },
    resetPassswordToken: {
        type: String,
        select: false
    },
    resetPasswordTokenExpire: {
        type: Date,
        select: false
    },
    otp: {
        type: String,
        select: false
    },
    otpExpire: {
        type: Date,
        select: false
    },
    otpAttempts: {
        type: Number,
        select: false,
        default:0
    },
    otpBlockedUntil:{
        type:Date,
        select:false
    }
}, { timeStamps: true })


//------hash password-------\\
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 11)
})


//----Validate pasword-----\\
userSchema.methods.isValidPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}


//----Generate jwt token------\\
userSchema.methods.getJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_TIME })
}


const UserModel = mongoose.model('user', userSchema)

module.exports = UserModel