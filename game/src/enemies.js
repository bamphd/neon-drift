// Enemy types, wave composition, movement AI and drawing. Each type has one
// clear behaviour: chasers hunt, shooters keep range and fire, splitters are
// slow walls that burst into minis, lancers telegraph and charge in a line,
// and the warden is the wave-5 boss with a second enraged phase. The final
// wave fields the Warden Prime, a bigger and tougher warden.

import { ARENA_MARGIN, ENEMIES, PALETTE, VIEW_H, VIEW_W, WAVES } from './config.js';

export const ENEMY_COLORS = {
  chaser: PALETTE.chaser,
  shooter: PALETTE.shooter,
  splitter: PALETTE.splitter,
  mini: PALETTE.mini,
  lancer: PALETTE.lancer,
  warden: PALETTE.warden,
};

export const ENEMY_CORES = {
  chaser: PALETTE.chaserCore,
  shooter: PALETTE.shooterCore,
  splitter: PALETTE.splitterCore,
  mini: PALETTE.mini,
  lancer: PALETTE.lancerCore,
  warden: PALETTE.wardenCore,
};

function scaleFor(wave) {
  return {
    hp: 1 + WAVES.hpGrowth * (wave - 1),
    speed: Math.min(WAVES.speedCap, 1 + WAVES.speedGrowth * (wave - 1)),
  };
}

export function makeEnemy(type, x, y, wave) {
  const base = ENEMIES[type];
  const scale = scaleFor(wave);
  return {
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: base.radius,
    hp: Math.max(1, Math.ceil(base.hp * scale.hp)),
    maxHp: Math.max(1, Math.ceil(base.hp * scale.hp)),
    speed: base.speed * scale.speed,
    score: base.score,
    flash: 0,
    fireTimer: 1 + Math.random() * 1.2,
    burstTimer: 1.6,
    strafeDir: Math.random() < 0.5 ? -1 : 1,
    strafeTimer: 1 + Math.random() * 1.5,
    spawnAge: 0, // telegraph period: harmless and fading in
    wobble: Math.random() * Math.PI * 2,
    // Warden rage phase: 1 is the opening pattern, 2 is the enraged spiral.
    phase: 1,
    spiralTimer: 0,
    spiralAngle: Math.random() * Math.PI * 2,
    prime: false,
    // Lancer charge cycle: approach, aim, charge, recover.
    chargeMode: 'approach',
    chargeTimer: 0.5 + Math.random() * 0.8,
    chargeDirX: 1,
    chargeDirY: 0,
  };
}

// The final wave's boss: a bigger, tougher Warden Prime worth far more.
export function promoteToPrime(e) {
  e.prime = true;
  e.radius = WAVES.primeRadius;
  e.maxHp = Math.ceil(e.maxHp * WAVES.primeHpMult);
  e.hp = e.maxHp;
  e.score = WAVES.primeScore;
  e.speed *= 1.15;
  return e;
}

// Which types a wave fields. Early waves teach one type at a time; the
// lancer joins from wave 3, every 5th wave is a warden plus escorts, and
// the final wave is the Warden Prime with a full honour guard.
export function waveComposition(wave, rng) {
  const list = [];
  if (wave === WAVES.finalWave) {
    list.push('warden');
    list.push('lancer', 'lancer', 'shooter', 'shooter', 'splitter', 'chaser');
    return list;
  }
  if (wave % WAVES.bossEvery === 0) {
    list.push('warden');
    const escorts = 2 + Math.floor(wave / WAVES.bossEvery);
    for (let i = 0; i < escorts; i += 1) {
      const roll = rng.next();
      list.push(roll < 0.45 ? 'chaser' : roll < 0.75 ? 'shooter' : 'lancer');
    }
    return list;
  }
  const count = Math.min(WAVES.maxAlive, WAVES.baseCount + WAVES.perWave * (wave - 1));
  for (let i = 0; i < count; i += 1) {
    const roll = rng.next();
    if (wave === 1) list.push('chaser');
    else if (wave === 2) list.push(roll < 0.7 ? 'chaser' : 'shooter');
    else if (roll < 0.36) list.push('chaser');
    else if (roll < 0.6) list.push('shooter');
    else if (roll < 0.8) list.push('splitter');
    else list.push('lancer');
  }
  return list;
}

