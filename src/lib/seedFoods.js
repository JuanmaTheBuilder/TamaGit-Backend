const prisma = require('./prisma');

const TIERS = {
  small: {
    hungerRestore: 15,
    items: [
      { name: 'Semillita', imageUrl: '🍇', description: 'Un bocado mínimo, como un commit pequeño.' },
      { name: 'Cereza', imageUrl: '🍒', description: 'Pequeña pero sabrosa, ideal para empezar.' },
      { name: 'Arándano', imageUrl: '🫐', description: 'Impulso breve: un commit rápido.' },
    ],
  },
  medium: {
    hungerRestore: 30,
    items: [
      { name: 'Empanada', imageUrl: '🥟', description: 'Un commit mediano con buena sustancia.' },
      { name: 'Taco', imageUrl: '🌮', description: 'Sabor completo: un avance sólido.' },
      { name: 'Bowl', imageUrl: '🥗', description: 'Balanceado, justo a la medida.' },
    ],
  },
  large: {
    hungerRestore: 45,
    items: [
      { name: 'Banquete', imageUrl: '🍱', description: 'Un commit grande y hermoso: fiesta total.' },
      { name: 'Pizza completa', imageUrl: '🍕', description: 'El festín de los merges gloriosos.' },
      { name: 'Hamburguesa ', imageUrl: '🍔', description: 'Feast: muchas líneas bien cocinadas.' },
    ],
  },
};

const size = (tier) => tier;

async function seedFoodsIfEmpty() {
  const count = await prisma.food.count();
  if (count > 0) return count;

  const foods = [];
  for (const tier of Object.keys(TIERS)) {
    for (const it of TIERS[tier].items) {
      foods.push(
        await prisma.food.create({
          data: {
            name: it.name,
            description: it.description,
            imageUrl: it.imageUrl,
            size: tier,
            hungerRestore: TIERS[tier].hungerRestore,
            price: TIERS[tier].hungerRestore * 2,
          },
        })
      );
    }
  }
  console.log(`Seed: ${foods.length} comidas de prueba creadas.`);
  return foods.length;
}

module.exports = { seedFoodsIfEmpty, TIERS };