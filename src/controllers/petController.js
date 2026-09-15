const prisma = require('../lib/prisma');
const { createNotification } = require('./notificationController');

const getPet = async (req, res) => {
  const petId = Number(req.params.id);

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        project: { select: { id: true, name: true, fullName: true, ownerId: true } },
        items: { include: { item: true } },
      },
    });

    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' });

    const isOwner = pet.project.ownerId === req.user.id;
    const isAdmin = req.user.isAdmin;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta mascota' });
    }

    res.json(pet);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener la mascota', details: err.message });
  }
};

const updatePet = async (req, res) => {
  const petId = Number(req.params.id);

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { project: true },
    });

    if (!pet || pet.project.ownerId !== req.user.id) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    const { name, health, hunger, xp, level, imageUrl } = req.body;

    const updated = await prisma.pet.update({
      where: { id: petId },
      data: {
        name: name !== undefined ? name : undefined,
        health: health !== undefined ? health : undefined,
        hunger: hunger !== undefined ? hunger : undefined,
        xp: xp !== undefined ? xp : undefined,
        level: level !== undefined ? level : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar la mascota', details: err.message });
  }
};

const deletePet = async (req, res) => {
  const petId = Number(req.params.id);

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { project: true },
    });

    if (!pet) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    if (pet.project.ownerId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta mascota' });
    }

    const { reason } = req.body;
    const owner = await prisma.user.findUnique({
      where: { id: pet.project.ownerId },
      select: { id: true },
    });

    if (owner && owner.id !== req.user.id && reason && reason.trim()) {
      await createNotification(
        owner.id,
        'pet_deleted',
        `Tu mascota "${pet.name}" del proyecto "${pet.project.name}" fue eliminada por un administrador. Motivo: ${reason.trim()}`
      );
    }

    await prisma.pet.delete({ where: { id: petId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar la mascota', details: err.message });
  }
};

const addItem = async (req, res) => {
  const petId = Number(req.params.petId);
  const { itemId } = req.body;

  if (!itemId) return res.status(400).json({ error: 'Falta el itemId' });

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { project: true },
    });
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' });

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden añadir items' });
    }

    const item = await prisma.item.findUnique({ where: { id: Number(itemId) } });
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });

    const existing = await prisma.petItem.findUnique({
      where: { petId_itemId: { petId, itemId: Number(itemId) } },
    });

    if (existing) {
      const updated = await prisma.petItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + 1 },
      });
      return res.json(updated);
    }

    const petItem = await prisma.petItem.create({
      data: { petId, itemId: Number(itemId) },
    });
    res.status(201).json(petItem);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo añadir el item', details: err.message });
  }
};

const removeItem = async (req, res) => {
  const petId = Number(req.params.petId);
  const itemId = Number(req.params.itemId);

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { project: true },
    });
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' });

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden quitar items' });
    }

    const petItem = await prisma.petItem.findUnique({
      where: { petId_itemId: { petId, itemId } },
      include: { item: true },
    });
    if (!petItem) return res.status(404).json({ error: 'Item no encontrado en la mascota' });

    const { reason } = req.body;

    const owner = await prisma.user.findUnique({
      where: { id: pet.project.ownerId },
      select: { id: true },
    });

    if (owner && owner.id !== req.user.id && reason && reason.trim()) {
      await createNotification(
        owner.id,
        'item_removed',
        `Se te quitó el item "${petItem.item.name}" de tu mascota "${pet.name}" (proyecto: ${pet.project.name}). Motivo: ${reason.trim()}`
      );
    }

    await prisma.petItem.delete({ where: { id: petItem.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo quitar el item', details: err.message });
  }
};

module.exports = { getPet, updatePet, deletePet, addItem, removeItem };
