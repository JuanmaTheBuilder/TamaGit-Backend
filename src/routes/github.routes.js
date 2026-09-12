const { Router } = require('express');
const githubController = require('../controllers/githubController');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verifyToken);

router.get('/repos', githubController.listRepos);
router.get('/repos/:owner/:repo/commits', githubController.listCommits);

module.exports = router;