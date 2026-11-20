// @ts-check
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createNotification } = require('../src/controllers/notificationController');
const { NotificadorEnMemoria } = require('./dobles/notificadorEnMemoria');
const { crearPrismaEnMemoria } = require('./dobles/prismaEnMemoria');

test('al crear una Notification se avisa al usuario correcto con projectId', async () => {
  const prisma = crearPrismaEnMemoria({ users: [{ id: 1 }, { id: 2 }] });
  const notificador = new NotificadorEnMemoria();

  await createNotification(
    { prisma, notificador },
    { userId: 2, type: 'pet_deleted', message: 'Tu mascota fue eliminada', projectId: 7 }
  );

  assert.equal(prisma._db.notifications.length, 1);
  const creada = prisma._db.notifications[0];
  assert.deepEqual(notificador.enviados, [
    {
      userId: 2,
      titulo: 'Tu mascota fue eliminada',
      cuerpo: 'Tu mascota fue eliminada',
      datos: { notificationId: String(creada.id), type: 'pet_deleted', projectId: '7' },
    },
  ]);
});

test('sin projectId no se incluye en datos y el título usa el type', async () => {
  const prisma = crearPrismaEnMemoria({ users: [{ id: 3 }] });
  const notificador = new NotificadorEnMemoria();

  await createNotification({ prisma, notificador }, { userId: 3, type: 'banned', message: 'Suspendida' });

  assert.equal(notificador.enviados.length, 1);
  assert.equal(notificador.enviados[0].titulo, 'Cuenta suspendida');
  assert.equal(notificador.enviados[0].cuerpo, 'Suspendida');
  assert.ok(!('projectId' in notificador.enviados[0].datos));
});

test('si el notificador falla, createNotification no lanza y la Notification queda creada', async () => {
  const prisma = crearPrismaEnMemoria({ users: [{ id: 1 }] });
  const notificador = { avisar: async () => { throw new Error('boom'); } };
  const errorOriginal = console.error;
  console.error = () => {};
  try {
    await createNotification({ prisma, notificador }, { userId: 1, type: 'x', message: 'm' });
  } finally {
    console.error = errorOriginal;
  }
  assert.equal(prisma._db.notifications.length, 1);
});
