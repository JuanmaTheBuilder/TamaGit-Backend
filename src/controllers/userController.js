const prisma = require('../lib/prisma');

const list = async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users.map(safeUser));
};

const me = async (req, res) => {
  res.json(safeUser(req.user));
};

const create = async (req, res) => {
  const { name, email } = req.body;
  const user = await prisma.user.create({ data: { name, email } });
  res.status(201).json(safeUser(user));
};

const update = async (req, res) => {
  const targetId = Number(req.params.id);

  if (targetId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Solo puedes editar tu propio perfil' });
  }

  const { name, email } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: targetId },
      data: {
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
      },
    });
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el usuario', details: err.message });
  }
};

const remove = async (req, res) => {
  const targetId = Number(req.params.id);

  if (targetId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Solo puedes eliminar tu propia cuenta' });
  }

  try {
    await prisma.user.delete({ where: { id: targetId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar el usuario', details: err.message });
  }
};

const setBan = async (req, res) => {
  const targetId = Number(req.params.id);
  const { isBanned, reason } = req.body;

  if (typeof isBanned !== 'boolean') {
    return res.status(400).json({ error: 'Falta el campo isBanned (boolean)' });
  }

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'No puedes banearte a ti mismo' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: targetId },
      data: { isBanned },
    });

    if (isBanned && reason && reason.trim()) {
      const { createNotification } = require('./notificationController');
      await createNotification(targetId, 'banned', `Tu cuenta ha sido suspendida. Motivo: ${reason.trim()}`);
    }

    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el estado del usuario', details: err.message });
  }
};

const listUserPets = async (req, res) => {
  const targetId = Number(req.params.id);

  if (req.user.id !== targetId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'No tienes permiso' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, githubUsername: true, avatarUrl: true, isAdmin: true },
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const projects = await prisma.project.findMany({
      where: { ownerId: targetId },
      include: {
        pet: {
          include: {
            items: { include: { item: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const pets = projects
      .filter((p) => p.pet)
      .map((p) => ({
        pet: {
          ...p.pet,
          projectName: p.name,
          projectFullName: p.fullName,
          itemCount: p.pet.items.length,
        },
      }));

    res.json({ user, pets });
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar las mascotas del usuario', details: err.message });
  }
};

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    githubId: user.githubId,
    githubUsername: user.githubUsername,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
  };
}

module.exports = { list, me, create, update, remove, setBan, listUserPets };