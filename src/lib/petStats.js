const HUNGER_PER_HOUR = 2;
const HAPPINESS_DECAY_PER_HOUR = 1.5;
const HEALTH_HEAL_PER_HOUR = 0.4;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function elapsedHours(since) {
  const base = since instanceof Date ? since.getTime() : since;
  return Math.max(0, (Date.now() - base) / 3600000);
}

function toInt(value) {
  return Math.max(0, Math.round(value));
}

function liveStats(pet, now = new Date()) {
  const updated = pet.updatedAt ? new Date(pet.updatedAt) : pet.createdAt ? new Date(pet.createdAt) : now;
  const hours = elapsedHours(updated);
  return {
    hunger: clamp(toInt((pet.hunger ?? 100) - HUNGER_PER_HOUR * hours), 0, 100),
    happiness: toInt((pet.happiness ?? 100) - HAPPINESS_DECAY_PER_HOUR * hours),
    health: clamp(toInt((pet.health ?? 100) + HEALTH_HEAL_PER_HOUR * hours), 0, 100),
  };
}

function withLiveStats(pet, now = new Date()) {
  const stats = liveStats(pet, now);
  return { ...pet, ...stats };
}

function feedChanges(pet, now = new Date(), hungerRestore = 30) {
  const current = liveStats(pet, now);
  return {
    health: clamp(current.health + 2, 0, 100),
    hunger: clamp(current.hunger + hungerRestore, 0, 100),
    happiness: current.happiness + 8,
    createdAt: pet.createdAt,
    updatedAt: now,
  };
}

function commitChanges(pet, delta, now = new Date()) {
  const current = liveStats(pet, now);
  return {
    health: clamp(current.health + (delta.health ?? 0), 0, 100),
    hunger: clamp(current.hunger + (delta.hunger ?? 0), 0, 100),
    happiness: current.happiness + (delta.happiness ?? 0),
    updatedAt: now,
  };
}

module.exports = { clamp, liveStats, withLiveStats, feedChanges, commitChanges, elapsedHours };