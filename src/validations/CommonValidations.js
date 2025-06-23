const { body, validationResult } = require('express-validator')
const ErrorHandler = require('../utils/ErrorHandler.js')

class Validation {

    regVal = [
        body("name")
            .notEmpty()
            .withMessage("Name is required")
            .isLength({ min: 3 })
            .withMessage("Name should be at least 3 characters long"),

        body("userName")
            .notEmpty()
            .withMessage("Username is required")
            .isLength({ min: 3 })
            .withMessage("Username should be at least 3 characters long"),

        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Provide a valid email"),

        body("password")
            .notEmpty()
            .withMessage("Password is required")
            .isLength({ min: 6 })
            .withMessage("Password should be at least 6 characters long"),

        body("phone")
            .notEmpty()
            .withMessage("Phone number is required")
            .isNumeric()
            .withMessage("Phone number should be numeric")
            .isLength({ min: 10, max: 15 })
            .withMessage("Phone number should be between 10 and 15 digits long"),

        (req, res, next) => {
            const error = validationResult(req)
            if (!error.isEmpty()) {
                const [err] = error.array()
                return next(new ErrorHandler(err.msg, 401))
            }
            next()
        }
    ]
}

module.exports = Validation