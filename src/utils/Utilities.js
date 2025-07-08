const { config } = require("dotenv")
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const sendEmail = require("./sendEmail")
const ErrorHandler = require("../utils/ErrorHandler")
config()

class Utilities {
    constructor() {
        this.options = {
            maxAge: process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict'
        }

        this.getOtp = (length = 6) => {
            if (length === 4) return crypto.randomInt(1000, 9999).toString()
            return crypto.randomInt(100000, 999999).toString()
        }

        this.maskedMail = (user) => {
            let masked = ''
            const [userName, domain] = user.email.split('@')
            masked = userName.slice(0, 3) + "*".repeat(userName.length - 5) + userName.slice(-2) + "@" + domain
            return masked
        }
    }

    async sendToken(res, user) {
        const token = await user.getJwtToken()
        
        const {otpAttempts, password,...rest } = user.toObject()
        res.status(200).json({
            success: true,
            token,
            user: rest
        })
    }

    async sendOtp(user, res, next) {

        if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.otpBlockedUntil - Date.now()) / 6000)
            return next(new ErrorHandler(`Too many failed attempts. Try again in ${minutesLeft} minutes.`, 429))
        }

        const plainOtp = this.getOtp()
        const hashedOtp = await bcrypt.hash(String(plainOtp), 11)
        const otpExpire = new Date(Date.now() + 2 * 60 * 6000)

        user.otp = hashedOtp
        user.otpExpire = otpExpire
        user.otpAttempts = 0
        user.otpBlockedUntil = null

        await user.save()

        const options = {
            email: user.email,
            subject: "your OTP code",
            message: `Your OTP code is ${plainOtp}. It is valid for 2 minutes.`
        }

        const isSent = await this.sendMail(options)

        if (!isSent) return next(new ErrorHandler("OTP has failed to send via Email"))
        res.status(201).json({
            success: true,
            message: `OTP sent to your registerd email ${this.maskedMail(user)}`
        })
    }

    async sendMail(option) {
        const emailStatus = await sendEmail(option)
        return emailStatus.status === "Success"
    }

    async verifyOtp(user, otp, next, res) {
        //checking if the users otp blocked
        if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.otpBlockedUntil - Date.now()) / 6000)
            return next(new ErrorHandler(`Too many failed attempts. Try again in ${minutesLeft} minutes.`, 429))
        }

        if (!user.otp) return next(new ErrorHandler(`OTP not found.`, 400))

        if (!user.otpExpire || user.otpExpire < Date.now())//validating OTP Expire time
            return next(new ErrorHandler("OTP has expired. Please request a new one.", 410))

        const isMatch = await bcrypt.compare(String(otp), user.otp)

        if (!isMatch) {
            user.otpAttempts += 1
            if (user.otpAttempts >= 5)
                user.otpBlockedUntil = new Date(Date.now() + 20 * 60 * 1000)
            await user.save()
            return next(new ErrorHandler("Invlaid otp", 401))
        }

        user.otp = undefined
        user.otpExpire = undefined
        user.otpAttempts = 0
        user.otpBlockedUntil = null
        await user.save()

        this.sendToken(res, user)

    }

    async loginConditions(req, next) {
        if (req.params.method === 'email') {
            if (!req.body.email) return next(new ErrorHandler("Email is required to Login", 400))
            return { email: req.body.email }
        } else if (req.params.method === 'phone') {
            if (!req.body.phone) return next(new ErrorHandler("Phone number is required to Login", 400))
            return { phone: req.body.phone }
        }
    }


    getResetPasswordToken(token = crypto.randomBytes(32).toString('hex')) {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
        const expire = Date.now() + 15 * 60 * 1000
        return { resetPasswordToken: hashedToken, resetPasswordTokenExpire: expire, token }
    }

}

module.exports = Utilities


module.exports = Utilities







// class Utilities {
//     constructor(model) {
//         this.Model = model
//     }

//     async sendToken(res, user, statusCode = 200, message = 'Success') {
//         const token = await user.getJwtToken()
//         const { password, ...rest } = user.toObject()
//         return res.status(statusCode).json({
//             success: true,
//             message,
//             token,
//             user: rest
//         })
//     }

