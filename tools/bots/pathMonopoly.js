// Path bot: Corporate Monopoly (cash and market share).
import { makePlayer } from './player.js';

export default makePlayer({
  name: 'pathMonopoly',
  path: 'monopoly',
  budgetPct: 25,
  split: { marketing: 35, rd: 15, maintenance: 20, lobbying: 20, pr: 10 },
  research: ['P2', 'R1', 'P3', 'O1', 'D2', 'P7', 'D3', 'P6', 'R3', 'P4', 'O2', 'R2', 'O4', 'D4', 'O3', 'R4', 'D7', 'O5', 'O6', 'G2', 'S1'],
  deploy: ['D2', 'D3', 'P6', 'D7', 'D4'],
  fight: { buyout: true, cut: 0.2, franchise: true, monopoly: true },
});
