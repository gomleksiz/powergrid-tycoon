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

## Step 10 – Rivals

| Topic | Choice | Where |
| --- | --- | --- |
| Volt Dynamics start | 65 months after Apex (Normal: 55 → 120; Easy 145; Hard 105). | `data/rivals.js` |
| Entry checks | Each rival checks every 3 months from its start month, and can spread to more sectors. 1 rival per sector. Ties are broken with the seeded rng. | `sim/rivals.js` |
| Unopened sectors | Unserved share = 1 → entry score 50, so a rival often starts in a sector you do not have yet. | `entryScore` |
| Rival growth in unserved customers | A rival also wins unserved customers: free × 2% × strength ÷ 50 each month (not in the design, but a rival in an empty sector needs a way to grow). | `rivalsMonth` |
| "Be better" | The + 3 a month growth stops while your H in that sector is lower than the rival's H (Apex 12–24 h, Volt 1–3 h, rolled each month). | `rivalsMonth` |
| Local price cut | The cut also lowers m in the move formula, so fewer customers move. | `rivalsMonth` |
| Buyout | Only in your own sectors. You get the rival customers of the tiers you have unlocked; the others go back to the unserved pool. It counts as CapEx. | `buyout` |
| Monopoly Charter | After use, no rival can enter again. | `monopolyCharter` |

## Step 11 – Win and lose

| Topic | Choice | Where |
| --- | --- | --- |
| Months left in the score | Only for a win. Without this, losing early gave a high score (a loss at month 8 got a C). | `computeScore` |
| Fusion share | Own fusion kWh ÷ all customer demand (max 100%). | `energyMix` |
| Bankruptcy | Counts a month when cash < $0 and the bank cannot give a $50,000 loan (the loan is at its limit). | `updateLoss` |
| After the end | The clock stops. An ended game is not auto-saved, so "Load the last auto-save" goes back to before the end. | `sim/actions.js`, `core/session.js` |
| Easy Advisor | The same Advisor as O5, on from the start. | `advisorOn` |
| Extra Advisor rules | "Lower your prices" (CS < 40 and m̄ > 1.2) and "Start research" (no project), with the 6 rules from section 14. | `data/advisorRules.js` |
| Suggested budgets | Monopoly 35/15/20/20/10, Singularity 10/40/25/10/15, Utopia 30/15/15/20/20 (Marketing/R&D/Maintenance/Lobbying/PR). | `SUGGESTED_BUDGET` |
| Debug jumps | `debug/setup` with winMonopoly, winSingularity, winUtopia, loseBankrupt, loseLicense, loseCollapse, endOfTime: 1 month before the end. | `sim/debugSetups.js` |

## Step 12 – Tutorial, accessibility, touch and sound

| Topic | Choice | Where |
| --- | --- | --- |
| Sound files | No `.mp3` files: the music (a calm and a tense loop) and the 7 sound effects are made in code with the Web Audio API. Nothing to download or license. | `js/audio/audio.js` |
| Tense music | Plays for 8 weeks after a warning, a disaster or a rival entry; then the calm loop comes back. | `ui/reactions.js` |
| Tutorial pause | While a step waits for the player, the clock cannot run (pressing play shakes the tutorial box). Step 5 lets time run until the month 3 line break; step 7 until the monthly report. | `ui/tutorial.js` |
| Tutorial line break | 30 damage in Home Valley at the start of month 3 (in the sim, so it is the same after a load). | `sim/tick.js` |
| Tutorial default | On for Easy and Normal, off for Hard (the New Game form follows the difficulty). | `data/difficulty.js` |
| Report "log only" | The monthly report becomes 1 line in the news log. Click the news bar (or press N) for the log. | `ui/news.js` |
| Big text | The top bar, news bar and bottom bar grow with the text; the phone tab bar scrolls sideways. At 150% no text is cut. | `css/layout.css`, `ui/barSizes.js` |
| Phone meters | The meters have their own row, with the Mute button. | `css/components.css` |
| Color blind | Every color also has an icon, a letter, a pattern or a dash style: ✓ ! ✕ status icons, hatch patterns in map views, L/M/H/C tier letters, A/V rival badges, dashed chart lines. | `render/views.js`, `ui/lineChart.js` |

## Step 13 – Balance

All number changes and their reasons are in `docs/balance-log.md`. The 1 rule change: the marketing budget is spread over the owned sectors in the new-customer and prosumer formulas.

## Step 14 – Release

