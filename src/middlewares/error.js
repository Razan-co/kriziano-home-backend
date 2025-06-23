const { config } = require("dotenv")
config()

module.exports = (err, req, res, next) => {
    let statusCode = err.statusCode || 500
    let message = err.message

    if (process.env.NODE_ENV !== 'development') {
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(el => el.message)
            return res.status(400).json({
                success: false,
                message: errors[0]
            })
        }
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: err.stack
    })
}