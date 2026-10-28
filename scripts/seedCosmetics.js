require('dotenv').config();
const prisma = require('../src/lib/prisma');

const SLOTS = ['HEAD', 'BODY', 'LEGS'];

const assets = [
  { name: 'Modelo HEAD', kind: 'glb', url: 'https://example.com/tamagit/head.glb' },
  { name: 'Modelo BODY', kind: 'glb', url: 'https://example.com/tamagit/body.glb' },
  { name: 'Modelo LEGS', kind: 'glb', url: 'https://example.com/tamagit/legs.glb' },
];

const itemsData = [
  {
    name: 'Gorro rojo',
    description: 'Sombrero pixelado rojo para la cabeza.',
    slot: 'HEAD',
    imageUrl: 'https://example.com/tamagit/gorro-rojo.png',
    price: 0,
  },
  {
    name: 'Gorro azul',
    description: 'Sombrero pixelado azul para la cabeza.',
    slot: 'HEAD',
    imageUrl: 'https://example.com/tamagit/gorro-azul.png',
    price: 0,
  },
  {
    name: 'Camiseta Y2K',
    description: 'Camiseta con estilo Tamagotchi / Y2K.',
    slot: 'BODY',
    imageUrl: 'https://example.com/tamagit/camiseta.png',
    price: 0,
  },
  {
    name: 'Zapatillas glow',
    description: 'Zapatillas brillantes para las patas.',
    slot: 'LEGS',
    imageUrl: 'https://example.com/tamagit/zapatillas.png',
    price: 0,
  },
];

(async () => {
  try {
    const createdAssets = [];
    for (const asset of assets) {
      const existing = await prisma.asset.findFirst({ where: { name: asset.name } });
      createdAssets.push(existing || (await prisma.asset.create({ data: asset })));
    }

    const assetIdBySlot = {};
    createdAssets.forEach((asset, index) => {
      assetIdBySlot[SLOTS[index]] = asset.id;
    });

    const items = [];
    for (const item of itemsData) {
      const existing = await prisma.item.findFirst({ where: { name: item.name } });
      items.push(
        existing ||
          (await prisma.item.create({
            data: {
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl,
              price: item.price,
              slot: item.slot,
              assetId: assetIdBySlot[item.slot],
            },
          })),
      );
    }

    console.log(
      'Assets creados:',
      createdAssets.map((a) => `${a.id}:${a.name}`).join(', '),
    );
    console.log(
      'Items creados:',
      items.map((i) => `${i.id}:${i.name} (${i.slot})`).join(', '),
    );
  } catch (err) {
    console.error('Error en seed de cosméticos:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
