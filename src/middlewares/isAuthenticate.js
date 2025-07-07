const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const ErrorHandler = require('../utils/ErrorHandler')

class Authentication {
    constructor() { }

    // Middleware: Check if user is authenticated
    async isAuthenticateUser(req, res, next) {
        try {
            const authHeader = req.headers.authorization

            if (!authHeader || !authHeader.startsWith('Bearer '))
                return next(new ErrorHandler('Not authorized, please login first', 401))

            const token = authHeader.split(' ')[1]
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            const user = await User.findById(decoded.id)
            if (!user)
                return next(new ErrorHandler('User not found or account deleted', 401))

            req.user = user
            next()
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return next(new ErrorHandler('Invalid token, please login again', 401))
            } else if (err.name === 'TokenExpiredError') {
                return next(new ErrorHandler('Token expired, please login again', 401))
            } else {
                return next(new ErrorHandler('Authentication failed', 401))
            }
        }
    }

    // Middleware: Check if user has required role(s)
    isAuthorizedUser(...allowedRoles) {
        return (req, res, next) => {
            if (!req.user || !req.user.role)
                return next(new ErrorHandler('Not authenticated or role missing', 401))

            // Allow superadmin by default
            if (req.user.role === 'superadmin') return next()

            if (!allowedRoles.includes(req.user.role))
                return next(new ErrorHandler('Insufficient permissions', 403))

            next()
        }
    }
}

module.exports = Authentication
