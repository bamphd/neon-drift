// Enemy types, wave composition, movement AI and drawing. Each type has one
// clear behaviour: chasers hunt, shooters keep range and fire, splitters are
// slow walls that burst into minis, and the warden is the wave-5 boss.

import { ARENA_MARGIN, ENEMIES, PALETTE, VIEW_H, VIEW_W, WAVES } from './config.js';

export const ENEMY_COLORS = {
  chaser: PALETTE.chaser,
  shooter: PALETTE.shooter,
  splitter: PALETTE.splitter,
  mini: PALETTE.mini,
  warden: PALETTE.warden,
};

export const ENEMY_CORES = {
  chaser: PALETTE.chaserCore,
  shooter: PALETTE.shooterCore,
  splitter: PALETTE.splitterCore,
  mini: PALETTE.mini,
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
  };
}

// Which types a wave fields. Early waves teach one type at a time; later
// waves mix all three, and every 5th wave is a warden plus escorts.
export function waveComposition(wave, rng) {
  const list = [];
  if (wave % WAVES.bossEvery === 0) {
    list.push('warden');
    const escorts = 2 + Math.floor(wave / WAVES.bossEvery);
    for (let i = 0; i < escorts; i += 1) list.push(rng.chance(0.6) ? 'chaser' : 'shooter');
    return list;
  }
  const count = Math.min(WAVES.maxAlive, WAVES.baseCount + WAVES.perWave * (wave - 1));
  for (let i = 0; i < count; i += 1) {
    const roll = rng.next();
    if (wave === 1) list.push('chaser');
    else if (wave === 2) list.push(roll < 0.7 ? 'chaser' : 'shooter');
    else if (roll < 0.45) list.push('chaser');
    else if (roll < 0.72) list.push('shooter');
    else list.push('splitter');
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
    } else if (e.type === 'warden') {
      steerTowards(e, player.x, player.y, dt, 1.4);
      e.vx = Math.cos(e.angle) * e.speed;
      e.vy = Math.sin(e.angle) * e.speed;
      e.burstTimer -= dt;
      if (e.burstTimer <= 0) {
        e.burstTimer = ENEMIES.warden.burstInterval;
        const offset = Math.random() * Math.PI * 2;
        for (let i = 0; i < ENEMIES.warden.burstCount; i += 1) {
          const a = offset + (i / ENEMIES.warden.burstCount) * Math.PI * 2;
          bullets.push({
            x: e.x + Math.cos(a) * (e.radius + 4),
            y: e.y + Math.sin(a) * (e.radius + 4),
            vx: Math.cos(a) * ENEMIES.warden.bulletSpeed,
            vy: Math.sin(a) * ENEMIES.warden.bulletSpeed,
            radius: 7,
            life: 4,
          });
        }
        state.particles.ring(e.x, e.y, PALETTE.warden, 90, 0.45);
        state.sound.explosion(false);
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
  const color = ENEMY_COLORS[e.type];
  const core = ENEMY_CORES[e.type];
  const fadeIn = Math.min(1, e.spawnAge / WAVES.spawnTelegraph);
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.75 * fadeIn;
  ctx.translate(e.x, e.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
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
    ctx.rotate(time * 0.35);
    polygon(ctx, 0, 0, e.radius, 8, 0);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-time * 0.7);
    polygon(ctx, 0, 0, e.radius * 0.62, 8, 0);
    ctx.stroke();
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
