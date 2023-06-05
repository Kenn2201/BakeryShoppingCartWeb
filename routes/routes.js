const { Router } = require('express');
const router = Router();
const authControllers = require('../controllers/authControllers');
const { requireAuth, requireAdminOrSeller } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.route('/sellerui').get(requireAdminOrSeller, authControllers.sellerui_get);

router.route('/login')
  .get(authControllers.login_get)
  .post(authControllers.login_post);

router.route('/signup')
  .get(authControllers.signup_get)
  .post(authControllers.signup_post);

router.route('/logout')
  .get(authControllers.logout_get);

router.route('/cart-count').get(requireAuth, authControllers.cart_items_count_get);

router.route('/userlists')
  .get(requireAdminOrSeller, authControllers.userlists_get);

router.route('/shoppingcart')
  .get(requireAuth, authControllers.shoppingcart_get)
  .post(requireAuth, authControllers.shoppingcart_post);

router.get('/cart-count', requireAuth, authControllers.cart_count_get);

router.route('/selleruiproductlists')
  .get(requireAdminOrSeller, authControllers.sellerproductslists_get);

router.route('/productpage').get(requireAuth, authControllers.productpage_get);

router.route('/product/:productId').get(requireAuth, authControllers.view_product_get);

router.route('/sellerproductadd')
  .get(requireAdminOrSeller, authControllers.sellerproductadd_get)
  .post(requireAdminOrSeller, upload.single('image'), authControllers.selleraddproduct_post);

router.route('/editusers')
  .get(requireAdminOrSeller, authControllers.edituserlists_get)
  .post(authControllers.toggleDeleted);

router.route('/edituserstatus')
  .post(requireAdminOrSeller, authControllers.updateuserstatus_update);

router.route('/deleteusers')
  .post(authControllers.deleteuserlists);

// New routes for editing and deleting a product
router.route('/edit-product/:productId')
  .get(requireAdminOrSeller, authControllers.edit_product_get)
  .post(requireAdminOrSeller, upload.single('image'), authControllers.edit_product_post);

router.route('/delete-product/:productId')
  .post(requireAdminOrSeller, authControllers.delete_product);

router.route('/delete-product-shoppingcart/:productId')
  .post(requireAuth, authControllers.delete_product_cart);



module.exports = router;