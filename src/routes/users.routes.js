const { Router } = require('express');
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', userController.list);
router.get('/me', verifyToken, userController.me);
router.post('/', userController.create);

module.exports = router;