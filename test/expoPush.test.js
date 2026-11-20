// @ts-check
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { crearNotificadorExpo, EXPO_PUSH_URL } = require('../src/lib/notificador/expoPush');
const { crearPrismaEnMemoria } = require('./dobles/prismaEnMemoria');

const TOKEN = 'ExponentPushToken[secreto-muy-largo-123]';
const AVISO = { titulo: 'Hola', cuerpo: 'Cuerpo', datos: { notificationId: '1', type: 'banned' } };

let logs;
let errorOriginal;
let expoTokenOriginal;

beforeEach(() => {
  logs = [];
  errorOriginal = console.error;
  console.error = (...args) => logs.push(args.map(String).join(' '));
  expoTokenOriginal = process.env.EXPO_ACCESS_TOKEN;
  delete process.env.EXPO_ACCESS_TOKEN;
});

afterEach(() => {
  console.error = errorOriginal;
  if (expoTokenOriginal === undefined) delete process.env.EXPO_ACCESS_TOKEN;
  else process.env.EXPO_ACCESS_TOKEN = expoTokenOriginal;
});

function fetchFalso(respuesta, { ok = true, status = 200 } = {}) {
  const llamadas = [];
  const fn = async (url, init) => {
    llamadas.push({ url, init });
    return { ok, status, json: async () => respuesta };
  };
  return { fn, llamadas };
}

test('envía el mensaje correcto a Expo sin Authorization si no hay EXPO_ACCESS_TOKEN', async () => {
  const prisma = crearPrismaEnMemoria({ users: [{ id: 1, pushToken: TOKEN }] });
  const { fn, llamadas } = fetchFalso({ data: { status: 'ok', id: 'x' } });

  await crearNotificadorExpo({ prisma, fetchImpl: fn }).avisar(1, AVISO);

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].url, EXPO_PUSH_URL);
  assert.equal(llamadas[0].init.method, 'POST');
  assert.ok(!('Authorization' in llamadas[0].init.headers));
  assert.deepEqual(JSON.parse(llamadas[0].init.body), {
    to: TOKEN,
    title: 'Hola',
    body: 'Cuerpo',
    data: AVISO.datos,
    sound: 'default',
  });
  assert.equal(prisma._db.users[0].pushToken, TOKEN);
});

test('incluye Authorization cuando EXPO_ACCESS_TOKEN existe', async () => {
  process.env.EXPO_ACCESS_TOKEN = 'expo-secret';
  const prisma = crearPrismaEnMemoria({ users: [{ id: 1, pushToken: TOKEN }] });
  const { fn, llamadas } = fetchFalso({ data: { status: 'ok' } });

  await crearNotificadorExpo({ prisma, fetchImpl: fn }).avisar(1, AVISO);

  assert.equal(llamadas[0].init.headers.Authorization, 'Bearer expo-secret');
});

test('un usuario sin pushToken no llama a fetch', async () => {
  const prisma = crearPrismaEnMemoria({ users: [{ id: 1 }] });
  const { fn, llamadas } = fetchFalso({});

  await crearNotificadorExpo({ prisma, fetchImpl: fn }).avisar(1, AVISO);

  assert.equal(llamadas.length, 0);
});

test('DeviceNotRegistered borra el pushToken del usuario', async () => {
  const prisma = crearPrismaEnMemoria({ users: [{ id: 1, pushToken: TOKEN }] });
  const { fn } = fetchFalso({
    data: {
      status: 'error',
      message: `"${TOKEN}" is not a registered push notification recipient`,
      details: { error: 'DeviceNotRegistered' },
    },
  });

  await crearNotificadorExpo({ prisma, fetchImpl: fn }).avisar(1, AVISO);

  assert.equal(prisma._db.users[0].pushToken, null);
  assert.ok(logs.every((l) => !l.includes(TOKEN)), 'el token completo no debe aparecer en logs');
});

test('si fetch lanza, avisar no lanza y no loguea el token completo', async () => {
  const prisma = crearPrismaEnMemoria({ users: [{ id: 1, pushToken: TOKEN }] });
  const fn = async () => { throw new Error('red caída'); };

  await assert.doesNotReject(crearNotificadorExpo({ prisma, fetchImpl: fn }).avisar(1, AVISO));

  assert.equal(logs.length, 1);
  assert.ok(!logs[0].includes(TOKEN));
  assert.equal(prisma._db.users[0].pushToken, TOKEN);
});

test('una respuesta HTTP no exitosa se registra sin lanzar', async () => {
  const prisma = crearPrismaEnMemoria({ users: [{ id: 1, pushToken: TOKEN }] });
  const { fn } = fetchFalso({ errors: [{ code: 'TOO_MANY_REQUESTS' }] }, { ok: false, status: 429 });

  await crearNotificadorExpo({ prisma, fetchImpl: fn }).avisar(1, AVISO);

  assert.equal(logs.length, 1);
  assert.ok(logs[0].includes('429'));
  assert.ok(!logs[0].includes(TOKEN));
});
