// Neon Drift tuning: every number that shapes how the game feels lives here,
// so balance passes touch this file and nothing else.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const ARENA_MARGIN = 30;

export const PALETTE = {
  background: '#050816',
  backgroundEdge: '#02030a',
  grid: 'rgba(56, 120, 255, 0.10)',
  gridBright: 'rgba(56, 189, 248, 0.16)',
  wall: '#38bdf8',
  wallDim: 'rgba(56, 189, 248, 0.35)',
  player: '#22d3ee',
  playerCore: '#ecfeff',
  bullet: '#a5f3fc',
  bulletHot: '#ffffff',
  chaser: '#f0abfc',
  chaserCore: '#e879f9',
  shooter: '#fbbf24',
  shooterCore: '#f59e0b',
  splitter: '#c084fc',
  splitterCore: '#a855f7',
  mini: '#f9a8d4',
  lancer: '#a3e635',
  lancerCore: '#4d7c0f',
  warden: '#fb7185',
  wardenCore: '#f43f5e',
  wardenRage: '#ff2d55',
  wardenRageCore: '#ffd166',
  drone: '#67e8f9',
  enemyBullet: '#fda4af',
  pickup: '#6ee7b7',
  heart: '#fb7185',
  heartEmpty: 'rgba(251, 113, 133, 0.22)',
  shield: '#93c5fd',
  text: '#e0f2fe',
  textDim: '#7dd3fc',
  gold: '#fde68a',
  danger: '#fb7185',
};

export const PLAYER = {
  radius: 14,
  accel: 2600,
  maxSpeed: 330,
  friction: 6.5,
  fireInterval: 0.16,
  bulletSpeed: 760,
  bulletRadius: 5,
  bulletDamage: 1,
  bulletLife: 0.9,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 2.1,
  dashInvuln: 0.24,
  maxHearts: 5,
  hitInvuln: 1.0,
  magnetRadius: 90,
  pickupRadius: 26,
};

// Per-type enemy tuning. hp and speed scale with the wave in enemies.js.
export const ENEMIES = {
  chaser: { radius: 16, hp: 2, speed: 128, score: 50, contact: 1, turn: 5.5 },
  shooter: { radius: 17, hp: 3, speed: 96, score: 80, contact: 1, holdRange: 280, fireInterval: 2.1, bulletSpeed: 300 },
  splitter: { radius: 26, hp: 6, speed: 62, score: 120, contact: 1, children: 3 },
  mini: { radius: 10, hp: 1, speed: 205, score: 25, contact: 1, turn: 7.0 },
  lancer: { radius: 15, hp: 3, speed: 150, score: 100, contact: 1, approachRange: 330, telegraph: 0.6, chargeSpeed: 640, chargeTime: 0.42, recover: 0.8 },
  warden: { radius: 46, hp: 46, speed: 46, score: 800, contact: 1, burstInterval: 2.6, burstCount: 12, bulletSpeed: 210, rageAt: 0.5, rageSpeed: 66, rageBurstInterval: 1.9, spiralInterval: 0.11, spiralSpeed: 235 },
};

export const WAVES = {
  // Composition: how many of each type a wave fields, before scaling.
  baseCount: 5,
  perWave: 2,
  maxAlive: 26,
  spawnInterval: 0.55,
  spawnTelegraph: 0.7,
  bossEvery: 5,
  finalWave: 10, // clearing this wave wins the run
  primeHpMult: 1.9, // the final wave's Warden Prime is tougher and bigger
  primeRadius: 54,
  primeScore: 2000,
  hpGrowth: 0.09, // +9% enemy hp per wave, rounded up at spawn
  speedGrowth: 0.022, // +2.2% enemy speed per wave, capped below
  speedCap: 1.55,
};

export const COMBO = {
  step: 8, // kills per multiplier step
  maxMult: 5,
  decayGrace: 6, // seconds without a kill before the combo counter drains
  drainRate: 4, // combo kills lost per second once the grace runs out
};

export const DRONE = {
  orbitRadius: 54,
  orbitSpeed: 2.6,
  fireInterval: 0.55,
  bulletSpeed: 720,
  range: 430,
  damage: 1,
};

export const NOVA = {
  baseRadius: 115,
  radiusPerLevel: 45,
  damage: 2,
};

export const PICKUPS = {
  cellScore: 15,
  cellLife: 9,
  heartChance: 0.05, // chance a splitter or warden drops a heart
  magnetPull: 620,
};

export const JUICE = {
  shakeOnHit: 14,
  shakeOnKill: 3,
  shakeOnWardenDeath: 22,
  hitStop: 0.028, // brief freeze on a kill, seconds
  maxParticles: 320,
  maxFloaters: 24,
};
