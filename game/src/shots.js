// Deterministic screenshot staging: with ?shot=<scene>&seed=<n> the game
// builds one composed scene from its own code and flags window.__shotReady
// once the scene has settled, so a screenshot script can capture it. Every
// scene is the real game rendering real entities — nothing is faked.

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

// Mid-combat in wave 5: the Warden boss with its health bar, every enemy
// type on screen, bullets flying both ways, the HUD complete, a combo
// running, upgrades owned, dash mid-cooldown. Bullets are placed by hand
// rather than fired live, so the staging never kills an enemy and the
// composition stays exactly as composed.
function stageAction(game) {
  game.state = 'playing';
  game.startWave(5);
  game.bannerLeft = 0;
  game.score = 18420;
  game.kills = 61;
  game.comboKills = 22;
  game.comboMult = 3;
  game.maxComboMult = 3;
  game.player.hearts = 4;
  game.player.x = 430;
  game.player.y = 420;
  game.player.angle = Math.atan2(210 - 420, 950 - 430);
  game.player.dashCooldownLeft = 1.6;
  game.mods.projectiles = 2;
  game.mods.fireRate = 1.25;
  game.mods.shieldMax = 1;
  game.shields = 1;
  game.upgradeGlyphs = ['≫', '⋔', '⬢'];
  game.owned = { rapid: 1, twin: 1, shield: 1 };
  game.spawnQueue = [];
  const place = (type, x, y) => {
    const e = makeEnemy(type, x, y, 5);
    e.spawnAge = 1;
    game.enemies.push(e);
    return e;
  };
  const warden = place('warden', 950, 210);
  warden.hp = 30;
  place('chaser', 250, 180);
  place('chaser', 700, 545);
  place('chaser', 1080, 480);
  place('shooter', 1050, 300);
  place('shooter', 300, 560);
  place('splitter', 1150, 600);
  place('mini', 620, 240);
  place('mini', 560, 560);
  // Player bullets streaming toward the Warden, fanned in pairs.
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
  game.particles.burst(950, 210, PALETTE.warden, 10, 200, 0.5, 3);
  game.particles.ring(820, 300, PALETTE.chaser, 60, 0.4);
  game.particles.floater(820, 260, '+240', PALETTE.gold, 18);
  game.particles.floater(880, 400, '+150', PALETTE.gold, 16);
  game.dropPickup(560, 330, 'cell');
  game.dropPickup(600, 500, 'cell');
  game.dropPickup(380, 300, 'cell');
  game.muzzle = 0.05;
  game.input.mouseX = 950;
  game.input.mouseY = 210;
  runSteps(game, 8);
}

// The wave-clear upgrade choice with three rolled cards.
function stageUpgrade(game) {
  game.state = 'playing';
  game.wave = 4;
  game.score = 8450;
  game.kills = 31;
  game.player.hearts = 4;
  game.player.x = VIEW_W / 2;
  game.player.y = VIEW_H / 2 + 60;
  game.mods.fireRate = 1.25;
  game.upgradeGlyphs = ['≫'];
  game.owned = { rapid: 1 };
  game.choices = rollChoices(game.rng, game.owned);
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

export function setupShot(game, kind, seed) {
  game.rng.reseed(seed);
  if (kind === 'start') stageStart(game);
  else if (kind === 'action') stageAction(game);
  else if (kind === 'upgrade') stageUpgrade(game);
  else if (kind === 'over') stageOver(game);
  else return false;
  return true;
}
