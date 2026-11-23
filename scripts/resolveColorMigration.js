const { spawnSync } = require('node:child_process');

const MIGRATION = '20261123000000_pet_colors';

const result = spawnSync('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', MIGRATION], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.log(`No se pudo resolver ${MIGRATION}: ${result.error.message}`);
} else if (result.status !== 0) {
  console.log(`${MIGRATION} no estaba en estado fallido; se continúa.`);
}

process.exit(0);
