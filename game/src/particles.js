// Particles, shockwave rings and floating score text: all the juice that
// makes hits, deaths and pickups feel like something happened.

import { JUICE } from './config.js';

export class Particles {
  constructor() {
    this.sparks = [];
    this.rings = [];
    this.floaters = [];
  }

  burst(x, y, color, count = 14, speed = 260, life = 0.55, size = 3) {
    for (let i = 0; i < count; i += 1) {
      if (this.sparks.length >= JUICE.maxParticles) return;
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.9);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 3.2,
      });
    }
  }

  trail(x, y, color, size = 2.5) {
    if (this.sparks.length >= JUICE.maxParticles) return;
    this.sparks.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      life: 0.3,
      maxLife: 0.3,
      size,
      color,
      drag: 1.5,
    });
  }

  ring(x, y, color, maxRadius = 70, life = 0.4) {
    this.rings.push({ x, y, color, maxRadius, life, maxLife: life, width: 3 });
  }

  floater(x, y, text, color = '#e0f2fe', size = 16) {
    if (this.floaters.length >= JUICE.maxFloaters) this.floaters.shift();
    this.floaters.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
  }

  update(dt) {
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const p = this.sparks[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      const drag = 1 - Math.min(1, p.drag * dt);
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.life -= dt;
      f.y -= 46 * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.sparks) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    for (const r of this.rings) {
      const t = 1 - r.life / r.maxLife;
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.maxRadius * t + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      const alpha = Math.max(0, f.life / f.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${f.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  clear() {
    this.sparks.length = 0;
    this.rings.length = 0;
    this.floaters.length = 0;
  }
}
