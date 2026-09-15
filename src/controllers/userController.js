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
  const { isBanned } = req.body;

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
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el estado del usuario', details: err.message });
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

module.exports = { list, me, create, update, remove, setBan };