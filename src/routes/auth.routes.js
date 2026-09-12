const { Router } = require('express');
const { login, tokenResponse } = require('../controllers/authController');

const router = Router();

router.get('/github/login', login);
router.get('/github/callback', tokenResponse);

module.exports = router;