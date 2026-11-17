// The game itself: state machine (title, playing, upgrade choice, paused,
// victory, game over), the wave flow, collisions, scoring, combo and
// pickups. Clearing the final wave wins the run. The fixed step is driven
// by main.js; rendering lives in render.js.

import { COMBO, DRONE, JUICE, NOVA, PALETTE, PICKUPS, PLAYER, VIEW_H, VIEW_W, WAVES } from './config.js';
import { RNG } from './random.js';
import { Particles } from './particles.js';
import { createPlayer, droneSlots, updatePlayer } from './player.js';
import { edgeSpawnPoint, makeEnemy, promoteToPrime, updateEnemies, waveComposition } from './enemies.js';
import { applyUpgrade, defaultMods, rollChoices } from './upgrades.js';
import {
  cardRect,
  drawAcquiredBanner,
  drawGameOver,
  drawHUD,
  drawMuteButton,
  drawPaused,
  drawTitle,
  drawUpgradeChoice,
  drawVictory,
  drawWaveBanner,
  drawWorld,
  LAYOUT,
  pointIn,
} from './render.js';

export class Game {
  constructor(input, sound) {
    this.input = input;
    this.sound = sound;
    this.rng = new RNG(20261116);
    this.particles = new Particles();
    this.state = 'title';
    this.time = 0;
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem('neon-drift-best') || 0);
    } catch {
      this.best = 0;
    }
    this.resetRun();
    this.state = 'title';
    this.shake = 0;
    this.hitStopLeft = 0;
    this.muzzle = 0;
    this.bannerLeft = 0;
    this.bannerAge = 0;
    this.upgradeAge = 0;
    this.overAge = 0;
    this.victoryAge = 0;
    this.deathTimer = 0;
    this.newBest = false;
    this.titleDrift = 0;
    this.acquiredText = '';
    this.acquiredLeft = 0;
    this.comboTimer = 0;
    this.droneAngle = 0;
    this.droneTimer = 0;
    this.secondWindUsed = false;
  }

  resetRun() {
    this.player = createPlayer(VIEW_W / 2, VIEW_H / 2);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.particles.clear();
    this.mods = defaultMods();
    this.owned = {};
    this.upgradeNames = [];
    this.upgradeGlyphs = [];
    this.score = 0;
    this.kills = 0;
    this.wave = 0;
    this.comboKills = 0;
    this.comboMult = 1;
    this.comboPop = 0;
    this.maxComboMult = 1;
    this.comboTimer = 0;
    this.shields = 0;
    this.runTime = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.choices = [];
    this.newBest = false;
    this.shake = 0;
    this.hitStopLeft = 0;
    this.muzzle = 0;
    this.bannerLeft = 0;
    this.deathTimer = 0;
    this.overAge = 0;
    this.upgradeAge = 0;
    this.victoryAge = 0;
    this.acquiredText = '';
    this.acquiredLeft = 0;
    this.droneAngle = 0;
    this.droneTimer = 0;
    this.secondWindUsed = false;
  }

  startRun() {
    this.resetRun();
    this.state = 'playing';
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    this.spawnQueue = waveComposition(n, this.rng);
    this.spawnTimer = 0.4;
    this.bannerLeft = 2.2;
    this.bannerAge = 0;
    this.shields = this.mods.shieldMax;
    this.sound.waveStart();
  }

  step(dt) {
    this.time += dt;
    this.comboPop = Math.max(0, this.comboPop - dt * 3);
    this.muzzle = Math.max(0, this.muzzle - dt);
    this.shake = Math.max(0, this.shake - dt * 34);
    this.acquiredLeft = Math.max(0, this.acquiredLeft - dt);
    if (this.bannerLeft > 0) {
      this.bannerLeft -= dt;
      this.bannerAge += dt;
    }

    // Mute is available from every screen.
    if (this.input.pressed('KeyM')) this.sound.toggleMute();
    if (this.input.justClicked && pointIn(LAYOUT.muteButton, this.input.clickX, this.input.clickY)) {
      this.sound.toggleMute();
      this.input.justClicked = false;
    }

    if (this.state === 'title') {
      this.titleDrift += dt;
      if (Math.random() < dt * 6) {
        this.particles.trail(
          this.rng.range(60, VIEW_W - 60),
          this.rng.range(60, VIEW_H - 60),
          this.rng.pick([PALETTE.player, PALETTE.chaser, PALETTE.shooter]),
          2,
        );
      }
      this.particles.update(dt);
      const startIt = this.input.pressed('Enter') || this.input.pressed('NumpadEnter')
        || (this.input.justClicked && pointIn(LAYOUT.startButton, this.input.clickX, this.input.clickY));
      if (startIt) {
        this.sound.ensure();
        this.sound.uiClick();
        this.startRun();
      }
      return;
    }

    if (this.state === 'upgrade') {
      this.upgradeAge += dt;
      this.particles.update(dt);
      let picked = -1;
      if (this.input.pressed('Digit1')) picked = 0;
      if (this.input.pressed('Digit2')) picked = 1;
      if (this.input.pressed('Digit3')) picked = 2;
      if (this.input.justClicked) {
        for (let i = 0; i < 3; i += 1) {
          if (pointIn(cardRect(i), this.input.clickX, this.input.clickY)) picked = i;
        }
      }
      if (picked >= 0 && this.choices[picked]) {
        const upgrade = this.choices[picked];
        applyUpgrade(this, upgrade);
        this.upgradeGlyphs.push(upgrade.glyph);
        this.acquiredText = `${upgrade.name} ACQUIRED`;
        this.acquiredLeft = 2.4;
        this.sound.upgrade();
        this.state = 'playing';
        this.startWave(this.wave + 1);
      }
      return;
    }

    if (this.state === 'paused') {
      if (this.input.pressed('KeyP') || this.input.pressed('Escape')
        || (this.input.justClicked && pointIn(LAYOUT.resumeButton, this.input.clickX, this.input.clickY))) {
        this.sound.uiClick();
        this.state = 'playing';
      } else if (this.input.justClicked && pointIn(LAYOUT.pauseRestartButton, this.input.clickX, this.input.clickY)) {
        this.sound.uiClick();
        this.startRun();
      }
      return;
    }

    if (this.state === 'over') {
      this.overAge += dt;
      this.particles.update(dt);
      const restart = this.input.pressed('KeyR') || this.input.pressed('Enter')
        || (this.input.justClicked && pointIn(LAYOUT.restartButton, this.input.clickX, this.input.clickY));
      if (restart && this.overAge > 0.5) {
        this.sound.uiClick();
        this.startRun();
      }
      return;
    }

    if (this.state === 'victory') {
      this.victoryAge += dt;
      this.particles.update(dt);
      // Celebration sparks drift up while the results screen stands.
      if (Math.random() < dt * 7) {
        this.particles.burst(
          this.rng.range(80, VIEW_W - 80),
          this.rng.range(90, 300),
          this.rng.pick([PALETTE.gold, PALETTE.player, PALETTE.chaser, PALETTE.pickup]),
          10, 190, 0.8, 3,
        );
      }
      const again = this.input.pressed('KeyR') || this.input.pressed('Enter')
        || (this.input.justClicked && pointIn(LAYOUT.victoryButton, this.input.clickX, this.input.clickY));
      if (again && this.victoryAge > 0.5) {
        this.sound.uiClick();
        this.startRun();
      }
      return;
    }

    // --- playing ---
    if (this.input.pressed('KeyP') || this.input.pressed('Escape')) {
      this.state = 'paused';
      return;
    }
    this.runTime += dt;

    // Combo decay: after a few kill-less seconds the counter drains away,
    // so the multiplier has to be earned again instead of idling at x5.
    if (this.comboKills > 0) {
      this.comboTimer += dt;
      if (this.comboTimer > COMBO.decayGrace) {
        this.comboKills = Math.max(0, this.comboKills - COMBO.drainRate * dt);
        this.comboMult = Math.min(COMBO.maxMult, 1 + Math.floor(this.comboKills / COMBO.step));
      }
    }

    // Death cinematic: particles only, then the results screen.
    if (!this.player.alive) {
      this.deathTimer -= dt;
      this.particles.update(dt);
      this.updateBullets(dt, false);
      if (this.deathTimer <= 0) {
        this.state = 'over';
        this.overAge = 0;
      }
      return;
    }

    // Hit-stop: a beat of frozen action on every kill.
    if (this.hitStopLeft > 0) {
      this.hitStopLeft -= dt;
      this.particles.update(dt);
      return;
    }

    updatePlayer(this, dt);
    this.updateSpawning(dt);
    updateEnemies(this, dt);
    this.updateDrones(dt);
    this.updateBullets(dt, true);
    this.updateEnemyBullets(dt);
    this.updatePickups(dt);
    this.particles.update(dt);
    this.checkWaveClear();
  }

  // Orbit drones: circle the skiff and shoot the nearest hostile in range.
  updateDrones(dt) {
    if (this.mods.drones <= 0 || !this.player.alive) return;
    this.droneAngle += DRONE.orbitSpeed * dt;
    this.droneTimer -= dt;
    if (this.droneTimer > 0 || this.enemies.length === 0) return;
    this.droneTimer = DRONE.fireInterval;
    const slots = droneSlots(this.player, this.mods.drones, this.droneAngle);
    for (const slot of slots) {
      let target = null;
      let bestDist = DRONE.range;
      for (const e of this.enemies) {
        if (e.spawnAge < WAVES.spawnTelegraph) continue;
        const dist = Math.hypot(e.x - slot.x, e.y - slot.y);
        if (dist < bestDist) {
          bestDist = dist;
          target = e;
        }
      }
      if (!target) continue;
      const a = Math.atan2(target.y - slot.y, target.x - slot.x);
      this.bullets.push({
        x: slot.x,
        y: slot.y,
        vx: Math.cos(a) * DRONE.bulletSpeed,
        vy: Math.sin(a) * DRONE.bulletSpeed,
        radius: 4,
        damage: DRONE.damage,
        life: 0.8,
        pierce: 0,
        struck: null,
      });
      this.particles.trail(slot.x, slot.y, PALETTE.drone, 2);
    }
  }

  // The Nova Dash shockwave: wounds everything near the dash origin.
  detonateNova(x, y, level) {
    const radius = NOVA.baseRadius + NOVA.radiusPerLevel * (level - 1);
    this.particles.ring(x, y, PALETTE.player, radius + 30, 0.45);
    this.particles.burst(x, y, PALETTE.player, 26, 380, 0.5, 3);
    this.shake = Math.min(24, this.shake + 6);
    this.sound.explosion(false);
    for (const e of [...this.enemies]) {
      if (e.spawnAge < WAVES.spawnTelegraph) continue;
      if (Math.hypot(e.x - x, e.y - y) > radius + e.radius) continue;
      this.damageEnemy(e, NOVA.damage, e.x, e.y);
    }
  }

  updateSpawning(dt) {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    if (this.enemies.length >= WAVES.maxAlive) {
      this.spawnTimer = 0.3;
      return;
    }
    this.spawnTimer = WAVES.spawnInterval;
    const type = this.spawnQueue.shift();
    const at = edgeSpawnPoint(this.rng);
    const enemy = makeEnemy(type, at.x, at.y, this.wave);
    if (type === 'warden' && this.wave === WAVES.finalWave) promoteToPrime(enemy);
    this.enemies.push(enemy);
    this.particles.ring(at.x, at.y, type === 'warden' ? PALETTE.warden : PALETTE.textDim, 40, 0.5);
  }

  updateBullets(dt, collide) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > VIEW_W || b.y < 0 || b.y > VIEW_H) {
        this.bullets.splice(i, 1);
        continue;
      }
      if (!collide) continue;
      for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
        const e = this.enemies[j];
        if (e.spawnAge < WAVES.spawnTelegraph) continue;
        if (b.struck && b.struck.has(e)) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy > (b.radius + e.radius) * (b.radius + e.radius)) continue;
        // Lance Rounds: a bolt with pierce left keeps flying after a hit,
        // but never wounds the same enemy twice.
        if (b.pierce > 0) {
          if (!b.struck) b.struck = new Set();
          b.struck.add(e);
          b.pierce -= 1;
          this.damageEnemy(e, b.damage, b.x, b.y);
        } else {
          this.bullets.splice(i, 1);
          this.damageEnemy(e, b.damage, b.x, b.y);
        }
        break;
      }
    }
  }

  damageEnemy(e, damage, hitX, hitY) {
    e.hp -= damage;
    e.flash = 1;
    this.particles.burst(hitX, hitY, '#e0f2fe', 4, 160, 0.25, 2);
    if (e.hp > 0) {
      this.sound.enemyHit();
      return;
    }
    const index = this.enemies.indexOf(e);
    if (index >= 0) this.enemies.splice(index, 1);
    this.kills += 1;
    this.comboKills += 1;
    this.comboTimer = 0;
    const prevMult = this.comboMult;
    this.comboMult = Math.min(COMBO.maxMult, 1 + Math.floor(this.comboKills / COMBO.step));
    this.maxComboMult = Math.max(this.maxComboMult, this.comboMult);
    this.comboPop = 1;
    if (this.comboMult > prevMult) {
      this.particles.floater(this.player.x, this.player.y - 46, `COMBO x${this.comboMult}!`, PALETTE.gold, 21);
    }
    const gained = e.score * this.comboMult;
    this.score += gained;
    this.particles.floater(e.x, e.y - e.radius - 6, `+${gained}`, this.comboMult > 1 ? PALETTE.gold : '#e0f2fe', 15 + this.comboMult * 2);
    const colors = { chaser: PALETTE.chaser, shooter: PALETTE.shooter, splitter: PALETTE.splitter, mini: PALETTE.mini, lancer: PALETTE.lancer, warden: PALETTE.warden };
    this.particles.burst(e.x, e.y, colors[e.type], e.type === 'warden' ? 60 : 20, e.type === 'warden' ? 420 : 300, 0.6, 3.5);
    this.particles.ring(e.x, e.y, colors[e.type], e.type === 'warden' ? 160 : 60, 0.4);
    if (e.prime) {
      this.particles.floater(e.x, e.y - e.radius - 10, 'WARDEN PRIME DOWN!', PALETTE.gold, 22);
      this.particles.ring(e.x, e.y, PALETTE.gold, 220, 0.7);
    }
    this.sound.explosion(e.type === 'warden');
    this.hitStopLeft = e.type === 'warden' ? 0.09 : JUICE.hitStop;
    this.shake = Math.min(24, this.shake + (e.type === 'warden' ? JUICE.shakeOnWardenDeath : JUICE.shakeOnKill));
    if (e.type === 'splitter') {
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2 + this.rng.angle() * 0.3;
        const mini = makeEnemy('mini', e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18, this.wave);
        mini.spawnAge = WAVES.spawnTelegraph;
        mini.angle = a;
        this.enemies.push(mini);
      }
    }
    // Drops: every enemy leaves a cell; splitters and wardens may leave a heart.
    const cells = e.type === 'warden' ? 8 : 1;
    for (let i = 0; i < cells; i += 1) this.dropPickup(e.x, e.y, 'cell');
    if ((e.type === 'splitter' || e.type === 'warden') && this.rng.chance(e.type === 'warden' ? 0.6 : PICKUPS.heartChance)) {
      this.dropPickup(e.x, e.y, 'heart');
    }
  }

  dropPickup(x, y, kind) {
    const a = this.rng.angle();
    const v = this.rng.range(40, 130);
    this.pickups.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      kind,
      life: PICKUPS.cellLife,
      age: this.rng.range(0, 2),
    });
  }

  updateEnemyBullets(dt) {
    const p = this.player;
    for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > VIEW_W || b.y < 0 || b.y > VIEW_H) {
        this.enemyBullets.splice(i, 1);
        continue;
      }
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      if (dx * dx + dy * dy < (b.radius + p.radius - 2) * (b.radius + p.radius - 2)) {
        this.enemyBullets.splice(i, 1);
        this.hurtPlayer(p.x, p.y);
      }
    }
    // Contact with enemies.
    for (const e of this.enemies) {
      if (e.spawnAge < WAVES.spawnTelegraph) continue;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < e.radius + p.radius - 2) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        e.x -= nx * 26;
        e.y -= ny * 26;
        this.hurtPlayer(p.x, p.y);
        break;
      }
    }
  }

  hurtPlayer(x, y) {
    const p = this.player;
    if (!p.alive || p.invulnLeft > 0) return;
    if (this.shields > 0) {
      this.shields -= 1;
      p.invulnLeft = 0.6;
      this.particles.ring(x, y, PALETTE.shield, 60, 0.35);
      this.particles.burst(x, y, PALETTE.shield, 12, 240, 0.4, 3);
      this.sound.enemyHit();
      return;
    }
    p.hearts -= 1;
    this.comboKills = 0;
    this.comboMult = 1;
    p.invulnLeft = PLAYER.hitInvuln;
    this.shake = Math.min(24, this.shake + JUICE.shakeOnHit);
    this.particles.burst(x, y, PALETTE.danger, 24, 340, 0.55, 3.5);
    this.particles.ring(x, y, PALETTE.danger, 80, 0.4);
    this.sound.playerHit();
    if (p.hearts <= 0) {
      // Second Wind: once per run, the skiff pulls itself back together.
      if (this.mods.secondWind && !this.secondWindUsed) {
        this.secondWindUsed = true;
        p.hearts = 3;
        p.invulnLeft = 2.0;
        this.particles.floater(p.x, p.y - 52, 'SECOND WIND!', PALETTE.gold, 24);
        this.particles.ring(x, y, PALETTE.gold, 150, 0.6);
        this.particles.burst(x, y, PALETTE.gold, 40, 380, 0.7, 3.5);
        this.sound.revive();
        return;
      }
      p.alive = false;
      this.deathTimer = 1.0;
      this.particles.burst(x, y, PALETTE.player, 70, 460, 0.9, 4);
      this.particles.ring(x, y, PALETTE.player, 190, 0.7);
      this.shake = 24;
      this.sound.gameOver();
      if (this.score > this.best) {
        this.best = this.score;
        this.newBest = true;
        try {
          window.localStorage.setItem('neon-drift-best', String(this.best));
        } catch {
          // Storage unavailable: the best score just lives for this session.
        }
      }
    }
  }

  updatePickups(dt) {
    const p = this.player;
    const magnet = PLAYER.magnetRadius * this.mods.magnet;
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pk = this.pickups[i];
      pk.age += dt;
      pk.life -= dt;
      if (pk.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < magnet && p.alive) {
        const pull = PICKUPS.magnetPull * (1 - dist / (magnet + 1));
        pk.vx += (dx / dist) * pull * dt * 4;
        pk.vy += (dy / dist) * pull * dt * 4;
      }
      pk.vx *= 1 - Math.min(1, 2.4 * dt);
      pk.vy *= 1 - Math.min(1, 2.4 * dt);
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      if (dist < PLAYER.pickupRadius && p.alive) {
        this.pickups.splice(i, 1);
        if (pk.kind === 'cell') {
          this.score += PICKUPS.cellScore;
          this.particles.floater(pk.x, pk.y - 10, `+${PICKUPS.cellScore}`, PALETTE.pickup, 13);
          this.sound.pickup();
        } else {
          p.hearts = Math.min(this.mods.maxHearts, p.hearts + 1);
          this.particles.floater(pk.x, pk.y - 10, '+1 ♥', PALETTE.heart, 16);
          this.particles.ring(pk.x, pk.y, PALETTE.heart, 50, 0.35);
          this.sound.heart();
        }
      }
    }
  }

  checkWaveClear() {
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.player.alive) {
      if (this.wave >= WAVES.finalWave) {
        this.winRun();
        return;
      }
      this.choices = rollChoices(this.rng, this.owned);
      this.upgradeAge = 0;
      this.state = 'upgrade';
      this.particles.floater(VIEW_W / 2, 180, 'WAVE CLEAR', PALETTE.gold, 22);
    }
  }

  // The run is won: record the best score, celebrate, show the results.
  winRun() {
    this.state = 'victory';
    this.victoryAge = 0;
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      try {
        window.localStorage.setItem('neon-drift-best', String(this.best));
      } catch {
        // Storage unavailable: the best score just lives for this session.
      }
    }
    this.sound.victory();
    for (let i = 0; i < 5; i += 1) {
      this.particles.burst(
        this.rng.range(140, VIEW_W - 140),
        this.rng.range(120, 420),
        this.rng.pick([PALETTE.gold, PALETTE.player, PALETTE.pickup, PALETTE.chaser]),
        26, 320, 0.9, 3.5,
      );
    }
    this.particles.ring(this.player.x, this.player.y, PALETTE.gold, 200, 0.8);
  }

  render(ctx) {
    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    if (this.state === 'title') {
      drawTitle(ctx, this, this.time);
    } else {
      drawWorld(ctx, this, this.time);
      drawHUD(ctx, this, this.time);
      drawWaveBanner(ctx, this);
      drawAcquiredBanner(ctx, this);
      if (this.state === 'upgrade') drawUpgradeChoice(ctx, this);
      if (this.state === 'paused') drawPaused(ctx, this);
      if (this.state === 'over') drawGameOver(ctx, this);
      if (this.state === 'victory') drawVictory(ctx, this);
    }
    ctx.restore();
    // The mute button floats above every screen, including the title.
    if (this.state === 'title') drawMuteButton(ctx, this);
  }
}
