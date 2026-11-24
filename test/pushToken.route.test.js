// @ts-check
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { NotificadorEnMemoria } = require('./dobles/notificadorEnMemoria');
const { crearPrismaEnMemoria } = require('./dobles/prismaEnMemoria');

process.env.JWT_SECRET = 'secreto-de-pruebas';

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaa]';
const TOKEN_B = 'ExpoPushToken[bbbbbbbbbbbb]';

let prisma;
let server;
let baseUrl;

before(async () => {
  prisma = crearPrismaEnMemoria({ users: [{ id: 1 }, { id: 2 }] });
  const app = createApp({ prisma, notificador: new NotificadorEnMemoria() });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const jwtDe = (userId) => jwt.sign({ sub: userId }, process.env.JWT_SECRET);
const usuario = (id) => prisma._db.users.find((u) => u.id === id);

async function put(userId, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId != null) headers.Authorization = `Bearer ${jwtDe(userId)}`;
  const res = await fetch(`${baseUrl}/auth/push-token`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  /** @type {any} */
  const json = await res.json();
  return { status: res.status, json };
}

test('sin JWT responde 401', async () => {
  const { status } = await put(null, { token: TOKEN_A });
  assert.equal(status, 401);
});

test('formatos inválidos responden 400 con { error }', async () => {
  for (const body of [{ token: 'abc' }, { token: 'ExponentPushToken[]' }, { token: 123 }, {}]) {
    const { status, json } = await put(1, body);
    assert.equal(status, 400, JSON.stringify(body));
    assert.equal(typeof json.error, 'string');
  }
  assert.equal(usuario(1).pushToken, null);
});

test('guarda el token y responde 200 { ok: true }', async () => {
  const { status, json } = await put(1, { token: TOKEN_A });
  assert.equal(status, 200);
  assert.deepEqual(json, { ok: true });
  assert.equal(usuario(1).pushToken, TOKEN_A);
});

test('acepta null para borrar el token', async () => {
  await put(1, { token: TOKEN_A });
  const { status, json } = await put(1, { token: null });
  assert.equal(status, 200);
  assert.deepEqual(json, { ok: true });
  assert.equal(usuario(1).pushToken, null);
});

test('usa el id del JWT e ignora userId del body', async () => {
  const { status } = await put(2, { token: TOKEN_B, userId: 1 });
  assert.equal(status, 200);
  assert.equal(usuario(2).pushToken, TOKEN_B);
  assert.notEqual(usuario(1).pushToken, TOKEN_B);
});

test('un mismo token pasa de un usuario a otro al reasignarse', async () => {
  await put(1, { token: TOKEN_A });
  assert.equal(usuario(1).pushToken, TOKEN_A);

  const { status } = await put(2, { token: TOKEN_A });
  assert.equal(status, 200);
  assert.equal(usuario(2).pushToken, TOKEN_A);
  assert.equal(usuario(1).pushToken, null);
});
