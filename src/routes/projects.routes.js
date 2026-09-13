const { Router } = require('express');
const projectController = require('../controllers/projectController');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.post('/sync', projectController.sync);
router.get('/', projectController.listProjects);
router.post('/:projectId/pet', projectController.createPet);
router.get('/:projectId/pet', projectController.getPetByProject);

module.exports = router;