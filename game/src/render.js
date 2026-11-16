// Everything drawn on the canvas: the prerendered neon backdrop, the world,
// the HUD, and every menu screen. Layout rectangles are exported so the game
// logic can hit-test the same buttons the renderer draws.

import { ARENA_MARGIN, PALETTE, VIEW_H, VIEW_W } from './config.js';
import { RNG } from './random.js';
import { drawEnemy } from './enemies.js';
import { drawPlayer } from './player.js';

export const LAYOUT = {
  startButton: { x: 490, y: 478, w: 300, h: 62 },
  restartButton: { x: 490, y: 556, w: 300, h: 60 },
  resumeButton: { x: 490, y: 392, w: 300, h: 56 },
  pauseRestartButton: { x: 490, y: 460, w: 300, h: 56 },
  muteButton: { x: 1220, y: 676, w: 46, h: 30 },
  cards: { w: 300, h: 296, gap: 28, y: 216 },
};

export function cardRect(index) {
  const total = LAYOUT.cards.w * 3 + LAYOUT.cards.gap * 2;
  const startX = (VIEW_W - total) / 2;
  return {
    x: startX + index * (LAYOUT.cards.w + LAYOUT.cards.gap),
    y: LAYOUT.cards.y,
    w: LAYOUT.cards.w,
    h: LAYOUT.cards.h,
  };
}

const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The backdrop is painted once onto an offscreen canvas: gradient, nebula
// glows, starfield and grid. A fixed seed keeps it identical every load.
let backdrop = null;
function getBackdrop() {
  if (backdrop) return backdrop;
  const rng = new RNG(42);
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#070b24');
  grad.addColorStop(0.55, PALETTE.background);
  grad.addColorStop(1, '#03040f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const nebulae = [
    { x: 240, y: 160, r: 320, color: 'rgba(56, 120, 255, 0.14)' },
    { x: 1040, y: 520, r: 360, color: 'rgba(168, 85, 247, 0.10)' },
    { x: 900, y: 120, r: 240, color: 'rgba(34, 211, 238, 0.08)' },
    { x: 180, y: 580, r: 260, color: 'rgba(244, 63, 94, 0.06)' },
  ];
  for (const n of nebulae) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  for (let i = 0; i < 190; i += 1) {
    const x = rng.range(0, VIEW_W);
    const y = rng.range(0, VIEW_H);
    const s = rng.range(0.6, 2.1);
    ctx.globalAlpha = rng.range(0.25, 0.9);
    ctx.fillStyle = rng.chance(0.75) ? '#bae6fd' : '#f0abfc';
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  for (let x = ARENA_MARGIN; x <= VIEW_W - ARENA_MARGIN; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, ARENA_MARGIN);
    ctx.lineTo(x, VIEW_H - ARENA_MARGIN);
    ctx.stroke();
  }
  for (let y = ARENA_MARGIN; y <= VIEW_H - ARENA_MARGIN; y += 64) {
    ctx.beginPath();
    ctx.moveTo(ARENA_MARGIN, y);
    ctx.lineTo(VIEW_W - ARENA_MARGIN, y);
    ctx.stroke();
  }
  backdrop = canvas;
  return backdrop;
}

function drawArenaBorder(ctx, time) {
  const pulse = 0.55 + Math.sin(time * 1.6) * 0.15;
  ctx.save();
  ctx.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
  ctx.shadowColor = PALETTE.wall;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2.5;
  roundRect(ctx, ARENA_MARGIN - 8, ARENA_MARGIN - 8, VIEW_W - 2 * ARENA_MARGIN + 16, VIEW_H - 2 * ARENA_MARGIN + 16, 14);
  ctx.stroke();
  ctx.restore();
}

