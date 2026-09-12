const prisma = require('../lib/prisma');

const list = async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
};

const create = async (req, res) => {
  const { name, email } = req.body;
  const user = await prisma.user.create({ data: { name, email } });
  res.status(201).json(user);
};

module.exports = { list, create };