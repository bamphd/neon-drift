// All sound is synthesised with the Web Audio API: no audio files, no network.
// Short oscillator and filtered-noise blips, one small helper per sound.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.lastShoot = 0;
    try {
      this.muted = window.localStorage.getItem('neon-drift-muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const length = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem('neon-drift-muted', this.muted ? '1' : '0');
    } catch {
      // Storage unavailable: mute still applies for this session.
    }
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone({ type = 'sine', from = 440, to = null, duration = 0.1, volume = 0.4, delay = 0 }) {
    if (this.muted) return;
    if (!this.ensure()) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  noise({ duration = 0.2, volume = 0.4, filterFrom = 1200, filterTo = 200, delay = 0 }) {
    if (this.muted) return;
    if (!this.ensure()) return;
    const now = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrom, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterTo), now + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  shoot() {
    const now = performance.now();
    if (now - this.lastShoot < 45) return; // throttle: holding fire stays clean
    this.lastShoot = now;
    this.tone({ type: 'square', from: 880, to: 320, duration: 0.07, volume: 0.12 });
  }

  enemyHit() {
    this.tone({ type: 'triangle', from: 340, to: 180, duration: 0.06, volume: 0.2 });
  }

  explosion(big = false) {
    this.noise({ duration: big ? 0.55 : 0.28, volume: big ? 0.55 : 0.32, filterFrom: 2400, filterTo: 90 });
    this.tone({ type: 'sine', from: big ? 160 : 220, to: 40, duration: big ? 0.5 : 0.25, volume: 0.4 });
  }

  playerHit() {
    this.noise({ duration: 0.22, volume: 0.4, filterFrom: 1600, filterTo: 120 });
    this.tone({ type: 'sawtooth', from: 220, to: 60, duration: 0.22, volume: 0.3 });
  }

  dash() {
    this.noise({ duration: 0.16, volume: 0.18, filterFrom: 3200, filterTo: 700 });
  }

  pickup() {
    this.tone({ type: 'sine', from: 1040, to: 1560, duration: 0.09, volume: 0.22 });
  }

  heart() {
    this.tone({ type: 'sine', from: 520, duration: 0.12, volume: 0.3 });
    this.tone({ type: 'sine', from: 780, duration: 0.16, volume: 0.3, delay: 0.09 });
  }

  upgrade() {
    this.tone({ type: 'triangle', from: 523, duration: 0.11, volume: 0.3 });
    this.tone({ type: 'triangle', from: 659, duration: 0.11, volume: 0.3, delay: 0.08 });
    this.tone({ type: 'triangle', from: 784, duration: 0.18, volume: 0.32, delay: 0.16 });
  }

  waveStart() {
    this.tone({ type: 'sawtooth', from: 140, to: 520, duration: 0.35, volume: 0.2 });
    this.tone({ type: 'sine', from: 280, to: 1040, duration: 0.35, volume: 0.16, delay: 0.05 });
  }

  gameOver() {
    this.tone({ type: 'sawtooth', from: 320, to: 50, duration: 0.9, volume: 0.3 });
    this.tone({ type: 'sine', from: 160, to: 30, duration: 1.1, volume: 0.3, delay: 0.1 });
  }

  uiClick() {
    this.tone({ type: 'sine', from: 660, to: 880, duration: 0.06, volume: 0.2 });
  }
}
