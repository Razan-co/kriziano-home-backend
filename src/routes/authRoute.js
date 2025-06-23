const express = require('express')
const router = express.Router()
const auth = require('../controllers/authController')
const Authentication = require('../middlewares/isAuthenticate')
const asyncError = require('../middlewares/asyncError')

const authMiddleware = new Authentication()

router.post('/register', auth.register)
router.post('/login', auth.login)
router.put('/update', asyncError(authMiddleware.isAuthenticateUser), auth.updateUser)
router.post('/forgot-password', auth.forgotPassword)
router.post('/reset-password/:token', auth.resetPassword)
router.get('/me', asyncError(authMiddleware.isAuthenticateUser), (req, res) => {
    res.json({ success: true, user: req.user })
})

module.exports = router