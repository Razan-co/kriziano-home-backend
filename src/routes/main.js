const express = require('express')
const router = express.Router()

router.use('/auth',require('./authRoute'))
router.use('/product',require('./productRoutes'))
router.use('/orders',require('./orderRoute'))


module.exports = router