| Topic | Choice | Where |
| --- | --- | --- |
| Debug panel | Only with `?debug=1`; F9 opens it. Speed 20x is only there. | `ui/debug.js` |
| Version | `gameVersion` 1.0.0; `saveVersion` locked at 1. | `data/balance.js` |
| Icons | Drawn in code (`node tools/make-icons.js`): 32, 180, 192, 512 px and a maskable 512 px icon. | `assets/icons/` |
| Package | `npm run package` makes a ZIP with only the game files (no tests, tools or design). | `tools/package.js` |

## Version 1.1 – player requests

These features are not in the design document. They come from the first play session.

| Request | Choice | Where |
| --- | --- | --- |
| Alerts must not stop the game | Event cards, disaster warnings and disaster reports pause only while the dialog is open; then the game runs on at the old speed (`loop.hold()`). If the player presses Pause meanwhile, it stays paused. A new rival shows only in the news bar. "Pause when a project is done" is now off by default (setting `pauseOnProject`). The tutorial and the end screen still pause. | `core/loop.js`, `ui/reactions.js`, `ui/prefs.js` |
| Project Manager | An office: $25,000 to hire, $9,000 a month (not counted as staff for the efficiency). It counts weeks with a full idle team (3 engineers) or crew (4 technicians), and weeks a project waits. News at 4 idle weeks or 6 waiting weeks, then every 12 weeks. Options: start research when a team is free (cheapest available node), start deployments when a crew is free (cheapest first, keeps 3 months of costs in cash). The "What sits idle" list in the Staff tab works without the manager. | `sim/offices.js`, `data/offices.js` |
| Schedule all | Projects tab button: fills free research teams and queues every possible deployment (each waits for a crew and the cash). No manager needed. | `sim/offices.js` |
| See who fixes outages, and what to do | Each sector stores the technicians that repaired it this week (`repairTechs`). The Sector tab shows them with the time left; the map shows small orange workers and a 🔧 badge. Field crews show as white-hat workers at their project. "What to do" gives up to 4 tips with a button: hire technicians, High priority, Repair first, Maintenance, upgrade or build a substation, own power in a shortage, sell less to the government, raise wages in a strike. | `sim/advice.js`, `data/advisorRules.js` (`OUTAGE_HELP`), `render/map.js` |
| More homes and firms over time | From Phase 3 (month 101) every sector's potential grows each year: Low 1%, Medium 1.5%, High 2%, Corporate 3% (compound). The evening peak of each customer grows 1% a year from 2030. A news line each January. Growth starts at Phase 3 so the month-100 balance target still holds. | `data/balance.js` (`GROWTH`), `sim/growth.js`, `sim/grid.js` |
| Build more power plants | Regional supply: 8% above demand in 2030, demand +3% a year, supply +1.5% a year, + 5% demand in summer and 3% in winter, a small random walk (±3%). The shortage lowers the wholesale supply share (outage hours unless own plants, batteries or the VPP cover the peak) and raises the wholesale price (× 1 + shortage). First shortages around 2033 (summer), about 10–15% around 2042 and 20% in the late 2040s. Without own peak power a big company then has 3–6 outage hours most months, which ends Corporate contracts. | `data/balance.js` (`REGION`), `sim/market.js` |
| Sell power to the government | Own power that customers do not need is sold at the government price: wholesale × (0.5 + 10 × shortage), at most 2×, so 0.5× without a shortage (as before). A slider promises 0–100% of plant power to the government in a shortage: it is sold at the same price, but it does not help own customers at the peak and does not count as own clean energy. GS target + 1 for each GWh sold in a shortage month (at most + 8). | `sim/economy.js` (`energyTrade`), `sim/satisfaction.js` (`gridHelp`) |
| Upgrade a plant | Every building has a level (1–3). Level 2 costs 60% of a new one, level 3 costs 90%. Output (capacity, peak MW, energy) × 1.5 and × 2. Upkeep is $500 × level. Fission and fusion need a field crew for half their build time; the plant keeps working at its old level meanwhile. The fission permit rule (GS) applies to upgrades too. Gold marks on the map show the level. | `data/buildings.js` (`LEVELS`), `sim/build.js` |
| Marketing department and campaigns | An office: $40,000, then $7,000 a month. Campaigns: 10%, 25% or 50% off, for 3, 6 or 12 months, in all owned sectors or 1 sector; start cost $15,000 per sector; at most 4 at a time, 1 for each place. While it runs: the price cut lowers bills, raises new customers (price factor and × 1.3 buzz) and lowers churn. 50% off: GS − 1 each month. | `sim/marketing.js`, `data/offices.js` (`CAMPAIGN`) |
| Lower prices hit the rivals | The real price (price × local cut × campaign) now counts for new customers and churn too. When it is below the rival's price, each month 15% × (rival price − your price) of the rival's customers in that tier switch to you. The rival answers with a price war: − 0.03 a month down to 75% of its normal price, then + 0.01 a month when you stop. A cheaper rival also has a cheaper buyout. The strength cut of the local price cut now includes campaigns. | `sim/rivals.js`, `data/rivals.js` |
| Fix | Plant building projects now keep their field crew busy (before, only deployments did). | `sim/repair.js` |
| Saves | `saveVersion` stays 1: the new fields come from `createState()` when a 1.0 save loads; old buildings are level 1, old rivals use their normal price. | `js/save/migrate.js` (no change) |

