const { Router } = require('express');
const router = Router();
const authControllers = require('../controllers/authControllers');
const { requireAuth } = require('../middleware/authMiddleware');

router.route('/login')
  .get(authControllers.login_get)
  .post(authControllers.login_post);

  router.route('/signup')
  .get(authControllers.signup_get)
  .post(authControllers.signup_post);

  router.route('/logout').get(authControllers.logout_get);

router.route('/userlists').get(authControllers.userlists_get);

router.route('/editusers').get(requireAuth, authControllers.edituserlists_get).post(authControllers.toggleDeleted);

router.route('/edituserstatus').post(authControllers.updateuserstatus_update);

router.route('/deleteusers').post(authControllers.deleteuserlists);

module.exports = router;