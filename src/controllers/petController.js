const prisma = require('../lib/prisma');

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

    await prisma.pet.delete({ where: { id: petId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar la mascota', details: err.message });
  }
};

module.exports = { updatePet, deletePet };