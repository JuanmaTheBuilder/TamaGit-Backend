// @ts-check
/**
 * Doble mínimo de PrismaClient con lo que usa el flujo de push.
 * Soporta `where` por igualdad de campos y `NOT: { campo }`.
 */
function coincide(fila, where = {}) {
  return Object.entries(where).every(([k, v]) => {
    if (k === 'NOT') return !coincide(fila, v);
    return fila[k] === v;
  });
}

function crearPrismaEnMemoria({ users = [] } = {}) {
  const db = {
    users: users.map((u) => ({ pushToken: null, isBanned: false, isAdmin: false, ...u })),
    notifications: [],
  };
  let nextNotificationId = 1;

  const prisma = {
    _db: db,
    user: {
      async findUnique({ where }) {
        const u = db.users.find((f) => coincide(f, where));
        return u ? { ...u } : null;
      },
      async update({ where, data }) {
        const u = db.users.find((f) => coincide(f, where));
        if (!u) throw new Error('Registro no encontrado');
        if (data.pushToken != null && db.users.some((o) => o !== u && o.pushToken === data.pushToken)) {
          throw new Error('Unique constraint failed on pushToken');
        }
        Object.assign(u, data);
        return { ...u };
      },
      async updateMany({ where, data }) {
        const filas = db.users.filter((f) => coincide(f, where));
        filas.forEach((f) => Object.assign(f, data));
        return { count: filas.length };
      },
    },
    notification: {
      async create({ data }) {
        const n = { id: nextNotificationId++, createdAt: new Date(), readAt: null, ...data };
        db.notifications.push(n);
        return { ...n };
      },
    },
    async $transaction(operaciones) {
      const resultados = [];
      for (const op of operaciones) resultados.push(await op);
      return resultados;
    },
  };
  return prisma;
}

module.exports = { crearPrismaEnMemoria };
