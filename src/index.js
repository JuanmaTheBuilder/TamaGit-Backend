require('dotenv').config();
const prisma = require('./lib/prisma');
const { createApp } = require('./app');
const { crearNotificadorExpo } = require('./lib/notificador/expoPush');
const { seedFoodsIfEmpty } = require('./lib/seedFoods');

// Raíz de composición: único lugar donde se instancia el notificador real.
const notificador = crearNotificadorExpo({ prisma });
const app = createApp({ prisma, notificador });
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  seedFoodsIfEmpty()
    .then((n) => console.log(`Seed de comidas: ${n} platillos disponibles`))
    .catch((e) => console.warn('No se pudo sembrar comidas:', e.message));
});
