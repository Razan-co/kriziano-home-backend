const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const Authentication = require('../middlewares/isAuthenticate')
const auth = new Authentication()

router.use(auth.isAuthenticateUser)

// user routes
router.post('/', orderController.createOrder)
router.get('/get-my-orders', orderController.getMyOrders)
router.put('/cancel-request/:orderId', orderController.cancelOrderRequest)
router.get('/track/:orderId', orderController.trackOrder) 

//seler admin routes
router.use(auth.isAuthorizedUser('admin,seller,superadmin'))
router.get('/get-seller-orders', orderController.getSellerOrders)
router.put('/update/:orderId', orderController.updateOrderStatus)
router.put('/seller/cancel/:orderId', orderController.respondToCancelRequest)

module.exports = router
