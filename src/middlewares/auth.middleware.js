const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const authToken = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!authToken) {
    return res.status(401).json({ error: 'No autorizado: falta el token' });
  }

  try {
    const payload = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      return res.status(401).json({ error: 'No autorizado: usuario inexistente' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
  }
};

module.exports = { verifyToken };