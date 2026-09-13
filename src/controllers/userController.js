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

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    githubId: user.githubId,
    githubUsername: user.githubUsername,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

module.exports = { list, me, create };