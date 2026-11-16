# Neon Drift

An original 2D canvas arena survival game. You pilot a small neon skiff in a
dark arena: dodge the swarm, aim with the mouse, dash through danger, clear
waves, and pick upgrades between them. Every fifth wave brings the Warden, a
large slow mini-boss with a radial bullet burst. All art is procedural canvas
shapes and all sound is synthesised with the Web Audio API — no image files,
no audio files, no network, no libraries.

## How to play

- **WASD / arrow keys** — move
- **Mouse** — aim; **hold click** — fire
- **Space / Shift** — dash (a short burst, briefly invulnerable)
- **P / Esc** — pause, **M** — mute, **R** — restart after game over
- **1 / 2 / 3 or click** — pick an upgrade when a wave clears

Kills build a combo multiplier (up to x5) that resets when you take damage.
Enemies drop energy cells worth score; splitters and the Warden sometimes
drop a heart. Shields from the Aegis upgrade block one hit each and refill
every wave. Your best score is kept in the browser.

## Structure

The game's own source is split into files with one clear job each:

- `game/index.html` — page shell and canvas
- `game/src/config.js` — palette and every tuning number
- `game/src/random.js` — seeded RNG for reproducible runs
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — synthesised Web Audio sound effects
- `game/src/particles.js` — particles, shockwaves, floating score text
- `game/src/enemies.js` — enemy types, wave composition and AI
- `game/src/upgrades.js` — the upgrade pool and wave-clear choices
- `game/src/player.js` — the skiff: movement, dash and firing
- `game/src/render.js` — backdrop, world, HUD and menu screens
- `game/src/game.js` — state machine, waves, collisions and scoring
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/main.js` — boot and the fixed-step loop

`main.ts` hands the game in: it copies `game/` and `screenshots/` to the
output directory and writes `dossier.json` with the kit's vendored
`vendor/makefun-game.ts` library.

## Play it locally

Serve `game/` with any static file server and open `index.html` in desktop
Chrome, for example:

```sh
cd game && python3 -m http.server 8080
```

Screenshot mode (used to capture this entry's screenshots) stages a scene
from the game's own code: `index.html?shot=start|action|upgrade|over&seed=1337`
and sets `window.__shotReady` once the scene has settled.

## Build notes

- Fixed 60 Hz simulation with an accumulator, rendered every animation frame.
- Deterministic from a seed: wave composition, spawns and upgrade rolls all
  go through the seeded RNG.
- The dossier text stays well under the 160 KiB cap; the four screenshots
  are 1280x720 JPEGs under 256 KiB each.
- Tested end to end in headless Chromium: start, move, shoot, dash, clear a
  wave, pick an upgrade, take damage, die, restart, pause and resume — with
  zero console errors.

## License

MIT — see `LICENSE`.
