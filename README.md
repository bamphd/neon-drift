# neon-drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bamphd/neon-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bamphd/neon-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

NEON DRIFT is an original 2D canvas arena survival game. You pilot a small
neon skiff through 10 waves in a dark arena: dodge the swarm, aim with the
mouse, dash through danger, and pick upgrades between waves. Chasers hunt
you, shooters hold range, splitters burst into minis, and lancers telegraph
a charging dash. Every fifth wave brings the Warden, a slow mini-boss that
turns enraged at half health and adds a rotating bullet spiral. The tenth
wave is the Warden Prime — defeat it to clear the sector and win the run.
All art is procedural canvas shapes and all sound is synthesised with the
Web Audio API: no image files, no audio files, no network, no libraries.

## Run it

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080/index.html in desktop Chrome.

## How to play

- **WASD / arrow keys** — move
- **Mouse** — aim; **hold click** — fire
- **Space / Shift** — dash (a short burst, briefly invulnerable)
- **P / Esc** — pause, **M** — mute, **R** — restart after game over or victory
- **1 / 2 / 3 or click** — pick an upgrade when a wave clears

Kills build a combo multiplier (up to x5) that drains after a few seconds
without a kill and resets when you take damage. Enemies drop energy cells
worth score; splitters and wardens sometimes drop a heart. Shields from the
Aegis upgrade block one hit each and refill every wave. The upgrade pool
holds twelve choices, including Lance Rounds that punch through enemies, a
Nova Dash shockwave, an Orbit Drone that fires on its own, and a Second
Wind revive. Your best score is kept in the browser.

## Structure

The game's own source is split into files with one clear job each:

- `game/index.html` — page shell and canvas
- `game/src/config.js` — palette and every tuning number
- `game/src/random.js` — seeded RNG for reproducible runs
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — synthesised Web Audio sound effects
- `game/src/particles.js` — particles, shockwaves, floating score text
- `game/src/enemies.js` — enemy types, wave composition, boss phases, AI
- `game/src/upgrades.js` — the upgrade pool and wave-clear choices
- `game/src/player.js` — the skiff: movement, dash, firing, orbit drones
- `game/src/render.js` — backdrop, world, HUD and menu screens
- `game/src/game.js` — state machine, waves, collisions, scoring, victory
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/main.js` — boot and the fixed-step loop

`main.ts` hands the game in: it copies `game/` and `screenshots/` to the
output directory and writes `dossier.json` with the kit's vendored
`vendor/makefun-game.ts` library.

## Screenshot mode

The screenshots in `screenshots/` are real renders staged from the game's
own code: `index.html?shot=start|action|upgrade|over|victory&seed=1337`
builds one composed scene and sets `window.__shotReady` once it settles.

## Build notes

- Fixed 60 Hz simulation with an accumulator, rendered every animation frame.
- Deterministic from a seed: wave composition, spawns and upgrade rolls all
  go through the seeded RNG.
- The dossier text stays well under the 160 KiB cap; the four screenshots
  are 1280x720 JPEGs under 256 KiB each.
- Tested end to end in headless Chromium: start, move, shoot, dash, clear
  a wave, pick an upgrade, pause, mute, the lancer charge, the Warden rage
  phase, the Warden Prime, nova dash, orbit drone, lance rounds, second
  wind, death, restart, and the full victory path — with zero console
  errors.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3r8va27c&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
