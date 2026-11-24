require('dotenv').config();
// Vercel detecta la entrada de Express buscando un archivo que importe `express`:
// este debe ser el único (src/crearApp.js queda fuera de su lista de candidatos).
const express = require('express');
const prisma = require('./lib/prisma');
const { createApp } = require('./crearApp');
const { crearNotificadorExpo } = require('./lib/notificador/expoPush');
const { seedFoodsIfEmpty } = require('./lib/seedFoods');

// Raíz de composición: único lugar donde se instancia el notificador real.
const notificador = crearNotificadorExpo({ prisma });
const app = express();
app.use(createApp({ prisma, notificador }));
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  seedFoodsIfEmpty()
    .then((n) => console.log(`Seed de comidas: ${n} platillos disponibles`))
    .catch((e) => console.warn('No se pudo sembrar comidas:', e.message));
});

module.exports = app;
