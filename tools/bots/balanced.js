// Balanced: even budget, researches each branch in order, repairs first.
import { makePlayer } from './player.js';
import * as L from './lib.js';

export default makePlayer({
  name: 'balanced',
  research: ['P2', 'O1', 'D2', 'R1', 'P7', 'G2', 'P3', 'D3', 'P6', 'S1', 'O2', 'R2', 'D7', 'G3', 'D4', 'P5', 'P4', 'R3',
    'O3', 'O4', 'S2', 'D5', 'S3', 'G4', 'O5', 'D6', 'O6', 'R4', 'D8', 'G5'],
  deploy: ['D2', 'D3', 'P6', 'D7', 'D4', 'P5', 'S3', 'D5', 'D6', 'D8'],
  fight: { buyout: true, cut: 0.1 },
  campaign: { from: 150, cut: 0.1, months: 12, margin: 0.005 },
  builds(m) {
    for (const sec of L.owned()) {
      const has = (t) => sec.buildings.some((b) => b.type === t);
      if (!has('solar')) L.build('solar', sec.id);
      if (sec.type === 'hills' && !has('wind')) L.build('wind', sec.id);
      if (!has('battery') && has('solar')) L.build('battery', sec.id);
    }
    const all = L.S().sectors.flatMap((s) => s.buildings);
    if (m > 120 && !all.some((b) => b.type === 'fission')) L.build('fission', L.owned()[0].id);
    if (!all.some((b) => b.type === 'fusion')) for (const sec of L.owned()) if (L.build('fusion', sec.id)) break;
  },
});
