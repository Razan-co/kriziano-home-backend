const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { config } = require('dotenv')
config()

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
    },
    userName: {
      type: String,
      required: [true, "Please provide a username"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Prvie a phone number"],
      unique: [true, "Phone Number has already taken."],
      validate: {
        validator: (val) => validator.isMobilePhone(val, 'en-IN'),
        message: "Enter a valid Indian mobile phone number",
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Provide a valid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    profileImg: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'user'],
      default: 'user',
      required: true,
    },
    otp: {
      type: String,
      select: false,
    },
    shopName: {
      type: String,
    },
    otpExpire: Date,
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpBlockedUntil: Date,

    loginHistory: [
      {
        ip: String,
        device: String,
        loggedInAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resetPasswordToken: String,
    resetPasswordTokenExpire: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)


userSchema.index({ email: 1, role: 1, region: 1 })
userSchema.index({ region: '2dsphere' })

// Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 11)
  next()
})

// Hash OTP before save
userSchema.methods.setHashedOtp = async function (otp) {
  this.otp = await bcrypt.hash(otp, 10)
  this.otpExpire = Date.now() + 10 * 60 * 1000 // valid for 10 mins
  this.otpAttempts = 0
  this.otpBlockedUntil = null
}

// Validate entered OTP
userSchema.methods.isValidOtp = async function (enteredOtp) {
  if (this.otpBlockedUntil && this.otpBlockedUntil > new Date()) {
    throw new Error('Too many failed attempts. Try later.');
  }

  const match = await bcrypt.compare(enteredOtp, this.otp);
  if (!match) {
    this.otpAttempts += 1
    if (this.otpAttempts >= 5) {
      this.otpBlockedUntil = new Date(Date.now() + 20 * 60 * 1000); // block for 20 min
    }
    await this.save()
    return false
  }

  // Reset attempt count on success
  this.otpAttempts = 0
  this.otpBlockedUntil = null
  await this.save()
  return true
}


// Generate JWT
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_TIME,
  })
}

//  Compare password
userSchema.methods.isValidPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

//  Virtual name
userSchema.virtual('fullName').get(function () {
  return this.name
})

module.exports = { userSchema }
const UserModel = mongoose.model('Admin', userSchema);
module.exports = UserModel
























