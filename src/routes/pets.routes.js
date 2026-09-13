const { Router } = require('express');
const petController = require('../controllers/petController');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.patch('/:id', petController.updatePet);

module.exports = router;