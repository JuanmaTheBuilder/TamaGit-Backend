const prisma = require('../lib/prisma');

const VALID_SLOTS = ['HEAD', 'BODY', 'LEGS'];

const validateItemSlotAndAsset = async (slot, assetId) => {
  if (slot !== undefined && slot !== null && !VALID_SLOTS.includes(slot)) {
    return { error: 'Slot inválido. Debe ser HEAD, BODY o LEGS' };
  }
  if (assetId !== undefined && assetId !== null) {
    const asset = await prisma.asset.findUnique({ where: { id: Number(assetId) } });
    if (!asset) return { error: 'Asset no encontrado' };
  }
  return null;
};

const list = async (req, res) => {
  const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(items);
};

const getById = async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).json({ error: 'Item no encontrado' });
  res.json(item);
};

const create = async (req, res) => {
  const { name, description, imageUrl, price, category, slot, assetId } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Falta el nombre del item' });
  }

  const validation = await validateItemSlotAndAsset(slot, assetId);
  if (validation) return res.status(400).json(validation);

  try {
    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        price: Number.isFinite(Number(price)) ? Number(price) : 0,
        category: category ?? null,
        slot: slot ?? null,
        assetId: assetId !== undefined && assetId !== null ? Number(assetId) : null,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo crear el item', details: err.message });
  }
};

const update = async (req, res) => {
  const itemId = Number(req.params.id);
  const { name, description, imageUrl, price, category, slot, assetId } = req.body;

  try {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });

    const validation = await validateItemSlotAndAsset(slot, assetId);
    if (validation) return res.status(400).json(validation);

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        price: price !== undefined ? Number(price) : undefined,
        category: category !== undefined ? category : undefined,
        slot: slot !== undefined ? slot : undefined,
        assetId: assetId !== undefined ? (assetId === null ? null : Number(assetId)) : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el item', details: err.message });
  }
};

const remove = async (req, res) => {
  const itemId = Number(req.params.id);

  try {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });

    await prisma.item.delete({ where: { id: itemId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar el item', details: err.message });
  }
};

module.exports = { list, getById, create, update, remove };