// Path bot: Technological Singularity (fusion and the wireless grid).
import { makePlayer } from './player.js';
import * as L from './lib.js';

export default makePlayer({
  name: 'pathSingularity',
  path: 'singularity',
  budgetPct: 25,
  split: { marketing: 10, rd: 40, maintenance: 25, lobbying: 10, pr: 15 },
  research: ['P2', 'D2', 'G2', 'O1', 'D3', 'S1', 'G3', 'R1', 'D5', 'G4', 'O2', 'P3', 'D8', 'G5', 'O3', 'R2', 'O6', 'P6', 'D6', 'O4', 'O5'],
  deploy: ['D8', 'D2', 'D3', 'D5', 'P6'],
  expandKeep: 3,           // version 1.2: saves for the big plants, so it opens sectors with a cash reserve
  teams: (m) => (m < 30 ? 1 : m < 80 ? 2 : 3),
  fight: { buyout: true, cut: 0.1 },
  builds(m) {
    const all = L.S().sectors.flatMap((s) => s.buildings);
    // Version 1.2: own power for the regional shortage before fusion is ready.
    if (m > 80 && !all.some((b) => b.type === 'fission')) L.build('fission', L.owned()[0].id);
    if (all.filter((b) => b.type === 'fusion').length < 1) for (const sec of L.owned()) if (L.build('fusion', sec.id)) break;
  },
});
