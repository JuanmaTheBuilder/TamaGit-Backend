// @ts-check
const PUSH_TOKEN_REGEX = /^Expo(nent)?PushToken\[.+\]$/;

/**
 * @param {unknown} token
 * @returns {boolean} true si es null o un ExpoPushToken con formato válido.
 */
function esPushTokenValido(token) {
  return token === null || (typeof token === 'string' && PUSH_TOKEN_REGEX.test(token));
}

/**
 * Oculta el token para poder loguearlo sin exponerlo completo.
 * @param {string | null | undefined} token
 * @returns {string}
 */
function enmascararToken(token) {
  if (!token) return String(token);
  const match = /^(Expo(?:nent)?PushToken)\[(.*)\]$/.exec(token);
  if (!match) return `${token.slice(0, 4)}…`;
  return `${match[1]}[${match[2].slice(0, 4)}…]`;
}

/**
 * Guarda (o borra con null) el pushToken de un usuario. Un teléfono pertenece a
 * una sola persona: si otro usuario tenía ese token, se le quita en la misma
 * transacción antes de asignarlo.
 * @param {any} prisma
 * @param {number} userId
 * @param {string | null} token
 */
async function guardarPushToken(prisma, userId, token) {
  const operaciones = [];
  if (token !== null) {
    operaciones.push(
      prisma.user.updateMany({
        where: { pushToken: token, NOT: { id: userId } },
        data: { pushToken: null },
      })
    );
  }
  operaciones.push(
    prisma.user.update({ where: { id: userId }, data: { pushToken: token } })
  );
  await prisma.$transaction(operaciones);
}

module.exports = { esPushTokenValido, enmascararToken, guardarPushToken, PUSH_TOKEN_REGEX };