## Version 1.2 – a harder game

From the second play session: "After 6 months I earn enough money to do everything. Nothing can stop me after $1M. Customers grow too fast. Rivals are too weak. 24-hour outages and nothing to do. My start power is much more than the town needs." The game should still end in about 2 hours, but only when the player makes the right moves.

| Request | Choice | Where |
| --- | --- | --- |
| Money should not be easy | Customer service costs money each month: $3 Low, $8 Medium, $20 High, $400 Corporate (a new report line). High prices now cost customers: F price = 1 − 2.5 × (m − 1), between 0 and 2 (1.2× halves new customers, 1.4× stops them; design: 2 − m), and the price churn is 10 % × (m − 1) (design: 4 %). Before, a 1.3× price gave more money and still more customers. | `data/balance.js` (`TIERS`, `CUSTOMERS`), `sim/customers.js`, `sim/economy.js` |
| More competitors from the start, by difficulty | The start month of each rival is in the difficulty (`rivalMonths`): Easy Apex 18, Volt 80, Nova 150; Normal Apex 1, Volt 30, Nova 80; Hard Apex and Volt 1, Nova 60. Each rival can be in a few sectors (`rivalMaxSectors`: 2 / 3 / 3), and wins unserved homes only up to 40 % of a sector. | `data/difficulty.js`, `sim/rivals.js` |
| Rivals attack your region | Entry score + 15 in your own sectors, so Apex enters Home Valley in month 1 on Normal and Hard. Start strength 20 → 30. Better service now halves the rival's growth (before: it stopped). Price cut: − 3 strength per 10 % (was 4). | `data/rivals.js`, `sim/rivals.js` |
| Third rival | Nova Power: price 0.95×, 4–8 outage hours. Green "N" badge on the map. Old saves without Nova still work (the rival list is not needed for an entry). | `data/rivals.js`, `tools/sprites/art.js` |
| Rivals surprise you | Sales drive: each month a rival can (4 % × rival growth) cut its price by 15 % for 6 months and gain 10 strength. News when it is in your sector. | `sim/rivals.js` (`RIVAL.DRIVE_*`) |
| Buyout loop | Buying out a rival with no customers cost almost $0, and a new rival came at once. Now: at least $150,000 × (1.5 − GS ÷ 100), 36 months of rival revenue (was 24), and no rival can enter that sector for 24 months. | `sim/rivals.js` (`buyoutCost`, `noRivalUntil`) |
| More houses, but customers limited per region | Every sector has 1.5 × more possible customers, and the map shows a house on at least 60 % of the plots. New customers connect only while the sector's substations have room at the evening peak (a heatwave does not count). The rest wait: the Sector tab, the report and "What to do" say how many. New customer rate 1.6 % → 0.9 %. | `data/sectors.js` (`POTENTIAL_MULT`), `sim/customers.js` (`connectRoomKw`), `data/balance.js` (`CONNECT`) |
| Start power far over the need; more demand | Home Valley starts with 1 substation (5 MW), not 2. The evening peak of each customer × 1.25 (Low 1.5 kW, Medium 3.1, High 10, Corporate 150) and it grows 2 % a year from 2030 (was 1 %). Start customers: Easy 3,000, Normal 2,500, Hard 2,200. | `data/sectors.js`, `data/balance.js`, `data/difficulty.js` |
| Disasters damage more, also the buildings | Damage × 1.25 (windstorm 25–50, ice 20–40, flood 30–60, quake 40–75, Storm of the Decade 60–80). Each building in a hit sector can break: chance = damage × 0.6 % (tech and Storm Prep lower the damage, so also the chance). A broken building gives nothing (a broken substation = 0 MW) and cannot be upgraded. Repair: 20 % of its cost × level (at least $5,000), ready in 2 weeks. Red ✕ on the map. | `sim/disasters.js` (`breakBuildings`), `sim/repair.js`, `data/balance.js` (`BREAKDOWN`) |
| Something to do in a long outage | Emergency crew in the Sector tab: $15,000 for 6 contractors for 2 weeks, in 1 damaged sector. They start at once and repair before the week's outage hours count; no strike, ES or efficiency effect. The disaster report points to it. | `sim/repair.js` (`callContractors`), `data/balance.js` (`CONTRACTORS`) |
| Union strike and more surprises | New event cards: union strike (pay 10 % more or a 2-month strike), substation fire (pay $30,000 or the substation breaks), heat dome (peak + 15 % with CS − 3, or + 30 %, for 2 months), cyber attack ($60,000 or 35 damage in a random sector), a rival hires your engineers (wages + 5 % or 3 engineers leave). Cards come more often: chance 1 / 4 a month (was 1 / 6), 2 months of pause (was 3). | `data/events.js`, `sim/eventCards.js` |
| Audit fine | 25–75 % of last month's revenue, $20,000–$250,000 (design: $50,000–$250,000 always). With rivals and storms from month 1, a $200,000 fine in year 1 ended most Hard games. | `sim/satisfaction.js`, `SAT.AUDIT_REVENUE` |
| Saves | `saveVersion` stays 1. New sector fields (`waiting`, `contractors`, `noRivalUntil`) come from `createState()`; old buildings are not broken. | `js/save/migrate.js` (no change) |

