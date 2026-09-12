const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  res.send('¡Hola desde el backend con Node.js!');
});

module.exports = router;