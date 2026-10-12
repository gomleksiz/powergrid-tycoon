# Design notes

The design document leaves a few things open. This file lists each choice made in the code, so you can check it and change it.
All numbers are in `js/data/`.

## Step 3 – Money

| Topic | Choice | Why | Where |
| --- | --- | --- | --- |
| Wholesale "start price" | The difficulty start price ($0.05 on Normal) is the **January 2030** price. Base = start ÷ 1.15 (winter). | Section 9 says month 1 energy = 800,000 kWh × $0.05. January is winter (× 1.15), so the base must be lower. | `sim/economy.js` `wholesalePrice` |
| Walk | Starts at 1.0. Changes at the end of each month. | Month 1 must match the section 9 table. | `stepWalk` |
| Budget in month 1 | There is no "last month", so month 1 uses this month's bill as the base. | 20% × $100,000 = $20,000, as in section 9. | `budgetBase` |
| Home Valley buildings | 2 substations (10 MW). | Section 9 upkeep has 2 buildings. 2,000 Low customers need 2.4 MW. | `data/sectors.js` `HOME_BUILDINGS` |
| Substation cost | $40,000. | Not in the design. | `data/buildings.js` |
| Part customers | 15.4 new customers = 15, plus a 40% chance of 1 more (seeded rng). | Small tiers (Corporate: 0.15 a month) would never grow with normal rounding. | `roundChance` |
| PR and marketing | F marketing is capped at 2.0 first, then × (1 + 10% per PR specialist). | Section 9: "each PR specialist adds 10% to marketing". | `fMarketing` |
| Municipal Lobbying (R1) | Tax − 10% of the CapEx spent in the month (not below $0). | "Lowers tax on CapEx by 10%". | `monthlyMoney` |
| Budget sliders | Whole percents. Moving 1 slider changes the open sliders in proportion. Rounding leftovers go to the smallest sliders first. | Repeated + / − taps stay balanced and can be undone. | `sim/budget.js` |
| Phone top bar | Pause button + 1 speed button that goes 1x → 2x → 5x. | Section 15: "small top bar ... pause". 4 speed buttons do not fit. | `ui/topbar.js` |
| Easy mode warning | On Easy, a price over 1.2× asks "This price will make customers leave. Continue?" | Section 4. | `ui/panels/budget.js` |

## Map data (used from step 3)

| Topic | Choice | Where |
| --- | --- | --- |
| Home Valley place | Middle row, column 2 or 3 (seeded), so it has 4 neighbors. | `data/sectors.js` `HOME_CELLS` |
| Roads | 1 road row in each sector row and 1 road column in each sector column. They join across the map. | `sim/mapgen.js` |
| Map rng | The map uses its own rng from the seed. It is not saved; it is made again after a load. | `sim/mapgen.js` |

## Step 4 – Map

| Topic | Choice | Where |
| --- | --- | --- |
| Sprite art | Drawn in code by `tools/make-sprites.js` (run `node tools/make-sprites.js`). You can redraw `assets/sprites/tiles.png` by hand; keep the positions in `tiles.json`. | `tools/sprites/art.js` |
| Place a building | Mouse: click places at once (after the checks). Touch: tap a tile, then ✓. | `ui/mapView.js` |
| Houses | A sector shows houses on its plots in proportion to its customers (player + rival), at least 25% of the plots. | `render/map.js` |
| Build time | Fission and fusion count down their weeks. Field crews join this in step 6. | `sim/tick.js` |
| Zoom | Whole-number scales only (1×, 2×, 3×, 4×, 5×, 6×, 8×, 10× device pixels per art pixel). | `render/camera.js` |
| Keys | + / − zoom, arrow keys move the map, V changes the map view, Esc stops building. | `ui/mapView.js` |

## Step 5 – Grid and outages

| Topic | Choice | Where |
| --- | --- | --- |
| Maintenance split | "By size" = 500 + customers in each sector. A new empty sector still gets some Maintenance. | `sim/grid.js` `updateHealth` |
| Random failures | When Health < 40: chance (40 − Health) ÷ 40 × 60% each month to add 5–15 damage. | `randomFailures`, `GRID` in `balance.js` |
| Week order | Count the damage hours of the week first, then repair. So damage always costs at least 1 week of outages. | `sim/repair.js` |
| Shortage | The supply gap is for the whole company. Each sector gets 120 × gap ÷ total peak. | `calculateGrid` |
| Peak help | Wind gives 50% of 1.5 MW at the evening peak; solar gives 0; batteries 2 MW, grid storage 10 MW, fission 25, fusion 80. | `data/buildings.js` |
| Own energy | Capacity factors: solar 25%, wind 35%, fission and fusion 90%. | `data/buildings.js` |
| Prosumer cut | In sectors with the Prosumer Program, all damage hours go down by prosumer share × 50%. | `outageParts` |
| Map colors | Yellow = H is over the limit of a tier that has customers in the sector. | `sectorStatus` |
| Repair first | On: all free technicians repair while there is damage. Off: crews for waiting deployments are kept free first. | `repairTechnicians` |
| Debug | With `?debug=1`, the K key adds 25 damage to the selected sector. | `ui/debug.js` |

## Step 6 – Staff and tech

