// @ts-check
const { enmascararToken } = require('../pushTokens');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TIMEOUT_MS = 5000;

/**
 * @typedef {{ titulo: string, cuerpo: string, datos: Record<string, string> }} Aviso
 * @typedef {{ avisar: (userId: number, aviso: Aviso) => Promise<void> }} Notificador
 */

/**
 * Adaptador de Notificador que envía avisos por Expo Push.
 * Nunca lanza: cualquier fallo se registra con console.error.
 * @typedef {(url: string, init: any) => Promise<{ ok: boolean, status: number, json: () => Promise<unknown> }>} FetchLike
 * @param {{ prisma: any, fetchImpl?: FetchLike }} deps
 * @returns {Notificador}
 */
function crearNotificadorExpo({ prisma, fetchImpl = globalThis.fetch }) {
  async function avisar(userId, { titulo, cuerpo, datos }) {
    let token = null;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true },
      });
      token = user?.pushToken ?? null;
      if (!token) return;

      /** @type {Record<string, string>} */
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      if (process.env.EXPO_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
      }

      const res = await fetchImpl(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to: token, title: titulo, body: cuerpo, data: datos, sound: 'default' }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      /** @type {any} */
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        console.error(`[push] Expo respondió ${res.status} para ${enmascararToken(token)}: ${(json?.errors ?? []).map((e) => e.code).join(', ')}`);
        return;
      }

      const tickets = Array.isArray(json?.data) ? json.data : [json?.data];
      for (const ticket of tickets) {
        if (ticket?.status !== 'error') continue;
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await prisma.user.updateMany({
            where: { id: userId, pushToken: token },
            data: { pushToken: null },
          });
          console.error(`[push] DeviceNotRegistered: se borró ${enmascararToken(token)} del usuario ${userId}`);
        } else {
          console.error(`[push] Error de Expo para ${enmascararToken(token)}: ${ticket.details?.error ?? 'desconocido'}`);
        }
      }
    } catch (err) {
      console.error(`[push] No se pudo enviar el aviso al usuario ${userId} (${enmascararToken(token)}): ${err?.message ?? err}`);
    }
  }

  return { avisar };
}

module.exports = { crearNotificadorExpo, EXPO_PUSH_URL };
