// Neon Drift boot: canvas, input, sound, the fixed-step loop, and the
// screenshot mode (?shot=start|action|upgrade|over&seed=n). The loop runs the
// simulation at 60 fixed steps a second and renders every animation frame.

import { Input } from './input.js';
import { Sound } from './audio.js';
import { Game } from './game.js';
import { setupShot } from './shots.js';

const STEP = 1 / 60;

function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const input = new Input(canvas);
  const sound = new Sound();
  const game = new Game(input, sound);

  // Test and automation hook: the live game object, read-only for scripts.
  window.__neon = game;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') game.state = 'paused';
  });

  const params = new URLSearchParams(window.location.search);
  const shotKind = params.get('shot');
  const seed = Number(params.get('seed') || 1337);
  // In shot mode the simulation runs only inside setupShot's fixed staging
  // steps, then freezes: the capture shows exactly the composed scene, no
  // matter how long the screenshot script takes to fire.
  const live = !shotKind;
  let shotReady = false;
  if (shotKind) {
    sound.muted = true; // screenshots never need audio
    if (setupShot(game, shotKind, seed)) {
      // Let two frames render the staged scene, then flag readiness.
      let frames = 0;
      const readyTimer = setInterval(() => {
        frames += 1;
        if (frames >= 2) {
          window.__shotReady = true;
          shotReady = true;
          clearInterval(readyTimer);
        }
      }, 16);
    }
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (live) {
      acc += elapsed;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        game.step(STEP);
        input.endStep();
        acc -= STEP;
        steps += 1;
      }
      if (steps === 5) acc = 0;
    }
    game.render(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return shotReady;
}

main();
