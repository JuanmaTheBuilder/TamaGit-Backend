const prisma = require('../lib/prisma');

const list = async (req, res) => {
  const foods = await prisma.food.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(foods);
};

const getById = async (req, res) => {
  const food = await prisma.food.findUnique({ where: { id: Number(req.params.id) } });
  if (!food) return res.status(404).json({ error: 'Comida no encontrada' });
  res.json(food);
};

const create = async (req, res) => {
  const { name, description, imageUrl, hungerRestore, price } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Falta el nombre de la comida' });
  }

  try {
    const food = await prisma.food.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        hungerRestore: Number.isFinite(Number(hungerRestore)) ? Number(hungerRestore) : 30,
        price: Number.isFinite(Number(price)) ? Number(price) : 0,
      },
    });
    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo crear la comida', details: err.message });
  }
};

const update = async (req, res) => {
  const foodId = Number(req.params.id);
  const { name, description, imageUrl, hungerRestore, price } = req.body;

  try {
    const food = await prisma.food.findUnique({ where: { id: foodId } });
    if (!food) return res.status(404).json({ error: 'Comida no encontrada' });

    const updated = await prisma.food.update({
      where: { id: foodId },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        hungerRestore: hungerRestore !== undefined ? Number(hungerRestore) : undefined,
        price: price !== undefined ? Number(price) : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar la comida', details: err.message });
  }
};

const remove = async (req, res) => {
  const foodId = Number(req.params.id);

  try {
    const food = await prisma.food.findUnique({ where: { id: foodId } });
    if (!food) return res.status(404).json({ error: 'Comida no encontrada' });

    await prisma.food.delete({ where: { id: foodId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar la comida', details: err.message });
  }
};

module.exports = { list, getById, create, update, remove };