const { config } = require("dotenv")
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const ErrorHandler = require("./ErrorHandler")
const sendEmail = require("./sendEmail")
config()

class Utilities {
    constructor(model) {
        this.Model = model
    }

    async sendToken(res, user, statusCode = 200, message = 'Success') {
        const token = await user.getJwtToken()
        const { password, ...rest } = user.toObject()
        return res.status(statusCode).json({
            success: true,
            message,
            token,
            user: rest
        })
    }

    async sendOtp(req, res, next) {
        const { email, phone } = req.body

        if (email) req.body.phone = undefined
        if (phone) req.body.email = undefined

        const condition = {}
        if (email) condition.email = email
        else if (phone) condition.phone = phone

        const user = await this.Model.findOne(condition).select('+otp +otpAttempts +otpBlockedUntil')
        if (!user) {
            return next(new ErrorHandler(email
                ? "Invalid email address or no user found with this email"
                : "Invalid phone number or no user found with this phone", 404))
        }

        if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.otpBlockedUntil - Date.now()) / 60000)
            return next(new ErrorHandler(`Too many failed attempts. Try again in ${minutesLeft} minutes.`, 429))
        }

        const otp = this.getOtp()
        const hashedOtp = await bcrypt.hash(String(otp), 10)
        const expiryTime = new Date(Date.now() + 2 * 60 * 1000)

        user.otp = hashedOtp
        user.otpExpire = expiryTime
        user.otpAttempts = 0
        user.otpBlockedUntil = null

        await user.save()

        let masked = ''
        if (email) {
            const [userName, domain] = user.email.split('@')
            masked = userName.slice(0, 3) + "*".repeat(userName.length - 5) + userName.slice(-2) + "@" + domain
        }

        const recipient = email || user.email
        const isSent = await this.sendOtpMail(recipient, otp)

        if (!isSent) {
            return next(new ErrorHandler(`Failed to send OTP. Please retry later`, 400))
        }

        res.status(200).json({
            success: true,
            message: email
                ? `OTP sent to your registered email (${masked})`
                : "OTP sent to your registered contact"
        })
    }

    getOtp(length = 6) {
        if (length === 4) return crypto.randomInt(1000, 9999).toString()
        return crypto.randomInt(100000, 999999).toString()
    }

    async sendOtpMail(email, otp, resetUrl) {
        const message = otp
            ? `Your OTP code is ${otp}. It is valid for 2 minutes.`
            : `Reset your password here: ${resetUrl}`
        const emailStatus = await sendEmail({
            email,
            subject: otp ? 'Your OTP Code' : 'Password Reset Link',
            message
        })
        return emailStatus.status === "Success"
    }

    // async verifyOtp(req, res, next) {
    //     const { email, otp } = req.body

    //     if (!email || !otp)
    //         return next(new ErrorHandler("Email and OTP are required", 400))

    //     const user = await this.Model.findOne({ email })
    //         .select('+otp +otpExpire +otpAttempts +otpBlockedUntil')
    //     if (!user)
    //         return next(new ErrorHandler("User not found", 404))

    //     if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
    //         const minutesLeft = Math.ceil((user.otpBlockedUntil - Date.now()) / 60000)
    //         return next(new ErrorHandler(`Too many failed attempts. Try again in ${minutesLeft} minutes.`, 429))
    //     }

    //     if (!user.otpExpire || user.otpExpire < Date.now())
    //         return next(new ErrorHandler("OTP has expired. Please request a new one.", 410))


    //     const isMatch = await bcrypt.compare(String(otp), user.otp)
    //     if (!isMatch) {
    //         user.otpAttempts += 1
    //         if (user.otpAttempts >= 5)
    //             user.otpBlockedUntil = new Date(Date.now() + 20 * 60 * 1000)

    //         await user.save()
    //         return next(new ErrorHandler("Invalid OTP", 401))
    //     }

    //     user.otp = undefined
    //     user.otpExpire = undefined
    //     user.otpAttempts = 0
    //     user.otpBlockedUntil = null
    //     user.status = true
    //     await user.save()

    //     this.sendToken(res, user, 201, "OTP verified successfully")

    // }
}

module.exports = Utilities
