# Balance log (step 13)

How to check: `node tools/balance.js --seeds 20` (all bots, Normal; `--difficulty all` for all 3).
`npm test` also runs the Normal targets (`tests/balance.test.js`).

Start: 3/10 targets passed. End: **10/10 targets pass** on Normal (each in at least 16 of 20 seeds).

## 2 targets in the design could not be met with its own numbers

- "Balanced bot: more than 30,000 customers at month 180" — the section 5 table has only 29,565 possible customers in all 12 sectors.
- "Balanced bot: 4,000–6,000 customers at month 40" — in Phase 1 the player has only Home Valley, which had 3,500 possible customers.

So the sectors are bigger (first 2 rows below).

## Changes (all in `js/data/`, except where noted)

| # | Change | Before → after | File | Why |
| --- | --- | --- | --- | --- |
| 1 | Possible customers in every sector | section 5 table × 1.8 | `data/sectors.js` | Makes the customer targets possible (see above). Revenue at full size: about $5.6M a month. |
| 2 | Home Valley is bigger than other towns | × 1.3 | `data/sectors.js` (`HOME.potentialMult`) | Month 40 target, without faster growth later. |
| 3 | New customer rate | 0.02 → 0.016 | `data/balance.js` | Month 100 target (15,000–25,000). |
| 4 | Medium base churn | 1% → 1.2% | `data/balance.js` | Month 100 target (suburbs are mostly Medium). |
| 5 | Marketing is spread over the owned sectors | F marketing uses budget ÷ sectors | `sim/customers.js`, `sim/prosumers.js` (code) | With 1 budget for every sector, growth got cheaper as the company grew. Month 1 is the same as before (1 sector). |
| 6 | Prosumer rate (own constant) | 2% → 0.9% | `data/balance.js` | With 2%, Utopia was won around month 120. |
| 7 | Monopoly market share | Easy/Normal/Hard 80/90/95% → 70/80/82% | `data/difficulty.js` | With the design churn, about 89% is the highest steady share, so 90% could not be reached. |
| 8 | Monopoly cash | $30M/$50M/$75M → $90M/$150M/$180M | `data/difficulty.js` | Revenue is about × 1.8, and late-game profit is high ($1–1.4M a month). With $50M, Monopoly came at month ~130. |
| 9 | Research cost tier 3 and 4 | 900 / 2,400 → 1,200 / 4,800 RP | `data/techTree.js` | Singularity came at month ~125–140. The whole tree is now about 35,000 RP; a good player makes 25,000–40,000, so the player must choose (as section 10 says). |
| 10 | Rush cost for research | RP × $50 → RP × $500 (× 50%) | `data/balance.js` | The rushing bot won Singularity before month 140. |
| 11 | Maintenance split base | 500 → 2,000 per sector | `data/balance.js` | Small sectors (Industrial) got almost no Maintenance and fell to Health 0. |

## Results (Normal, 20 seeds)

| Bot | Result |
| --- | --- |
| Idle | never wins, grade D (loses or ends at 2049) |
| Balanced | wins at month 200–235 in 20/20 (Monopoly, avg ~216) |
| Rusher | wins Singularity, avg month ~143 |
| Penny-pincher | loses customers, grade D, not bankrupt before month 100 in 19/20 |
| Path Monopoly | wins Monopoly in 16/20 |
| Path Singularity | wins Singularity in 19/20 (avg ~162) |
| Path Utopia | wins Utopia in 20/20 (avg ~178) |
| Fastest win of any bot | not before month 160 in 114/140 games (only the rusher is faster) |

## Easy and Hard

- **Easy:** every active bot wins, around months 157–178.
- **Hard:** Singularity and Utopia are winnable (the path bots win in 10–15 of 20); Monopoly is not reached by the bots (rivals grow 1.5× faster). Bots that borrow a lot often go bankrupt early (start cash $80,000, loan limit $150,000). This fits "Hard", but check it in playtests.

## Bot changes (tools, not game data)

- Bots borrow to open sectors (a sensible player does; a new sector pays for itself).
- The Monopoly bot plays like the balanced bot, with the charters earlier. Without clean power and the Prosumer Program, its CS stayed too low for 80% share.
- The penny-pincher does not hire extra technicians for repairs.

## Still to do (needs people)

- Playtests: 3 people for each difficulty; write down the real time at the end of each phase.
- Fix the 5 biggest problems from the playtests.
- Playtesters on Normal should finish in 100–130 minutes at mostly 1x speed.

## Version 1.1 (player requests)

| # | Change | Value | Where | Why |
| --- | --- | --- | --- | --- |
| 12 | Region growth start | Month 1 → month 101 (Phase 3) | `data/balance.js` (`GROWTH.START_MONTH`) | From month 1 the balanced bot had 25,800 customers at month 100 (target 15,000–25,000); from month 61 it passed 15/20 seeds. |
| 13 | Bots run campaigns | Balanced and Monopoly bots: Marketing department from month 150, 10% off for 12 months, only while the share is below the Monopoly share + 1 point | `tools/bots/lib.js` (`campaign`) | With the growing region the share stalled at 77–79% (target 80%), Monopoly 0/20. A 25% campaign won share but cost too much cash (7/20). This is how a person would play for Monopoly. |

| 14 | Regional shortage | Demand + 2.5% → + 3% a year; supply + 1.8% → + 1.5% a year | `data/balance.js` (`REGION`) | With the first values the shortage stayed at 5–10%. Rooftop solar (VPP) covered it, so a company with no plants had almost no shortage outages (0.1–0.8 h a month). Now: 3–6 h in most months after 2045. |
| 15 | Shortage effect on the wholesale price | × (1 + 2 × shortage) → × (1 + shortage) | `data/balance.js` (`REGION.PRICE_K`) | With the stronger shortage, energy costs held the Monopoly bot below the $150M cash (11/20). |
| 16 | Bots build own peak power | All active bots except the penny-pincher: look 6 months ahead; add storage, batteries or an upgrade until own peak MW ≥ peak × (shortage + 3%) | `tools/bots/lib.js` (`ownPower`) | A player reads the Energy market card and builds before the summer. |
| 17 | Bot campaign margin | Campaign until the share is 0.5 point over the Monopoly share | `tools/bots/*.js` | Monopoly bot 16/20 → 18/20, so the target does not sit on the limit. |

### Results (Normal, 20 seeds)

All 10 targets pass: balanced wins at month 200–235 in 18/20 (avg 215); customers at month 40 / 100 / 180: 18 / 19 / 20 of 20 in range; Monopoly bot 18/20; Singularity 17/20 (avg 170); Utopia 20/20 (avg 183); penny-pincher 18/20; fastest win not before month 160 in 115/140.

Easy: every active bot wins (months 136–178). Hard: as in 1.0, Monopoly is hard to reach (1/20), and bots that borrow a lot can go bankrupt (Singularity 10/20, Utopia 12/20).

A company without own plants (a test bot with no plants and no batteries) has 3–6 outage hours a month on average after 2045, more than 2 h in 43–60 of the last 60 months. The bots with plants have almost none.