function drawHeartShape(ctx, x, y, size, fill, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 9, -3, 0, 5);
  ctx.closePath();
  if (glow) {
    ctx.shadowColor = PALETTE.heart;
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawButton(ctx, rect, label, hovered, sub = '') {
  ctx.save();
  ctx.shadowColor = hovered ? PALETTE.player : 'rgba(56, 189, 248, 0.4)';
  ctx.shadowBlur = hovered ? 22 : 10;
  ctx.fillStyle = hovered ? 'rgba(14, 42, 68, 0.95)' : 'rgba(8, 24, 44, 0.9)';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hovered ? '#a5f3fc' : PALETTE.wall;
  ctx.lineWidth = 2;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.stroke();
  ctx.fillStyle = hovered ? '#ffffff' : PALETTE.text;
  ctx.font = `700 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + (sub ? -8 : 0));
  if (sub) {
    ctx.font = `500 13px ${FONT}`;
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 20);
  }
  ctx.restore();
}

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function drawWorld(ctx, state, time) {
  ctx.drawImage(getBackdrop(), 0, 0);
  drawArenaBorder(ctx, time);
  // Pickups.
  for (const pk of state.pickups) {
    const bob = Math.sin(time * 4 + pk.age * 3) * 2;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    if (pk.kind === 'cell') {
      ctx.shadowColor = PALETTE.pickup;
      ctx.shadowBlur = 12;
      ctx.fillStyle = PALETTE.pickup;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ecfdf5';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawHeartShape(ctx, 0, 0, 13, PALETTE.heart, true);
    }
    ctx.restore();
  }
  // Enemy bullets (under enemies).
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of state.enemyBullets) {
    ctx.shadowColor = PALETTE.enemyBullet;
    ctx.shadowBlur = 12;
    ctx.fillStyle = PALETTE.enemyBullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff1f2';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  for (const e of state.enemies) drawEnemy(ctx, e, time);
  // Player bullets.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of state.bullets) {
    const angle = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    ctx.shadowColor = PALETTE.bullet;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.bullet;
    roundRect(ctx, -11, -3, 22, 6, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.bulletHot;
    roundRect(ctx, -5, -1.5, 12, 3, 1.5);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // Muzzle glow.
  if (state.muzzle > 0 && state.player.alive) {
    const p = state.player;
    const nx = p.x + Math.cos(p.angle) * (p.radius + 10);
    const ny = p.y + Math.sin(p.angle) * (p.radius + 10);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 22);
    g.addColorStop(0, 'rgba(165, 243, 252, 0.9)');
    g.addColorStop(1, 'rgba(165, 243, 252, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(nx, ny, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawPlayer(ctx, state.player, time);
  // Shield ring.
  if (state.shields > 0 && state.player.alive) {
    const p = state.player;
    ctx.save();
    ctx.strokeStyle = `rgba(147, 197, 253, ${0.5 + Math.sin(time * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -time * 30;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  state.particles.draw(ctx);
}

export function drawHUD(ctx, state, time) {
  const p = state.player;
  ctx.save();
  // Hearts, top-left.
  for (let i = 0; i < state.mods.maxHearts; i += 1) {
    const filled = i < p.hearts;
    drawHeartShape(ctx, 52 + i * 32, 40, 15, filled ? PALETTE.heart : PALETTE.heartEmpty, filled);
  }
  // Shield pips under the hearts.
  for (let i = 0; i < state.shields; i += 1) {
    ctx.save();
    ctx.translate(52 + i * 24, 66);
    ctx.fillStyle = PALETTE.shield;
    ctx.shadowColor = PALETTE.shield;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
      if (k === 0) ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      else ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Wave, top-center.
  ctx.textAlign = 'center';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.shadowColor = PALETTE.wall;
  ctx.shadowBlur = 10;
  ctx.fillText(`WAVE ${state.wave}`, VIEW_W / 2, 42);
  ctx.shadowBlur = 0;
  ctx.font = `500 13px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  const remaining = state.enemies.length + state.spawnQueue.length;
  ctx.fillText(remaining > 0 ? `${remaining} HOSTILES LEFT` : 'CLEAR THE WAVE', VIEW_W / 2, 62);
  // Warden health bar.
  const warden = state.enemies.find((e) => e.type === 'warden');
  if (warden) {
    const w = 420;
    const x = VIEW_W / 2 - w / 2;
    const y = 72;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    roundRect(ctx, x, y, w, 10, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.warden;
    ctx.shadowColor = PALETTE.warden;
    ctx.shadowBlur = 10;
    if (warden.hp > 0) {
      roundRect(ctx, x, y, w * (warden.hp / warden.maxHp), 10, 5);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = PALETTE.warden;
    ctx.fillText('WARDEN', VIEW_W / 2, y + 26);
  }
  // Score + combo, top-right.
  ctx.textAlign = 'right';
  ctx.font = `500 13px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('SCORE', VIEW_W - 44, 28);
  ctx.font = `700 30px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(state.score).padStart(6, '0'), VIEW_W - 44, 58);
  if (state.comboKills > 0) {
    const pop = 1 + state.comboPop * 0.5;
    ctx.save();
    ctx.translate(VIEW_W - 44, 84);
    ctx.scale(pop, pop);
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = state.comboMult >= 4 ? PALETTE.gold : PALETTE.text;
    ctx.fillText(`COMBO x${state.comboMult}  (${state.comboKills})`, 0, 0);
    ctx.restore();
  }
  // Dash cooldown, bottom-left.
  const dashFrac = 1 - p.dashCooldownLeft / state.mods.dashCooldown;
  ctx.textAlign = 'left';
  ctx.font = `700 13px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('DASH  [SPACE]', 44, 676);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  roundRect(ctx, 44, 684, 150, 10, 5);
  ctx.fill();
  if (dashFrac >= 1) {
    ctx.fillStyle = PALETTE.player;
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 10;
    roundRect(ctx, 44, 684, 150, 10, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.player;
    ctx.fillText('READY', 202, 693);
  } else {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.55)';
    roundRect(ctx, 44, 684, 150 * dashFrac, 10, 5);
    ctx.fill();
  }
  // Owned upgrade glyphs, bottom-right.
  const glyphs = state.upgradeGlyphs;
  ctx.textAlign = 'center';
  for (let i = 0; i < glyphs.length; i += 1) {
    const x = VIEW_W - 76 - i * 32;
    ctx.fillStyle = 'rgba(8, 24, 44, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - 13, 672, 26, 26, 6);
    ctx.fill();
    ctx.stroke();
    ctx.font = `700 15px ${FONT}`;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(glyphs[glyphs.length - 1 - i], x, 691);
  }
  // Mute button, bottom-right corner.
  drawMuteButton(ctx, state);
  // Low-health warning: a pulsing red edge when one heart is left.
  if (state.state === 'playing' && p.alive && p.hearts === 1) {
    const pulse = 0.1 + 0.07 * Math.sin(time * 4);
    ctx.strokeStyle = `rgba(251, 113, 133, ${pulse + 0.12})`;
    ctx.lineWidth = 5;
    ctx.shadowColor = PALETTE.danger;
    ctx.shadowBlur = 18;
    roundRect(ctx, ARENA_MARGIN - 8, ARENA_MARGIN - 8, VIEW_W - 2 * ARENA_MARGIN + 16, VIEW_H - 2 * ARENA_MARGIN + 16, 14);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

export function drawMuteButton(ctx, state) {
  const m = LAYOUT.muteButton;
  const hovered = pointIn(m, state.input.mouseX, state.input.mouseY);
  ctx.save();
  ctx.fillStyle = hovered ? 'rgba(14, 42, 68, 0.95)' : 'rgba(8, 24, 44, 0.85)';
  roundRect(ctx, m.x, m.y, m.w, m.h, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, m.x, m.y, m.w, m.h, 7);
  ctx.stroke();
  ctx.font = `700 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(state.sound.muted ? 'MUTED' : 'SOUND', m.x + m.w / 2, m.y + m.h / 2 + 5);
  ctx.restore();
}

export function drawWaveBanner(ctx, state) {
  if (state.bannerLeft <= 0) return;
  const t = state.bannerAge;
  const alpha = state.bannerLeft < 0.4 ? state.bannerLeft / 0.4 : 1;
  const slide = Math.max(0, 1 - t * 3) * 40;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = `800 64px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = PALETTE.player;
  ctx.shadowBlur = 26;
  ctx.fillText(state.wave % 5 === 0 ? `WAVE ${state.wave} — WARDEN` : `WAVE ${state.wave}`, VIEW_W / 2, 250 + slide);
  ctx.shadowBlur = 0;
  ctx.font = `500 18px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(state.wave === 1 ? 'Survive the swarm. Good luck, pilot.' : 'Hostiles inbound.', VIEW_W / 2, 288 + slide);
  ctx.restore();
}

function dimScreen(ctx, alpha) {
  ctx.fillStyle = `rgba(2, 3, 10, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawTitle(ctx, state, time) {
  ctx.drawImage(getBackdrop(), 0, 0);
  drawArenaBorder(ctx, time);
  // Drifting decorative shapes behind the title.
  ctx.save();
  for (let i = 0; i < 5; i += 1) {
    const a = time * 0.12 + (i / 5) * Math.PI * 2;
    const x = VIEW_W / 2 + Math.cos(a) * 430;
    const y = 330 + Math.sin(a * 1.3) * 170;
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = i % 2 === 0 ? PALETTE.chaser : PALETTE.shooter;
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 16 + (i % 3) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  state.particles.draw(ctx);
  ctx.save();
  ctx.textAlign = 'center';
  try {
    ctx.letterSpacing = '10px';
  } catch {
    // letterSpacing is a Chromium nicety; ignore where unsupported.
  }
  ctx.font = `800 92px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = PALETTE.player;
  ctx.shadowBlur = 34;
  ctx.fillText('NEON DRIFT', VIEW_W / 2, 218);
  try {
    ctx.letterSpacing = '6px';
  } catch {
    // ignore
  }
  ctx.font = `600 20px ${FONT}`;
  ctx.shadowColor = PALETTE.chaserCore;
  ctx.shadowBlur = 14;
  ctx.fillStyle = PALETTE.chaser;
  ctx.fillText('A NEON ARENA SURVIVAL GAME', VIEW_W / 2, 262);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // ignore
  }
  ctx.shadowBlur = 0;
  // Controls panel.
  const panel = { x: 390, y: 300, w: 500, h: 148 };
  ctx.fillStyle = 'rgba(8, 24, 44, 0.72)';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.stroke();
  ctx.font = `500 17px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  const lines = [
    ['WASD / ARROWS', 'Move your skiff'],
    ['MOUSE', 'Aim  —  hold click to fire'],
    ['SPACE / SHIFT', 'Dash (briefly invulnerable)'],
    ['P  /  M', 'Pause  /  mute sound'],
  ];
  lines.forEach((line, i) => {
    const y = panel.y + 36 + i * 32;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(line[0], VIEW_W / 2 - 12, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(line[1], VIEW_W / 2 + 12, y);
  });
  ctx.restore();
  const hovered = pointIn(LAYOUT.startButton, state.input.mouseX, state.input.mouseY);
  drawButton(ctx, LAYOUT.startButton, '▶  START', hovered, 'or press ENTER');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `500 14px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  if (state.best > 0) ctx.fillText(`BEST SCORE  ${String(state.best).padStart(6, '0')}`, VIEW_W / 2, 580);
  ctx.fillText('Clear waves, pick upgrades, survive the Warden. An original game — all art procedural, all sound synthesised.', VIEW_W / 2, 668);
  ctx.restore();
}

export function drawUpgradeChoice(ctx, state) {
  dimScreen(ctx, 0.62);
  const age = state.upgradeAge;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 44px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = 20;
  ctx.fillText(`WAVE ${state.wave} CLEARED!`, VIEW_W / 2, 118);
  ctx.shadowBlur = 0;
  ctx.font = `500 19px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Choose an upgrade to take into the next wave.', VIEW_W / 2, 152);
  ctx.restore();
  state.choices.forEach((upgrade, i) => {
    const rect = cardRect(i);
    const delay = i * 0.09;
    const t = Math.max(0, Math.min(1, (age - delay) / 0.3));
    const rise = (1 - t) * 26;
    const hovered = pointIn(rect, state.input.mouseX, state.input.mouseY);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.translate(0, rise);
    ctx.shadowColor = hovered ? PALETTE.gold : 'rgba(56, 189, 248, 0.35)';
    ctx.shadowBlur = hovered ? 26 : 12;
    ctx.fillStyle = hovered ? 'rgba(20, 34, 64, 0.96)' : 'rgba(8, 24, 44, 0.92)';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hovered ? PALETTE.gold : 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `700 54px ${FONT}`;
    ctx.fillText(upgrade.glyph, rect.x + rect.w / 2, rect.y + 84);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(upgrade.name, rect.x + rect.w / 2, rect.y + 132);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `500 16px ${FONT}`;
    wrapText(ctx, upgrade.desc, rect.x + 26, rect.y + 164, rect.w - 52, 23);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(`PRESS ${i + 1}  OR CLICK`, rect.x + rect.w / 2, rect.y + rect.h - 24);
    ctx.restore();
  });
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `500 14px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Score ${String(state.score).padStart(6, '0')}  ·  Hearts ${state.player.hearts}/${state.mods.maxHearts}`, VIEW_W / 2, 560);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x + maxWidth / 2, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x + maxWidth / 2, yy);
}

export function drawGameOver(ctx, state) {
  dimScreen(ctx, 0.66);
  const t = Math.min(1, state.overAge / 0.45);
  const rise = (1 - t) * 30;
  ctx.save();
  ctx.globalAlpha = t;
  ctx.translate(0, rise);
  ctx.textAlign = 'center';
  ctx.font = `800 62px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = PALETTE.danger;
  ctx.shadowBlur = 28;
  ctx.fillText('GAME OVER', VIEW_W / 2, 168);
  ctx.shadowBlur = 0;
  if (state.newBest) {
    ctx.font = `700 19px ${FONT}`;
    ctx.fillStyle = PALETTE.gold;
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 14;
    ctx.fillText('★ NEW BEST SCORE ★', VIEW_W / 2, 202);
    ctx.shadowBlur = 0;
  }
  const stats = [
    ['FINAL SCORE', String(state.score).padStart(6, '0')],
    ['BEST', String(state.best).padStart(6, '0')],
    ['WAVES SURVIVED', String(state.wave)],
    ['KILLS', String(state.kills)],
    ['MAX COMBO', `x${state.maxComboMult}`],
    ['TIME', formatTime(state.runTime)],
  ];
  const panel = { x: 340, y: 228, w: 600, h: 196 };
  ctx.fillStyle = 'rgba(8, 24, 44, 0.9)';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.stroke();
  stats.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = panel.x + 60 + col * 300;
    const y = panel.y + 46 + row * 56;
    ctx.textAlign = 'left';
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(label, x, y);
    ctx.font = `700 26px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, x, y + 28);
  });
  ctx.restore();
  const hovered = pointIn(LAYOUT.restartButton, state.input.mouseX, state.input.mouseY);
  drawButton(ctx, LAYOUT.restartButton, '↻  RESTART', hovered, 'or press R');
}

export function drawPaused(ctx, state) {
  dimScreen(ctx, 0.6);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 52px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = PALETTE.player;
  ctx.shadowBlur = 22;
  ctx.fillText('PAUSED', VIEW_W / 2, 300);
  ctx.shadowBlur = 0;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Wave ${state.wave}  ·  Score ${String(state.score).padStart(6, '0')}`, VIEW_W / 2, 336);
  ctx.restore();
  const resumeHovered = pointIn(LAYOUT.resumeButton, state.input.mouseX, state.input.mouseY);
  drawButton(ctx, LAYOUT.resumeButton, 'RESUME', resumeHovered, 'or press P');
  const restartHovered = pointIn(LAYOUT.pauseRestartButton, state.input.mouseX, state.input.mouseY);
  drawButton(ctx, LAYOUT.pauseRestartButton, 'RESTART RUN', restartHovered, '');
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export { pointIn };