| Topic | Choice | Where |
| --- | --- | --- |
| Firing and ES | ES − 3 for each person fired. | `sim/staffing.js` |
| Hiring costs | Hiring, firing and rush are paid at once. The report shows them under Net as "Also paid". They are not in the Net formula. | `ui/report.js` |
| Leapfrog | Automatic: a node is a leapfrog only when its normal prerequisite is not done, but the leap source is. | `sim/research.js` |
| Fission leap protest | CS − 25 when the leapfrog research is done. | `finishResearch` |
| Cancel research | The RP stay on the node. A restart goes on from there. | `cancelResearch` |
| Research in a strike | A strike slows repair and field work only (section 11), not research. | `sim/research.js` |
| Plant building | Fission and fusion need a field crew for their build weeks (like a deployment). Their CapEx is paid when placed. | `sim/deployment.js` |
| Rush cost | Research: RP × $50 × 50%. Deployment: CapEx × 50%. Plant: building cost × 50%. | `rushCost` |
| Waiting deployments | They start in queue order when a crew is free, "Repair first" allows it, and the cash is there. CapEx is paid at the start. | `deployWeek` |
| Grid Operations Center (O4) | After research, "Switch on" for $50,000 makes it active everywhere. | `activateOneTime` |
| Auto-pause | When a project is done, the game pauses (Settings can turn it off; step 12). | `main.js` |
| Debug | With `?debug=1`: `debug/unlock` and `debug/cash` actions (debug panel in step 14). | `sim/actions.js` |

## Step 7 – Meters

| Topic | Choice | Where |
| --- | --- | --- |
| Clean share c | (own clean kWh + rooftop kWh) ÷ demand, max 1. Rooftop solar = 150 kWh a month for each prosumer home. | `energyMix`, `GRID.PROSUMER_KWH` |
| Coal share k | Wholesale share × 0.6. Wholesale share = (demand − own − rooftop) ÷ demand. | `energyMix` |
| m̄ | Price slider weighted by customers, × (1 − local price cut). | `averagePrice` |
| Audit fine | $50,000–$250,000 in $10,000 steps. Paid with next month's money (as "Penalties"). | `updateMeters` |
| Prices at GS < 30 | Prices above 1.1× go down to 1.1× at the month tick. | `updateMeters` |
| Strike | 1 month. A new strike can only start when the last one is over. | `updateMeters` |
| ▲ / ▼ arrows | Only when the target is more than 0.5 away from the meter. | `SAT.ARROW_DEADBAND` |
| Report reason | The part of the target (not the start value) that pushes the most in the direction of the change. | `topReason` |
| Phone top bar | 2 rows: date, cash, pause and speed; then the 3 meters. | `css/components.css` |

## Step 8 – Growth

| Topic | Choice | Where |
| --- | --- | --- |
| New sector | The opening cost includes 1 substation. Health starts at 80. Customers start at 0 and come with the new-customer formula. | `sim/growth.js` `openSector` |
| Opening cost | Counts as CapEx (GS > 75 gives − 15%; it counts for net worth). | `openCost` |
| Corporate penalty | 3 × tariff × the Corporate price slider, for each contract that ends. Paid in the same month as "Penalties". | `corporateContracts` |
| Withheld High payments | The full High bill of a sector with H > 4 h, × 50% with Smart Meters in that sector. | `withheldHigh` |
| Prosumers | Never more than the Low + Medium customers of the sector; when customers leave, prosumers go down too. | `sim/prosumers.js` |
| Phase banner | Shown at the start of a new game (Phase 1) and when each phase starts. It does not pause the game. | `ui/phaseBanner.js` |
| Debug | `debug/month` jumps to a month (with `?debug=1`). | `sim/actions.js` |

## Step 9 – Disasters and events

| Topic | Choice | Where |
| --- | --- | --- |
| When disasters are rolled | At each month tick for 2 months later (so a 2- or 4-week warning fits). So months 1–2 have no disasters. | `rollDisasters`, `DISASTER.SCHEDULE_AHEAD` |
| Spread | Flood: + 1 neighbor. Earthquake: + all neighbors. Neighbors get half damage. | `data/disasters.js` |
| Storm of the Decade | Month 110, week 1, 4 sectors picked like a windstorm (Hills × 2), damage 50–70. Warning 4 weeks before (always). | `SUPERSTORM` |
| Warnings | Easy: 2 weeks always. Normal and Hard: 1 week if a hit sector of yours has Weatherproof Sensors, else none. | `warningWeeks` |
| Storm Prep | $10,000 a sector after a warning. Damage × 0.8. When the storm hits, the crews repair that sector first, before the week's outage hours count. | `stormPrep`, `repairWeek` |
| Heatwave | Lasts until the end of the month it starts in. Peak × 1.25 and supply 85% for that month's grid. | `sim/market.js` |
| Event cards | Each month with no card waiting: 1 in 6 chance. 3 months of pause after a card. Conditions: `minMonth`, `csBelow`, `minStaff`. | `data/events.js` |
| "Public petition" | The CS-below-30 card from section 11 (weight 6, so it comes often when CS is low). | `data/events.js` |
| Event RP | "+ 300 RP" goes to the first research project; with no research, it waits for the next one. | `applyEffects` |
| Card on load | A card that was waiting at save time opens again after the load. | `main.js` |
| Debug | `debug/disaster` (strike next week) and `debug/event` with `?debug=1`. | `sim/actions.js` |
