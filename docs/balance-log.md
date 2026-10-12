# Balance log (step 13 – in progress)

Run: `node tools/balance.js --seeds 20` (all bots, Normal). Baseline: 3/10 targets passed.

| Change | File | Why |
| --- | --- | --- |
| Sector sizes × 1.8 | `data/sectors.js` | Section 18 asks for > 30,000 customers at month 180, but the section 5 table has only 29,565 in all 12 sectors. |
| Prosumer rate 0.008 (own constant) | `data/balance.js` | 2% made Utopia winnable at month ~120. Too slow now: next try 0.015. |
| Victory share 70/80/85% (Easy/Normal/Hard) | `data/difficulty.js` | With design churn, about 89% is the highest steady market share, so 90% could not be reached. |
| Marketing budget spread over owned sectors | `sim/customers.js`, `sim/prosumers.js` | Growth got cheaper as the company grew. Month 1 is unchanged. |

Latest result: 4/10 targets. Wins still too early (Monopoly ~month 149: late profit is ~$1.3M a month).

## Next tries (not done yet)
- Home Valley potential × 1.3 (month-40 target: 4,000–6,000; now ~3,700).
- Monopoly cash: Easy 72M / Normal 120M / Hard 180M.
- Prosumer rate 0.015; tier-4 research 3,600 RP; rush $200 per RP.
- Penny-pincher bot: no extra technicians for the repair backlog.
- Update the tests that use the old sector sizes.
