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

    if (user.isBanned) {
      return res.status(403).json({ error: 'Tu cuenta está suspendida' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Acceso restringido: se requieren permisos de administrador' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin };