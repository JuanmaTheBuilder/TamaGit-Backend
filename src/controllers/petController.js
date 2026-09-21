const prisma = require('../lib/prisma');
const { createNotification } = require('./notificationController');
const { memberOf, isPetHiddenBy } = require('../lib/membership');
const { withLiveStats } = require('../lib/petStats');
const { tierFromScore, healFromTier } = require('../lib/commitAnalysis');

async function canAccess(pet, user, { allowHidden = false } = {}) {
  if (user.isAdmin) return true;
  if (pet.project.ownerId === user.id) return true;
  const member = await memberOf(pet.project.id, user.id);
  if (!member) return false;
  if (!allowHidden) {
    const hidden = await isPetHiddenBy(pet.id, user.id);
    if (hidden) return false;
  }
  return true;
}

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

    if (!(await canAccess(pet, req.user))) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    res.json(withLiveStats(pet));
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

    if (!pet || !(await canAccess(pet, req.user))) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    const { name, health, hunger, happiness, imageUrl } = req.body;

    const updated = await prisma.pet.update({
      where: { id: petId },
      data: {
        name: name !== undefined ? name : undefined,
        health: health !== undefined ? health : undefined,
        hunger: hunger !== undefined ? hunger : undefined,
        happiness: happiness !== undefined ? happiness : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
      },
    });

    res.json(withLiveStats(updated));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar la mascota', details: err.message });
  }
};

const feedPet = async (req, res) => {
  const petId = Number(req.params.id);
  const commitId = Number(req.body?.commitId);

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { project: true },
    });

    if (!pet || !(await canAccess(pet, req.user))) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    if (!commitId) {
      return res.status(400).json({ error: 'Se requiere el platillo (commitId) con el que alimentar' });
    }

    const analysis = await prisma.commitAnalysis.findUnique({
      where: { id: commitId },
    });

    if (!analysis || analysis.projectId !== pet.projectId) {
      return res.status(404).json({ error: 'Platillo no encontrado para esta mascota' });
    }
    if (analysis.fedAt) {
      return res.status(400).json({ error: 'Este platillo ya fue comido' });
    }

    const tier = tierFromScore(analysis.score);
    const heal = healFromTier(tier);

    const current = withLiveStats(pet);
    const restoredHunger = Math.min(100, current.hunger + heal.hungerRestore);
    const restoredHealth = Math.min(100, current.health + heal.health);

    const data = {
      happiness: Math.max(0, Math.min(100, current.happiness)),
      hunger: restoredHunger,
      health: restoredHealth,
    };

    await prisma.$transaction([
      prisma.pet.update({ where: { id: petId }, data }),
      prisma.commitAnalysis.update({
        where: { id: commitId },
        data: { fedAt: new Date() },
      }),
    ]);

    const updated = await prisma.pet.findUnique({ where: { id: petId } });

    res.json({
      pet: withLiveStats(updated),
      dish: { commitId, tier, healed: heal },
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo alimentar a la mascota', details: err.message });
  }
};

const hidePet = async (req, res) => {
  const petId = Number(req.params.id);

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { project: true },
    });
    if (!pet || !(await canAccess(pet, req.user))) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    await prisma.petHidden.upsert({
      where: { petId_userId: { petId, userId: req.user.id } },
      update: {},
      create: { petId, userId: req.user.id },
    });

    res.json({ ok: true, hidden: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo ocultar la mascota', details: err.message });
  }
};

const unhidePet = async (req, res) => {
  const petId = Number(req.params.id);

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { project: true },
    });
    if (!pet || !(await canAccess(pet, req.user))) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    await prisma.petHidden.deleteMany({
      where: { petId, userId: req.user.id },
    });

    res.json({ ok: true, hidden: false });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo mostrar la mascota', details: err.message });
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

    const isOwner = pet.project.ownerId === req.user.id;
    const isAdmin = req.user.isAdmin;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Solo el dueño del repositorio puede eliminar la mascota de forma definitiva. Usa ocultar si no quieres verla.' });
    }

    const reason = req.body?.reason;
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
  const itemId = req.body?.itemId;

  if (!itemId) return res.status(400).json({ error: 'Falta el itemId' });

  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { project: true },
    });
    if (!pet || !(await canAccess(pet, req.user))) return res.status(404).json({ error: 'Mascota no encontrada' });

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
    if (!pet || !(await canAccess(pet, req.user))) return res.status(404).json({ error: 'Mascota no encontrada' });

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden quitar items' });
    }

    const petItem = await prisma.petItem.findUnique({
      where: { petId_itemId: { petId, itemId } },
      include: { item: true },
    });
    if (!petItem) return res.status(404).json({ error: 'Item no encontrado en la mascota' });

    const reason = req.body?.reason;

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

module.exports = { getPet, updatePet, feedPet, hidePet, unhidePet, deletePet, addItem, removeItem };