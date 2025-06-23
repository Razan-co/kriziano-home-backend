const asyncError = require('../middlewares/asyncError')
const User = require('../models/userModel')
const ErrorHandler = require('../utils/ErrorHandler')
const Utilities = require('../utils/Utilities')
const crypto = require('crypto')

const util = new Utilities(User)

exports.register = asyncError(async (req, res, next) => {
    const { name, userName, email, password, phone, region, role } = req.body
    if (await User.findOne({ email }))
        return next(new ErrorHandler("Email is already registered", 400))
    if (await User.findOne({ userName }))
        return next(new ErrorHandler("Username is already taken", 400))
    const user = await User.create({
        name, email, userName, password, phone,
        role: role || 'user',
        region: region ?? ''
    })
    if (!user)
        return next(new ErrorHandler("User creation failed, try again later", 500))
    util.sendToken(res, user, 201, `${user.role} registered successfully`)
})


exports.login = asyncError(async (req, res, next) => {
    const { email, password } = req.body
    if (!email || !password)
        return next(new ErrorHandler("Email and password are required", 400))

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.isValidPassword(password)))
        return next(new ErrorHandler("Invalid Email or Password", 401))

    user.loginHistory.push({ ip: req.ip, device: req.headers['user-agent'] })
    await user.save()

    util.sendCookies(res, user, 200, "Login successful")
})


exports.updateUser = asyncError(async (req, res, next) => {
    const updates = req.body
    const userId = req.user.id
    const disallowedFields = ['email', 'phone', 'password']
    disallowedFields.forEach(f => delete updates[f])

    if (updates.userName) {
        const existing = await User.findOne({ userName: updates.userName, _id: { $ne: userId } })
        if (existing) return next(new ErrorHandler("Username is already taken", 400))
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true })
    if (!user) return next(new ErrorHandler("User not found", 404))

    res.status(200).json({ success: true, message: "User updated successfully", user })
})


exports.forgotPassword = asyncError(async (req, res, next) => {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) return next(new ErrorHandler("User not found", 404))

    const resetToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    user.resetPasswordToken = hashedToken
    user.resetPasswordTokenExpire = Date.now() + 15 * 60 * 1000
    await user.save()

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
    const isSent = await util.sendOtpMail(email, null, resetUrl)
    if (!isSent) return next(new ErrorHandler("Failed to send reset link", 500))

    res.status(200).json({
        success: true,
        message: `Password reset link sent to ${email}`
    })
})


exports.resetPassword = asyncError(async (req, res, next) => {
    const { token } = req.params
    const { password } = req.body
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpire: { $gt: Date.now() }
    }).select('+password')

    if (!user)
        return next(new ErrorHandler("Reset token is invalid or expired", 400))

    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordTokenExpire = undefined
    await user.save()

    util.sendCookies(res, user, 200, "Password reset successful")
})
