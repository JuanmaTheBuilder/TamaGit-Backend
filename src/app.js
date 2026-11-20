// @ts-check
const express = require('express');

/**
 * Construye la app de Express con sus dependencias inyectadas.
 * Los controladores las leen desde `req.app.locals`.
 * @param {{ prisma: any, notificador: import('./lib/notificador/expoPush').Notificador }} deps
 */
function createApp({ prisma, notificador }) {
  const app = express();
  app.locals.prisma = prisma;
  app.locals.notificador = notificador;

  app.use(express.json());
  app.use('/', require('./routes/index.routes'));
  app.use('/auth', require('./routes/auth.routes'));
  app.use('/github', require('./routes/github.routes'));
  app.use('/projects', require('./routes/projects.routes'));
  app.use('/pets', require('./routes/pets.routes'));
  app.use('/users', require('./routes/users.routes'));
  app.use('/items', require('./routes/items.routes'));
  app.use('/foods', require('./routes/foods.routes'));
  app.use('/notifications', require('./routes/notifications.routes'));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { createApp };
