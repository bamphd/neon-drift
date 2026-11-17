// Deterministic screenshot staging: with ?shot=<scene>&seed=<n> the game
// builds one composed scene from its own code and flags window.__shotReady
// once the scene has settled, so a screenshot script can capture it. Every
// scene is the real game rendering real entities — nothing is faked.
// Scenes: start, action, upgrade, over, victory.

import { PALETTE, VIEW_H, VIEW_W } from './config.js';
import { makeEnemy } from './enemies.js';
import { rollChoices } from './upgrades.js';

const STEP = 1 / 60;

function runSteps(game, count) {
  for (let i = 0; i < count; i += 1) {
    game.step(STEP);
    game.input.endStep();
  }
}

// The title screen, with the ambient drift settled.
function stageStart(game) {
  game.state = 'title';
  runSteps(game, 50);
}

// Mid-combat in wave 5: the Warden mid-rage with its health bar past the
// threshold tick, a lancer winding up a charge, a drone on patrol, bolts
// flying both ways, the HUD complete and a combo running. Projectiles are
// placed by hand rather than fired live, so the staging never kills an
// enemy and the composition stays exactly as composed.
function stageAction(game) {
  game.state = 'playing';
  game.startWave(5);
  game.bannerLeft = 0;
  game.score = 24860;
  game.best = 24860;
  game.kills = 74;
  game.comboKills = 26;
  game.comboMult = 4;
  game.maxComboMult = 4;
  game.comboTimer = 1.5;
  game.player.hearts = 4;
  game.player.x = 400;
  game.player.y = 440;
  game.player.angle = Math.atan2(210 - 440, 950 - 400);
  game.player.dashCooldownLeft = 1.2;
  game.mods.projectiles = 2;
  game.mods.fireRate = 1.25;
  game.mods.shieldMax = 1;
  game.mods.drones = 1;
  game.mods.pierce = 1;
  game.shields = 1;
  game.droneAngle = 0.8;
  game.upgradeGlyphs = ['≫', '⋔', '⬢', '◉', '⇢'];
  game.owned = { rapid: 1, twin: 1, shield: 1, drone: 1, pierce: 1 };
  game.spawnQueue = [];
  const place = (type, x, y) => {
    const e = makeEnemy(type, x, y, 5);
    e.spawnAge = 1;
    game.enemies.push(e);
    return e;
  };
  const warden = place('warden', 950, 210);
  warden.hp = 26; // below half health: the rage phase is live
  warden.phase = 2;
  warden.spiralAngle = 0.6;
  const lancer = place('lancer', 760, 520);
  lancer.chargeMode = 'aim';
  lancer.chargeTimer = 0.55;
  lancer.angle = Math.atan2(game.player.y - 520, game.player.x - 760);
  place('lancer', 1080, 470);
  place('chaser', 250, 180);
  place('chaser', 690, 560);
  place('shooter', 1060, 310);
  place('shooter', 290, 570);
  place('splitter', 1150, 600);
  place('mini', 620, 250);
  place('mini', 560, 570);
  // Twin bolts streaming toward the Warden, fanned in pairs.
  const aim = game.player.angle;
  for (const dist of [90, 175, 260, 345]) {
    for (const side of [-0.045, 0.045]) {
      const a = aim + side;
      game.bullets.push({
        x: game.player.x + Math.cos(a) * dist,
        y: game.player.y + Math.sin(a) * dist,
        vx: Math.cos(a) * 760,
        vy: Math.sin(a) * 760,
        radius: 5,
        damage: 1,
        life: 0.9,
        pierce: 1,
        struck: null,
      });
    }
  }
  // Enemy bullets inbound, aimed to pass near the player, not hit it.
  game.enemyBullets.push(
    { x: 700, y: 330, vx: -250, vy: 90, radius: 6, life: 3 },
    { x: 640, y: 250, vx: -230, vy: 130, radius: 6, life: 3 },
    { x: 760, y: 480, vx: -270, vy: -60, radius: 6, life: 3 },
    { x: 880, y: 180, vx: -200, vy: 170, radius: 6, life: 3 },
  );
  game.particles.burst(820, 300, PALETTE.chaser, 16, 260, 0.6, 3);
  game.particles.burst(880, 430, PALETTE.shooter, 12, 220, 0.5, 3);
  game.particles.burst(950, 210, PALETTE.wardenRage, 10, 200, 0.5, 3);
  game.particles.ring(820, 300, PALETTE.chaser, 60, 0.4);
  game.particles.floater(820, 260, '+320', PALETTE.gold, 18);
  game.particles.floater(880, 400, '+200', PALETTE.gold, 16);
  game.dropPickup(560, 330, 'cell');
  game.dropPickup(600, 500, 'cell');
  game.dropPickup(380, 300, 'cell');
  game.muzzle = 0.05;
  game.input.mouseX = 950;
  game.input.mouseY = 210;
  runSteps(game, 8);
}

