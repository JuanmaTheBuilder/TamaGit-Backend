require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('../src/lib/prisma');

const username = process.argv[2];

(async () => {
  const user = username
    ? await prisma.user.findFirst({ where: { githubUsername: username } })
    : await prisma.user.findFirst();

  if (!user) {
    console.error('No se encontro el usuario' + (username ? ` ${username}` : ''));
    process.exit(1);
  }

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '30d',
  });

  console.log('Usuario:', user.githubUsername, '(id ' + user.id + ')');
  console.log('Token:');
  console.log(token);
  process.exit(0);
})();