//     async sendOtp(req, res, next) {
//         const { email, phone } = req.body

//         if (email) req.body.phone = undefined
//         if (phone) req.body.email = undefined

//         const condition = {}
//         if (email) condition.email = email
//         else if (phone) condition.phone = phone

//         const user = await this.Model.findOne(condition).select('+otp +otpAttempts +otpBlockedUntil')
//         if (!user) {
//             return next(new ErrorHandler(email
//                 ? "Invalid email address or no user found with this email"
//                 : "Invalid phone number or no user found with this phone", 404))
//         }

//         if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
//             const minutesLeft = Math.ceil((user.otpBlockedUntil - Date.now()) / 60000)
//             return next(new ErrorHandler(`Too many failed attempts. Try again in ${minutesLeft} minutes.`, 429))
//         }

//         const otp = this.getOtp()
//         const hashedOtp = await bcrypt.hash(String(otp), 10)
//         const expiryTime = new Date(Date.now() + 2 * 60 * 1000)

//         user.otp = hashedOtp
//         user.otpExpire = expiryTime
//         user.otpAttempts = 0
//         user.otpBlockedUntil = null

//         await user.save()

//         let masked = ''
//         if (email) {
//             const [userName, domain] = user.email.split('@')
//             masked = userName.slice(0, 3) + "*".repeat(userName.length - 5) + userName.slice(-2) + "@" + domain
//         }

//         const recipient = email || user.email
//         const isSent = await this.sendOtpMail(recipient, otp)

//         if (!isSent) {
//             return next(new ErrorHandler(`Failed to send OTP. Please retry later`, 400))
//         }

//         res.status(200).json({
//             success: true,
//             message: email
//                 ? `OTP sent to your registered email (${masked})`
//                 : "OTP sent to your registered contact"
//         })
//     }

//     getOtp(length = 6) {
//         if (length === 4) return crypto.randomInt(1000, 9999).toString()
//         return crypto.randomInt(100000, 999999).toString()
//     }

//     async sendOtpMail(email, otp, resetUrl) {
//         const message = otp
//             ? `Your OTP code is ${otp}. It is valid for 2 minutes.`
//             : `Reset your password here: ${resetUrl}`
//         const emailStatus = await sendEmail({
//             email,
//             subject: otp ? 'Your OTP Code' : 'Password Reset Link',
//             message
//         })
//         return emailStatus.status === "Success"
//     }

//     // async verifyOtp(req, res, next) {
//     //     const { email, otp } = req.body

//     //     if (!email || !otp)
//     //         return next(new ErrorHandler("Email and OTP are required", 400))

//     //     const user = await this.Model.findOne({ email })
//     //         .select('+otp +otpExpire +otpAttempts +otpBlockedUntil')
//     //     if (!user)
//     //         return next(new ErrorHandler("User not found", 404))

//     //     if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
//     //         const minutesLeft = Math.ceil((user.otpBlockedUntil - Date.now()) / 60000)
//     //         return next(new ErrorHandler(`Too many failed attempts. Try again in ${minutesLeft} minutes.`, 429))
//     //     }

//     //     if (!user.otpExpire || user.otpExpire < Date.now())
//     //         return next(new ErrorHandler("OTP has expired. Please request a new one.", 410))


//     //     const isMatch = await bcrypt.compare(String(otp), user.otp)
//     //     if (!isMatch) {
//     //         user.otpAttempts += 1
//     //         if (user.otpAttempts >= 5)
//     //             user.otpBlockedUntil = new Date(Date.now() + 20 * 60 * 1000)

//     //         await user.save()
//     //         return next(new ErrorHandler("Invalid OTP", 401))
//     //     }

//     //     user.otp = undefined
//     //     user.otpExpire = undefined
//     //     user.otpAttempts = 0
//     //     user.otpBlockedUntil = null
//     //     user.status = true
//     //     await user.save()

//     //     this.sendToken(res, user, 201, "OTP verified successfully")

//     // }
// }