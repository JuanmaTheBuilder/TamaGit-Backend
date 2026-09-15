const prisma = require('../lib/prisma');

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

const createNotification = async (userId, type, message) => {
  try {
    await prisma.notification.create({ data: { userId, type, message } });
  } catch {
    // silently fail – notifications are non-critical
  }
};

module.exports = { list, markRead, createNotification };
