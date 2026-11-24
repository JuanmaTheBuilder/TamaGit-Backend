// @ts-check
const prisma = require('../lib/prisma');
const { tituloPara } = require('../lib/notificador/titulos');

const list = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, readAt: null },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar las notificaciones', details: err.message });
  }
};

const markRead = async (req, res) => {
  const id = Number(req.params.id);

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo marcar la notificación', details: err.message });
  }
};

/**
 * Crea una Notification y, a continuación, envía el aviso push.
 * Se hace `await` al envío para que termine antes de responder (Vercel/serverless).
 * Nunca lanza: las notificaciones no son críticas.
 * @param {{ prisma?: any, notificador?: import('../lib/notificador/expoPush').Notificador }} deps
 * @param {{ userId: number, type: string, message: string, projectId?: number | null }} datos
 */
const createNotification = async (deps, { userId, type, message, projectId = null }) => {
  const db = deps?.prisma ?? prisma;
  let notification;
  try {
    notification = await db.notification.create({ data: { userId, type, message } });
  } catch {
    // silently fail – notifications are non-critical
    return;
  }

  if (!deps?.notificador) return;
  /** @type {Record<string, string>} */
  const datos = { notificationId: String(notification.id), type };
  if (projectId != null) datos.projectId = String(projectId);

  try {
    await deps.notificador.avisar(userId, { titulo: tituloPara(type), cuerpo: message, datos });
  } catch (err) {
    console.error('[push] El notificador falló:', err?.message ?? err);
  }
  return notification;
};

module.exports = { list, markRead, createNotification };
