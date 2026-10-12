// Rusher: leapfrogs to Underground and Fission, and rushes projects.
import { makePlayer } from './player.js';
import * as L from './lib.js';

export default makePlayer({
  name: 'rusher',
  research: ['P2', 'D5', 'G4', 'O1', 'P3', 'D2', 'R1', 'G2', 'D3', 'P6', 'O2', 'R2', 'P4', 'O3', 'D6', 'G3', 'G5', 'D8', 'S1', 'P5', 'S3', 'R3', 'R4', 'O4', 'O5', 'O6'],
  deploy: ['D5', 'P6', 'D6', 'D8', 'D2', 'D3'],
  rush: true,
  fight: { buyout: true, cut: 0.2 },
  builds() {
    const all = L.S().sectors.flatMap((s) => s.buildings);
    if (!all.some((b) => b.type === 'fission')) for (const sec of L.owned()) if (L.build('fission', sec.id)) break;
    if (!all.some((b) => b.type === 'fusion')) for (const sec of L.owned()) if (L.build('fusion', sec.id)) break;
  },
});
