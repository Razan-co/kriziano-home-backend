const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')
const Authentication = require('../middlewares/isAuthenticate')
const auth = new Authentication()

// Public Routes
router.get('/', productController.getAllProducts)
router.get('/:id', productController.getProduct)

//protected route
router.post('/:productId/review', auth.isAuthenticateUser,productController.addReview)
router.put('/:productId/review', auth.isAuthenticateUser, productController.updateReview)
router.delete('/:productId/review', auth.isAuthenticateUser, productController.deleteReview)

// Apply protection to all routes below this point
router.use(auth.isAuthenticateUser, auth.isAuthorizedUser('admin', 'superadmin', 'seller'))

router.post('/', productController.createProduct)
router.put('/:id', productController.updateProduct)
router.delete('/:id', productController.deleteProduct)

module.exports = router
