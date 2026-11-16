// Neon Drift's hand-in program (Node 22, standard library only). The game is
// the static files under game/ beside this file, plus the screenshots/ this
// entry ships. The program copies both into the output directory and writes
// /output/dossier.json, the summary the judge reads, with the kit's vendored
// library — the same library the scorer uses to rebuild the dossier, so the
// two always agree byte for byte.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps: the dossier text cap shapes the bytes, and the rest
// refuse an entry the scorer would refuse (too many or too large screenshots,
// too many or too large game files, or a game path over 1,000 bytes).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
