const asyncError = require('../middlewares/asyncError')
const User = require('../models/main/userModel')
const ErrorHandler = require('../utils/ErrorHandler')
const Utilities = require('../utils/Utilities')
const util = new Utilities()

//----- Create user (post)  - /auth/create
exports.createUser = asyncError(async (req, res, next) => {
    const { name, userName, email, password, phone } = req.body
    const userExist = await User.findOne({ $or: [{ email }, { phone }] })
    if (userExist)
        return next(new ErrorHandler("User already exists email or phone", 401))
    const user = await User.create({
        name, email,
        userName, password, phone,
        role: req.body.role || 'user'
    })
    if (!user)
        return next(new ErrorHandler("User cretion failed, try again later", 401))
    util.sendToken(res, user)
})


//------Login user (post)  - /auth/login/:method= phone or email
exports.login = asyncError(async (req, res, next) => {
    const { password } = req.body || {}
    const { method } = req.params

    const condition = await util.loginConditions(req, next)

    if (!condition)
        return next(new ErrorHandler("Invalid login method, phone or email is required to Login", 400))

    const user = await User.findOne(condition).select("+password")
    console.log(password)
    if (!user)
        return next(new ErrorHandler(
            method === 'email' ?
                "Invalid Email or Password" :
                'Invalid phone number or password',
            401))

    if (!await user.isValidPassword(password))
        return next(new ErrorHandler(
            method === 'email' ?
                "Invalid Email or Password" :
                "Invalid Phone number or password",
            401))

    util.sendToken(res, user)
})

//------Send OTP  (post)   - /auth/send-otp/:method= phone or email
exports.sendOtp = asyncError(async (req, res, next) => {
    const { email, phone } = req.body
    const { method } = req.params

    const condition = await util.loginConditions(req, next)

    if (!condition)
        return next(new ErrorHandler("Invalid login method, phone or email is required to Login", 400))

    const user = await User.findOne(condition).select("+otp +otpExpire +otpAttempts +otpBlockedUntil")

    if (!user)
        return next(new ErrorHandler(
            method === 'email' ?
                "No user found with the provided Email" :
                "No user found with this provided Phone",
            401
        ))

    util.sendOtp(user, res, next)

})


//-----Verify otp  (post)  -/auth/verify-otp/:method= phone or email
exports.verifyOtp = asyncError(async (req, res, next) => {
    const { email, phone, otp } = req.body
    const { method } = req.params

    const condition = util.loginConditions(req, next)

    if (!condition && !otp)
        return next(new ErrorHandler(
            method === 'email' ?
                "Email and otp both are required" :
                "Phone and otp both are required", 404))

    const user = await User.findOne({ $and: [condition, { otp }] }).select("+otp +otpExpire +otpAttempts +otpBlockedUntil")

    if (!user) return next(new ErrorHandler("User or Otp is invlaid for that you provided"))

    util.verifyOtp(user, otp, next, res)
})


//------change password (patch) -/auth/change-password
exports.changePassword = asyncError(async (req, res, next) => {
    const { user: loggedUser } = req
    const { password, currentPassword } = req.body

    const user = await User.findById(loggedUser._id.toString()).select("+password")
    if (!user) return next(new ErrorHandler("user not found", 404))

    if (!await user.isValidPassword(currentPassword))
        return next(new ErrorHandler("Invalid password !, Try again later.", 401))

    user.password = password
    await user.save()

    res.status(202).json({
        success: true,
        message: "Your password has been changed"
    })
})


//------ forgot paassword (post) -/auth/forgot-password
exports.forgotPassword = asyncError(async (req, res, next) => {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (!user) return next(new ErrorHandler("User not found", 401))

    const { resetPasswordToken, resetPasswordTokenExpire, token } = util.getResetPasswordToken()

    user.resetPasswordToken = resetPasswordToken
    user.resetPasswordTokenExpire = resetPasswordTokenExpire
    await user.save()

    const resetUrl = `http://host/reet-password/${token}`

    const options = {
        email: user.email,
        subject: "Password reset URL",
        message: `Your password reset URL is ${resetUrl}`
    }

    const isSent = await util.sendMail(options)

    if (!isSent) return next(new ErrorHandler("Reset url has failed to send via Email"))
    res.status(201).json({
        success: true,
        message: `Reset sent to your registerd email ${util.maskedMail(user)}`
    })

})



//------Reset Password   (post)  -/auth/reset-password
exports.resetPassword = asyncError(async (req, res, next) => {
    const { newPassword } = req.body
    const resetPasswordToken = util.getResetPasswordToken(req.params.resetToken)

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordTokenExpire: { $gt: Date.now() }
    }).select("+password")
    if (!user) return next(new ErrorHandler("Invlaid token or expired", 400))

    user.password = newPassword
    user.resetPasswordToken = undefined
    user.resetPasswordTokenExpire = undefined
    await user.save()

    util.sendToken(res,user)
})
