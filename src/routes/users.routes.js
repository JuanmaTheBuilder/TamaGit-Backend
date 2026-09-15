const { Router } = require('express');
const userController = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', userController.list);
router.get('/me', verifyToken, userController.me);
router.post('/', userController.create);
router.patch('/:id', verifyToken, userController.update);
router.delete('/:id', verifyToken, userController.remove);
router.patch('/:id/ban', verifyToken, requireAdmin, userController.setBan);
router.get('/:id/pets', verifyToken, userController.listUserPets);

module.exports = router;