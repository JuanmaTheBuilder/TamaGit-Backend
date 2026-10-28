const { Router } = require('express');
const { login, tokenResponse, returnToApp } = require('../controllers/authController');

const router = Router();

router.get('/github/login', login);
router.get('/github/callback', tokenResponse);
router.get('/github/return', returnToApp);

module.exports = router;