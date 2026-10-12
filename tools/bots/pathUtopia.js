// Path bot: Decentralized Utopia (prosumers, VPP, happy customers and government).
import { makePlayer } from './player.js';
import * as L from './lib.js';

export default makePlayer({
  name: 'pathUtopia',
  path: 'utopia',
  budgetPct: 25,
  split: { marketing: 30, rd: 15, maintenance: 15, lobbying: 20, pr: 20 },
  research: ['P2', 'G2', 'P7', 'R1', 'P5', 'S1', 'O1', 'D2', 'R2', 'P6', 'S3', 'O2', 'D3', 'P3', 'G3', 'D7', 'O4', 'S2', 'O3', 'D4', 'O5'],
  deploy: ['P5', 'S3', 'D2', 'P6', 'D3', 'D7', 'D4'],
  price: 0.95,
  fight: { buyout: true, cut: 0.1 },
  builds() {
    for (const sec of L.owned()) {
      const has = (t) => sec.buildings.some((b) => b.type === t);
      if (!has('solar')) L.build('solar', sec.id);
      if (has('solar') && !has('battery')) L.build('battery', sec.id);
    }
  },
});
