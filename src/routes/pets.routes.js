const { Router } = require('express');
const petController = require('../controllers/petController');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.get('/:id', petController.getPet);
router.patch('/:id', petController.updatePet);
router.delete('/:id', petController.deletePet);
router.post('/:petId/items', petController.addItem);
router.delete('/:petId/items/:itemId', petController.removeItem);

module.exports = router;