### Version 1.2, part 2 – the live board

From the same player: "I want the map, but not to place buildings on it. I want a live board with the city status, rival prices, a customer chart for each city, power use and production. Disaster prep and reports should not be pop-ups (the cost is fine). I don't see what the budget parts do. Loans should grow with the company. I want to assign staff to a city so they fix its problems faster."

| Request | Choice | Where |
| --- | --- | --- |
| No placing on the map | The build buttons in the Sector tab (and the "Build" tips) build at once; the game picks the first free tile near the sector's center (`build/sector`). "No free space" when the sector is full. The map no longer has a place mode. | `sim/build.js` (`buildInSector`, `canBuildIn`), `ui/mapView.js` |
| Live board | A Board view in place of the map (top bar switch, key D; the choice is kept in the settings, Board by default). Tiles: cash, revenue and costs, customers, market share, average outages, evening peak (own and grid MW), wholesale price and shortage, debt and bank limit. Charts: peak demand vs substation capacity vs own power; energy used vs own production; revenue vs costs; your vs rival customers. A card for each city: customers of possible, tiers, peak vs capacity, health, damage, waiting customers, broken buildings, local crew, emergency crew, Storm Prep, the rival with its price, strength and customers, and a chart of your and the rival's customers. A click opens the Sector tab. A rivals table (their price next to yours) and a disasters card. | `ui/board.js`, `history.*`, `sector.hist` |
| History for the board | Each month: costs, peak, own peak, capacity, energy used and made, wholesale price, rival customers; and for each sector its customers, rival customers and outage hours. Old saves start these lists empty; shorter lines are drawn at the right end of a chart. | `sim/tick.js` (`pushHistory`), `ui/lineChart.js` |
| Disasters without pop-ups | Warnings and disaster reports are news lines (with the sectors, the damage, broken buildings and the repair time) and items on the board. "Storm Prep by itself after a warning" (on by default, a game setting on the board) pays the $10,000 for each of your warned sectors. The Sector tab still has the manual Storm Prep button. Event cards are still dialogs. | `sim/disasters.js`, `ui/reactions.js`, `state.policy.autoPrep` |
| Visible budget effects | Under each budget slider: what it does now (marketing: F marketing and new customers a month, how many come from the budget; R&D: research speed and RP a month; maintenance: health change a month on average and in the weakest sector, and the money that holds every sector; lobbying: GS points; PR: CS points), the top where more money does nothing, and a warning with the money above the top. A big company passes most tops (R&D at $11,250, PR at $50,000, lobbying at about $87,000 a month), so the budget total can be lowered. The rules did not change. | `sim/budgetEffects.js`, `ui/panels/budget.js` |
| Loans grow with the company | Bank limit = the larger of the difficulty limit and 2 months of revenue; the loan step is about 1/10 of the limit; both rounded down to 1, 2 or 5 × 10ⁿ (at least $50,000). A repayment is 1 step or the rest of the debt. | `sim/economy.js` (`loanLimit`, `loanStep`) |
| Assign staff to a city | Local crew in the Sector tab: station technicians in a sector (− / + / +4). They come from the free technicians (not field crews), repair their sector first and before the week's outage hours count, and a broken building there is repaired in 1 week. Shown on the board. | `sim/repair.js` (`assignTechnicians`, `stationedNow`), `sector.assigned` |
