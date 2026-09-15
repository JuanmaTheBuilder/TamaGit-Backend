const { Router } = require('express');
const foodController = require('../controllers/foodController');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.get('/', foodController.list);
router.get('/:id', foodController.getById);
router.post('/', requireAdmin, foodController.create);
router.patch('/:id', requireAdmin, foodController.update);
router.delete('/:id', requireAdmin, foodController.remove);

module.exports = router;