export function edgeSpawnPoint(rng, margin = ARENA_MARGIN + 24) {
  const side = rng.int(0, 3);
  if (side === 0) return { x: rng.range(margin, VIEW_W - margin), y: margin };
  if (side === 1) return { x: rng.range(margin, VIEW_W - margin), y: VIEW_H - margin };
  if (side === 2) return { x: margin, y: rng.range(margin, VIEW_H - margin) };
  return { x: VIEW_W - margin, y: rng.range(margin, VIEW_H - margin) };
}

function steerTowards(e, targetX, targetY, dt, turn) {
  const want = Math.atan2(targetY - e.y, targetX - e.x);
  let diff = want - e.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const maxTurn = turn * dt;
  e.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
}

// Separation so enemies never stack into one blob.
function separate(enemies, dt) {
  for (let i = 0; i < enemies.length; i += 1) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j += 1) {
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = a.radius + b.radius;
      if (dist > 0 && dist < min) {
        const push = ((min - dist) / dist) * 90 * dt;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

export function updateEnemies(state, dt) {
  const player = state.player;
  const bullets = state.enemyBullets;
  for (const e of state.enemies) {
    e.flash = Math.max(0, e.flash - dt * 6);
    e.wobble += dt * 3;
    if (e.spawnAge < WAVES.spawnTelegraph) {
      e.spawnAge += dt;
      continue;
    }
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (e.type === 'chaser' || e.type === 'mini') {
      const turn = ENEMIES[e.type].turn;
      steerTowards(e, player.x, player.y, dt, turn);
      e.vx = Math.cos(e.angle) * e.speed;
      e.vy = Math.sin(e.angle) * e.speed;
    } else if (e.type === 'splitter') {
      steerTowards(e, player.x, player.y, dt, 2.2);
      e.vx = Math.cos(e.angle) * e.speed;
      e.vy = Math.sin(e.angle) * e.speed;
    } else if (e.type === 'shooter') {
      const hold = ENEMIES.shooter.holdRange;
      e.strafeTimer -= dt;
      if (e.strafeTimer <= 0) {
        e.strafeDir *= -1;
        e.strafeTimer = 1 + Math.random() * 1.6;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const radial = dist > hold + 30 ? 1 : dist < hold - 30 ? -1 : 0;
      const tx = nx * radial + -ny * e.strafeDir * 0.8;
      const ty = ny * radial + nx * e.strafeDir * 0.8;
      const len = Math.hypot(tx, ty) || 1;
      e.vx = (tx / len) * e.speed;
      e.vy = (ty / len) * e.speed;
      e.angle = Math.atan2(dy, dx);
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && dist < 560) {
        e.fireTimer = ENEMIES.shooter.fireInterval * (0.85 + Math.random() * 0.3);
        bullets.push({
          x: e.x + nx * (e.radius + 6),
          y: e.y + ny * (e.radius + 6),
          vx: nx * ENEMIES.shooter.bulletSpeed,
          vy: ny * ENEMIES.shooter.bulletSpeed,
          radius: 6,
          life: 3.2,
        });
        state.particles.burst(e.x + nx * e.radius, e.y + ny * e.radius, PALETTE.shooter, 4, 120, 0.25, 2);
      }
    } else if (e.type === 'lancer') {
      const tune = ENEMIES.lancer;
      if (e.chargeMode === 'approach') {
        steerTowards(e, player.x, player.y, dt, 4.2);
        e.vx = Math.cos(e.angle) * e.speed;
        e.vy = Math.sin(e.angle) * e.speed;
        e.chargeTimer -= dt;
        if (dist < tune.approachRange && e.chargeTimer <= 0) {
          e.chargeMode = 'aim';
          e.chargeTimer = tune.telegraph;
        }
      } else if (e.chargeMode === 'aim') {
        // Telegraph: brake to a hover, track the player, flash bright.
        e.vx *= 1 - Math.min(1, 6 * dt);
        e.vy *= 1 - Math.min(1, 6 * dt);
        e.angle = Math.atan2(dy, dx);
        e.flash = 0.6;
        e.chargeTimer -= dt;
        if (e.chargeTimer <= 0) {
          e.chargeMode = 'charge';
          e.chargeTimer = tune.chargeTime;
          e.chargeDirX = Math.cos(e.angle);
          e.chargeDirY = Math.sin(e.angle);
          state.particles.burst(e.x, e.y, PALETTE.lancer, 8, 180, 0.3, 2.5);
          state.sound.dash();
        }
      } else if (e.chargeMode === 'charge') {
        e.vx = e.chargeDirX * tune.chargeSpeed;
        e.vy = e.chargeDirY * tune.chargeSpeed;
        state.particles.trail(e.x, e.y, PALETTE.lancer, 3);
        e.chargeTimer -= dt;
        if (e.chargeTimer <= 0) {
          e.chargeMode = 'recover';
          e.chargeTimer = tune.recover;
        }
      } else {
        // Recover: drift slowly, then rejoin the approach.
        e.vx *= 1 - Math.min(1, 3 * dt);
        e.vy *= 1 - Math.min(1, 3 * dt);
        e.chargeTimer -= dt;
        if (e.chargeTimer <= 0) {
          e.chargeMode = 'approach';
          e.chargeTimer = 0.4 + Math.random() * 0.9;
        }
      }
    } else if (e.type === 'warden') {
      const tune = ENEMIES.warden;
      // Rage phase: at half health the Warden turns hotter, moves faster,
      // bursts more often, and adds a rotating twin spiral.
      if (e.phase === 1 && e.hp <= e.maxHp * tune.rageAt) {
        e.phase = 2;
        e.speed = tune.rageSpeed * (e.prime ? 1.15 : 1);
        e.burstTimer = Math.min(e.burstTimer, 0.5);
        state.particles.ring(e.x, e.y, PALETTE.wardenRage, 170, 0.6);
        state.particles.burst(e.x, e.y, PALETTE.wardenRage, 34, 380, 0.6, 3.5);
        state.particles.floater(e.x, e.y - e.radius - 14, e.prime ? 'PRIME ENRAGED!' : 'WARDEN ENRAGED!', PALETTE.wardenRage, 20);
        state.sound.enrage();
      }
      steerTowards(e, player.x, player.y, dt, e.phase === 2 ? 1.9 : 1.4);
      e.vx = Math.cos(e.angle) * e.speed;
      e.vy = Math.sin(e.angle) * e.speed;
      e.burstTimer -= dt;
      if (e.burstTimer <= 0) {
        e.burstTimer = e.phase === 2 ? tune.rageBurstInterval : tune.burstInterval;
        const offset = Math.random() * Math.PI * 2;
        for (let i = 0; i < tune.burstCount; i += 1) {
          const a = offset + (i / tune.burstCount) * Math.PI * 2;
          bullets.push({
            x: e.x + Math.cos(a) * (e.radius + 4),
            y: e.y + Math.sin(a) * (e.radius + 4),
            vx: Math.cos(a) * tune.bulletSpeed,
            vy: Math.sin(a) * tune.bulletSpeed,
            radius: 7,
            life: 4,
          });
        }
        state.particles.ring(e.x, e.y, e.phase === 2 ? PALETTE.wardenRage : PALETTE.warden, 90, 0.45);
        state.sound.explosion(false);
      }
      if (e.phase === 2) {
        e.spiralTimer -= dt;
        if (e.spiralTimer <= 0) {
          e.spiralTimer = tune.spiralInterval;
          e.spiralAngle += 0.42;
          for (const side of [0, Math.PI]) {
            const a = e.spiralAngle + side;
            bullets.push({
              x: e.x + Math.cos(a) * (e.radius + 4),
              y: e.y + Math.sin(a) * (e.radius + 4),
              vx: Math.cos(a) * tune.spiralSpeed,
              vy: Math.sin(a) * tune.spiralSpeed,
              radius: 6,
              life: 4,
            });
          }
        }
      }
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.x = Math.max(ARENA_MARGIN + e.radius, Math.min(VIEW_W - ARENA_MARGIN - e.radius, e.x));
    e.y = Math.max(ARENA_MARGIN + e.radius, Math.min(VIEW_H - ARENA_MARGIN - e.radius, e.y));
  }
  separate(state.enemies, dt);
}

function polygon(ctx, x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawEnemy(ctx, e, time) {
  const enraged = e.type === 'warden' && e.phase === 2;
  const color = enraged ? PALETTE.wardenRage : ENEMY_COLORS[e.type];
  const core = enraged ? PALETTE.wardenRageCore : ENEMY_CORES[e.type];
  const fadeIn = Math.min(1, e.spawnAge / WAVES.spawnTelegraph);
  // A lancer about to charge shows its aim line: fair warning, readable aim.
  if (e.type === 'lancer' && e.chargeMode === 'aim' && fadeIn >= 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + Math.cos(e.angle) * 320, e.y + Math.sin(e.angle) * 320);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.75 * fadeIn;
  ctx.translate(e.x, e.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = enraged ? 26 : 16;
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(5, 8, 22, 0.85)';
  ctx.lineWidth = 2.5;
  if (e.type === 'chaser' || e.type === 'mini') {
    ctx.rotate(e.angle);
    ctx.beginPath();
    ctx.moveTo(e.radius + 4, 0);
    ctx.lineTo(-e.radius * 0.8, e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.4, 0);
    ctx.lineTo(-e.radius * 0.8, -e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.type === 'lancer') {
    // A long needle dart: unmistakable next to the chaser's arrowhead.
    ctx.rotate(e.angle);
    ctx.beginPath();
    ctx.moveTo(e.radius + 14, 0);
    ctx.lineTo(-e.radius * 0.4, e.radius * 0.55);
    ctx.lineTo(-e.radius * 0.9, e.radius * 0.95);
    ctx.lineTo(-e.radius * 0.55, 0);
    ctx.lineTo(-e.radius * 0.9, -e.radius * 0.95);
    ctx.lineTo(-e.radius * 0.4, -e.radius * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (e.chargeMode === 'charge') {
      ctx.strokeStyle = '#ecfccb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-e.radius, 0);
      ctx.lineTo(e.radius + 8, 0);
      ctx.stroke();
    }
  } else if (e.type === 'shooter') {
    ctx.rotate(e.angle + Math.PI / 4 + Math.sin(time * 2 + e.wobble) * 0.08);
    polygon(ctx, 0, 0, e.radius, 4, 0);
    ctx.fill();
    ctx.stroke();
  } else if (e.type === 'splitter') {
    ctx.rotate(time * 0.6 + e.wobble);
    polygon(ctx, 0, 0, e.radius, 6, 0);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-time * 1.2);
    polygon(ctx, 0, 0, e.radius * 0.55, 6, 0);
    ctx.stroke();
  } else if (e.type === 'warden') {
    const spin = enraged ? 0.9 : 0.35;
    ctx.rotate(time * spin);
    polygon(ctx, 0, 0, e.radius, 8, 0);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-time * spin * 2);
    polygon(ctx, 0, 0, e.radius * 0.62, 8, 0);
    ctx.stroke();
    if (enraged) {
      // Rage spikes: a jagged outer ring that spins against the hull.
      ctx.rotate(time * spin * 3);
      ctx.beginPath();
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const r = i % 2 === 0 ? e.radius + 12 : e.radius + 3;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    if (e.prime) {
      // The Prime wears a gold crown ring, so the final boss reads at once.
      ctx.rotate(0);
      ctx.strokeStyle = PALETTE.gold;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -time * 24;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.shadowBlur = 0;
  const pulse = 1 + Math.sin(time * 5 + e.wobble) * 0.15;
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : core;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(3, e.radius * 0.3 * pulse), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (e.hp < e.maxHp && e.type !== 'mini') {
    const w = e.radius * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 12, w, 4);
    ctx.fillStyle = color;
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 12, w * (e.hp / e.maxHp), 4);
    ctx.restore();
  }
}
