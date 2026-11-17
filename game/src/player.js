// The player skiff: movement, dash with invulnerability, and firing. The
// update step reads input; the draw step renders the ship, its aim line and
// its dash trail. Orbit drones live here too: their slots are computed from
// the skiff's position so the renderer and the simulation always agree.

import { ARENA_MARGIN, DRONE, PALETTE, PLAYER, VIEW_H, VIEW_W } from './config.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hearts: PLAYER.maxHearts,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldownLeft: 0,
    dashDirX: 1,
    dashDirY: 0,
    invulnLeft: 0,
    thrust: 0,
    alive: true,
  };
}

export function updatePlayer(state, dt) {
  const p = state.player;
  const input = state.input;
  const mods = state.mods;
  if (!p.alive) return;

  p.fireTimer -= dt;
  p.dashCooldownLeft = Math.max(0, p.dashCooldownLeft - dt);
  p.invulnLeft = Math.max(0, p.invulnLeft - dt);
  p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

  const dashing = p.dashTimer > 0;
  if (dashing) {
    p.dashTimer -= dt;
    p.vx = p.dashDirX * PLAYER.dashSpeed;
    p.vy = p.dashDirY * PLAYER.dashSpeed;
    state.particles.trail(p.x, p.y, PALETTE.player, 3);
    if (p.dashTimer <= 0) {
      p.vx *= 0.35;
      p.vy *= 0.35;
    }
  } else {
    const axis = input.axis();
    const maxSpeed = PLAYER.maxSpeed * mods.speed;
    p.vx += axis.x * PLAYER.accel * dt;
    p.vy += axis.y * PLAYER.accel * dt;
    const friction = 1 - Math.min(1, PLAYER.friction * dt);
    if (axis.x === 0) p.vx *= friction;
    if (axis.y === 0) p.vy *= friction;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
    }
    p.thrust = Math.min(1, speed / maxSpeed);
    if (input.dashPressed() && p.dashCooldownLeft <= 0) {
      let dx = axis.x;
      let dy = axis.y;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(p.angle);
        dy = Math.sin(p.angle);
      }
      const len = Math.hypot(dx, dy) || 1;
      p.dashDirX = dx / len;
      p.dashDirY = dy / len;
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldownLeft = mods.dashCooldown;
      p.invulnLeft = Math.max(p.invulnLeft, PLAYER.dashInvuln);
      state.particles.ring(p.x, p.y, PALETTE.player, 46, 0.3);
      state.sound.dash();
      if (mods.novaDash > 0) state.detonateNova(p.x, p.y, mods.novaDash);
    }
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(ARENA_MARGIN + p.radius, Math.min(VIEW_W - ARENA_MARGIN - p.radius, p.x));
  p.y = Math.max(ARENA_MARGIN + p.radius, Math.min(VIEW_H - ARENA_MARGIN - p.radius, p.y));

  if (input.mouseDown && p.fireTimer <= 0) {
    p.fireTimer = PLAYER.fireInterval / mods.fireRate;
    const count = mods.projectiles;
    const spread = 0.09;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spread;
      const a = p.angle + offset;
      const nose = p.radius + 8;
      state.bullets.push({
        x: p.x + Math.cos(a) * nose,
        y: p.y + Math.sin(a) * nose,
        vx: Math.cos(a) * PLAYER.bulletSpeed,
        vy: Math.sin(a) * PLAYER.bulletSpeed,
        radius: PLAYER.bulletRadius,
        damage: mods.damage,
        life: PLAYER.bulletLife,
        pierce: mods.pierce,
        struck: null, // enemies this bolt already hit, so it never hits one twice
      });
    }
    state.muzzle = 0.06;
    state.sound.shoot();
  }
}

export function drawPlayer(ctx, p, time) {
  if (!p.alive) return;
  const blink = p.invulnLeft > 0 && p.dashTimer <= 0 && Math.floor(time * 18) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.35;
  ctx.rotate(p.angle);
  // Engine glow, brighter with thrust.
  const flame = 10 + p.thrust * 12 + Math.sin(time * 30) * 3;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(-p.radius, 0, 0, -p.radius, 0, flame + 10);
  grad.addColorStop(0, 'rgba(34, 211, 238, 0.8)');
  grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(-p.radius - 4, 0, flame + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Hull: a swept dart.
  ctx.shadowColor = PALETTE.player;
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(8, 20, 40, 0.95)';
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.radius + 8, 0);
  ctx.lineTo(-p.radius * 0.7, p.radius * 0.85);
  ctx.lineTo(-p.radius * 0.35, 0);
  ctx.lineTo(-p.radius * 0.7, -p.radius * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Cockpit core.
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Orbit slots for the skiff's drones: evenly spaced on a ring around the
// player, rotating with the run's drone angle.
export function droneSlots(player, count, angle) {
  const slots = [];
  for (let i = 0; i < count; i += 1) {
    const a = angle + (i / Math.max(1, count)) * Math.PI * 2;
    slots.push({
      x: player.x + Math.cos(a) * DRONE.orbitRadius,
      y: player.y + Math.sin(a) * DRONE.orbitRadius,
    });
  }
  return slots;
}

// A drone: a small glowing satellite with a spinning ring.
export function drawDrone(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = PALETTE.drone;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = PALETTE.drone;
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(8, 20, 40, 0.95)';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.rotate(time * 4);
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.7)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ecfeff';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
