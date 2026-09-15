const { Router } = require('express');
const itemController = require('../controllers/itemController');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.get('/', itemController.list);
router.get('/:id', itemController.getById);
router.post('/', requireAdmin, itemController.create);
router.patch('/:id', requireAdmin, itemController.update);
router.delete('/:id', requireAdmin, itemController.remove);

module.exports = router;