// The wave-clear upgrade choice. The roll is re-seeded a few times until at
// least one card comes from the new pool, so the screenshot shows the
// upgrade depth instead of only the opening set.
function stageUpgrade(game) {
  game.state = 'playing';
  game.wave = 4;
  game.score = 11240;
  game.kills = 38;
  game.player.hearts = 4;
  game.player.x = VIEW_W / 2;
  game.player.y = VIEW_H / 2 + 60;
  game.mods.fireRate = 1.25;
  game.upgradeGlyphs = ['≫', '♥'];
  game.owned = { rapid: 1, hull: 1 };
  const fresh = new Set(['pierce', 'nova', 'drone', 'secondwind']);
  let picks = rollChoices(game.rng, game.owned);
  for (let attempt = 0; attempt < 8 && !picks.some((u) => fresh.has(u.id)); attempt += 1) {
    game.rng.reseed(9000 + attempt);
    picks = rollChoices(game.rng, game.owned);
  }
  game.choices = picks;
  game.upgradeAge = 0;
  game.state = 'upgrade';
  game.input.mouseX = 640;
  game.input.mouseY = 360;
  runSteps(game, 30);
}

// The game-over results screen with a full stat line.
function stageOver(game) {
  game.state = 'playing';
  game.wave = 7;
  game.score = 21480;
  game.kills = 83;
  game.maxComboMult = 4;
  game.runTime = 274;
  game.best = 21480;
  game.newBest = true;
  game.upgradeGlyphs = ['≫', '⋔', '✺', '◉'];
  game.player.alive = false;
  game.player.hearts = 0;
  const warden = makeEnemy('warden', 980, 220, 7);
  warden.spawnAge = 1;
  warden.hp = 18;
  game.enemies.push(warden);
  const chaser = makeEnemy('chaser', 320, 520, 7);
  chaser.spawnAge = 1;
  game.enemies.push(chaser);
  game.particles.burst(game.player.x, game.player.y, PALETTE.player, 30, 300, 0.8, 3.5);
  game.state = 'over';
  game.overAge = 0;
  runSteps(game, 40);
}

// The victory results screen: the sector cleared, the full stat line, the
// upgrades held, and the play-again button.
function stageVictory(game) {
  game.state = 'playing';
  game.wave = 10;
  game.score = 48620;
  game.best = 48620;
  game.newBest = true;
  game.kills = 148;
  game.maxComboMult = 5;
  game.runTime = 512;
  game.player.hearts = 3;
  game.player.x = 200;
  game.player.y = 600;
  game.upgradeGlyphs = ['≫', '⋔', '✦', '⬢', '✺', '◉', '★'];
  game.owned = { rapid: 1, twin: 1, heavy: 1, shield: 1, nova: 1, drone: 1, secondwind: 1 };
  game.state = 'victory';
  game.victoryAge = 0;
  game.particles.burst(320, 180, PALETTE.gold, 24, 300, 0.9, 3.5);
  game.particles.burst(960, 160, PALETTE.player, 24, 300, 0.9, 3.5);
  game.particles.burst(640, 120, PALETTE.chaser, 20, 280, 0.9, 3);
  runSteps(game, 40);
}

export function setupShot(game, kind, seed) {
  game.rng.reseed(seed);
  if (kind === 'start') stageStart(game);
  else if (kind === 'action') stageAction(game);
  else if (kind === 'upgrade') stageUpgrade(game);
  else if (kind === 'over') stageOver(game);
  else if (kind === 'victory') stageVictory(game);
  else return false;
  return true;
}
