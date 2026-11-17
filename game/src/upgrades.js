// The upgrade pool: what the wave-clear choice offers, and what each pick
// does to the run's modifiers. Choices are rolled from the seeded RNG so a
// screenshot seed reproduces the same three cards.

export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Cycler',
    desc: '+25% fire rate. Hold the trigger and melt the wave.',
    glyph: '≫',
    max: 5,
    apply: (mods) => { mods.fireRate *= 1.25; },
  },
  {
    id: 'twin',
    name: 'Twin Bolts',
    desc: '+1 projectile per shot, fanned outward.',
    glyph: '⋔',
    max: 3,
    apply: (mods) => { mods.projectiles += 1; },
  },
  {
    id: 'heavy',
    name: 'Heavy Rounds',
    desc: '+40% bullet damage. Fewer shots per kill.',
    glyph: '✦',
    max: 5,
    apply: (mods) => { mods.damage *= 1.4; },
  },
  {
    id: 'dash',
    name: 'Swift Dash',
    desc: '-30% dash cooldown. Dash through danger more often.',
    glyph: '➤',
    max: 3,
    apply: (mods) => { mods.dashCooldown = Math.max(0.8, mods.dashCooldown * 0.7); },
  },
  {
    id: 'shield',
    name: 'Aegis Shield',
    desc: '+1 shield charge. Blocks one hit; refills each wave.',
    glyph: '⬢',
    max: 3,
    apply: (mods, state) => {
      mods.shieldMax += 1;
      state.shields = Math.min(mods.shieldMax, state.shields + 1);
    },
  },
  {
    id: 'speed',
    name: 'Ion Thrusters',
    desc: '+15% move speed. Outrun the swarm.',
    glyph: '≈',
    max: 4,
    apply: (mods) => { mods.speed *= 1.15; },
  },
  {
    id: 'magnet',
    name: 'Tractor Field',
    desc: '+60% pickup magnet radius. Cells fly to you.',
    glyph: '◎',
    max: 3,
    apply: (mods) => { mods.magnet *= 1.6; },
  },
  {
    id: 'hull',
    name: 'Reinforced Hull',
    desc: '+1 max heart, and restore one heart now.',
    glyph: '♥',
    max: 4,
    apply: (mods, state) => {
      mods.maxHearts += 1;
      state.player.hearts = Math.min(mods.maxHearts, state.player.hearts + 1);
    },
  },
  {
    id: 'pierce',
    name: 'Lance Rounds',
    desc: 'Shots punch through +1 enemy. Line the swarm up.',
    glyph: '⇢',
    max: 3,
    apply: (mods) => { mods.pierce += 1; },
  },
  {
    id: 'nova',
    name: 'Nova Dash',
    desc: 'Dashing releases a shockwave that wounds nearby foes.',
    glyph: '✺',
    max: 2,
    apply: (mods) => { mods.novaDash += 1; },
  },
  {
    id: 'drone',
    name: 'Orbit Drone',
    desc: 'A drone circles your skiff and fires at the nearest foe.',
    glyph: '◉',
    max: 2,
    apply: (mods) => { mods.drones += 1; },
  },
  {
    id: 'secondwind',
    name: 'Second Wind',
    desc: 'Once per run, revive with 3 hearts when destroyed.',
    glyph: '★',
    max: 1,
    apply: (mods) => { mods.secondWind = true; },
  },
];

export function defaultMods() {
  return {
    fireRate: 1,
    projectiles: 1,
    damage: 1,
    dashCooldown: 2.1,
    shieldMax: 0,
    speed: 1,
    magnet: 1,
    maxHearts: 5,
    pierce: 0,
    novaDash: 0,
    drones: 0,
    secondWind: false,
  };
}

// Roll three distinct upgrades the player has not maxed out yet.
export function rollChoices(rng, owned) {
  const available = UPGRADES.filter((u) => (owned[u.id] || 0) < u.max);
  const pool = available.length >= 3 ? available : UPGRADES;
  const shuffled = rng.shuffle([...pool]);
  return shuffled.slice(0, 3);
}

export function applyUpgrade(state, upgrade) {
  upgrade.apply(state.mods, state);
  state.owned[upgrade.id] = (state.owned[upgrade.id] || 0) + 1;
  state.upgradeNames.push(upgrade.name);
}
