require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/', require('./routes/index.routes'));
app.use('/auth', require('./routes/auth.routes'));
app.use('/github', require('./routes/github.routes'));
app.use('/projects', require('./routes/projects.routes'));
app.use('/pets', require('./routes/pets.routes'));
app.use('/users', require('./routes/users.routes'));
app.use('/items', require('./routes/items.routes'));
app.use('/foods', require('./routes/foods.routes'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});