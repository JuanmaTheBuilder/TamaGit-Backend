const { Router } = require('express');
const { login, tokenResponse, setPushToken } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/github/login', login);
router.get('/github/callback', tokenResponse);
router.put('/push-token', verifyToken, setPushToken);

module.exports = router;