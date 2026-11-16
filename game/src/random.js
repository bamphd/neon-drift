// Small seeded RNG (mulberry32) so screenshot mode and play sessions can be
// reproduced exactly from a seed. Gameplay randomness goes through here;
// purely cosmetic jitter may use Math.random.

export class RNG {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  reseed(seed) {
    this.state = seed >>> 0;
  }

  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  chance(p) {
    return this.next() < p;
  }

  angle() {
    return this.next() * Math.PI * 2;
  }

  // Fisher-Yates shuffle, in place, driven by this RNG.
  shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }
}
