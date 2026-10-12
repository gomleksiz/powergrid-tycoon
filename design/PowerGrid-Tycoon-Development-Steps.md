# PowerGrid Tycoon – Development Steps

This tab breaks the 14 build steps (section 19 of the design tab) into small tasks. Do the steps in order. Tick each task when it is done.

## Before you start

Get these tools and make the empty project 1 time. Then all steps use the same setup.

### Tools

| Tool | Use |
| --- | --- |
| Code editor (for example, VS Code) | Write the code |
| Node.js (current LTS version) | Run tests and the balance runner |
| Git and a private GitHub repository | Save each step. Go back if something breaks. |
| A modern browser (Chrome, Firefox, Edge or Safari) | Play and debug (F12 opens the developer tools) |
| Piskel, LibreSprite or Aseprite | Draw the pixel art (step 4) |

### Set up the project

- [ ] Make the folder `powergrid-tycoon` with the sub-folders from section 17 of the design tab.
- [ ] Run `git init`. Make the first commit.
- [ ] Make `package.json` with `"type": "module"` and 2 scripts: `"test": "node --test"` and `"sim": "node tools/sim-runner.js"`.
- [ ] Start the local server on **port 8080** (`npx serve -l 8080`). Always use this port, or the saves seem to disappear.
- [ ] Open `http://localhost:8080` in the browser.

### Test on your phone and tablet

- Put the phone and the PC on the same Wi-Fi.
- Find the PC's IP address (for example, `192.168.1.20`).
- On the phone, open `http://192.168.1.20:8080`.
- The phone has its own saves. This is normal: it is a different origin.

### Code rules for all steps

- 1 file = 1 job. Keep files short.
- All numbers and text go in `js/data/`. No "magic numbers" in the code.
- `js/sim/` never uses the DOM and never uses `Math.random()`.
- The UI changes the state only with `dispatch(action)`.
- Each new state field gets a start value in `createState()`. Then old saves and new games both work.

## How to work on each step

Do these 9 things for each step. This keeps the game in a working state all the time.

1. Make a branch: `git checkout -b step-03-money`.
2. Read the design sections that the step lists.
3. Write tests for the formulas first (in `tests/`).
4. Build in this order: `sim/` → `ui/` → `render/`.
5. Run `npm test`. All tests must pass.
6. Play for 10 minutes at 1x and at 5x.
7. **Save check:** save, reload the page, load. Nothing must change.
8. Open the game on your phone. Check that it works.
9. Commit, merge to `main`, and add a tag: `git tag step-03`.

**If you use an AI coding helper:** give it the design section and the task list of the step. Ask for 1 task at a time. Read the code. Run the tests after each task.

## Step 1 – Skeleton

**Goal:** an empty game frame. The date moves, the speed buttons work, and the layout fits a phone, a tablet and a PC.

**Design sections:** 3, 15 (screen sizes), 17.

**Files:** `index.html` · `css/base.css` · `css/layout.css` · `js/main.js` · `js/core/loop.js` · `js/core/store.js` · `js/core/bus.js` · `js/core/rng.js` · `js/data/text.js` · `js/data/balance.js` · `tests/rng.test.js` · `tests/store.test.js`

**Tasks:**

- [ ] `index.html`: viewport meta tag, top bar, canvas area, side panel, news bar. Load `js/main.js` as `type="module"`.
- [ ] `base.css`: color tokens, Atkinson Hyperlegible font (`assets/fonts/`), 18 px text, line height 1.5.
- [ ] `layout.css`: 3 layouts with CSS grid: 1024 px and more, 600–1023 px, less than 600 px. Side panel → drawer → bottom sheet (empty boxes for now).
- [ ] `rng.js`: mulberry32 with `next()`, `int(min, max)`, `chance(p)`, `getState()`, `setState()`.
- [ ] `store.js`: `createState(seed, difficulty)`, `getState()`, `dispatch(action)`, `subscribe(fn)`.
- [ ] `bus.js`: `on()`, `off()`, `emit()`.
- [ ] `loop.js`: fixed timestep from section 17. Speeds 0, 1, 2, 5. Pause when the tab is hidden.
- [ ] `weekTick()` stub: week + 1. On week 4, call `monthTick()` stub: month + 1, emit `month:end`.
- [ ] Top bar: date ("Jan 2030"), speed buttons. Keys: Space, 1, 2, 3.
- [ ] Test: the same seed gives the same 1,000 numbers.
- [ ] Test: `dispatch` changes the state as expected.

**Done when:**

- [ ] 1 month takes 30 s at 1x, 15 s at 2x, 6 s at 5x.
- [ ] Pause works with the button and the Space key.
- [ ] The layout changes at the 3 widths (check with the browser's device mode).
- [ ] `npm test` passes.

## Step 2 – Save and load

**Goal:** auto-save, 3 slots and a safe load. Build this early, so each later feature must work with save and load.

**Design sections:** 15 (screens), 16.

**Files:** `js/save/save.js` · `js/save/migrate.js` · `js/save/checksum.js` · `js/ui/titleScreen.js` · `js/ui/loadScreen.js` · `js/ui/pauseMenu.js` · `tests/save.test.js`

**Tasks:**

- [ ] `checksum.js`: FNV-1a (32-bit) hash of a text.
- [ ] `serialize(state)` → the save object from section 16 (`saveVersion`, `gameVersion`, `savedAt`, `playTimeSec`, `checksum`, `meta`, `state`).
- [ ] `writeAuto()`: write to `pgt.auto.a` and `pgt.auto.b` in turn. Put it in `try...catch`. On `QuotaExceededError`, show a message in the news bar.
- [ ] `writeSlot(n)`: ask "Replace this save?" if the slot is full.
- [ ] `readSave(key)`: parse → checksum → version → migrate → calculate derived values → start paused.
- [ ] `listSaves()`: read only `meta` for the slot cards.
- [ ] Auto-save on `month:end`, on `visibilitychange` (hidden) and on `pagehide`.
- [ ] Title screen: New Game (name, difficulty, seed, tutorial), Continue (newest good auto-save), Load, Settings.
- [ ] Pause menu: Resume, Save, Load, Settings, Quit to title.
- [ ] After the first save, call `navigator.storage.persist()` if the browser has it.
- [ ] Settings: show a note that private windows delete saves.
- [ ] Tests: round trip (save → load → equal state), bad checksum is refused, newer version is refused, a fake old save migrates.

**Done when:**

- [ ] Reload the page. "Continue" goes back to the same month.
- [ ] After load, the random generator gives the same next numbers.
- [ ] Break one save key by hand (developer tools). The game uses the other auto-save and does not crash.

## Step 3 – Money (1 sector, Low tier)

**Goal:** the money loop works in Home Valley. The player sets prices and budget and sees a monthly report.

**Design sections:** 4, 6, 9 (month 1 check).

**Files:** `js/data/difficulty.js` · `js/sim/economy.js` · `js/sim/customers.js` · `js/sim/tick.js` · `js/ui/topbar.js` · `js/ui/panels/budget.js` · `js/ui/panels/customers.js` · `js/ui/report.js` · `tests/economy.test.js`

**Tasks:**

- [ ] `difficulty.js`: all values from the section 4 table.
- [ ] State: cash, debt, prices, budget, staff counts, 1 sector with Low customers.
- [ ] `economy.js`: revenue, energy cost, wholesale price (season × walk × event), wages, upkeep, budget, interest, tax.
- [ ] `customers.js`: new and lost customers. Use H = 0 for now.
- [ ] Budget panel: total % slider and 5 linked sliders that always add up to 100%. Lock icons.
- [ ] Price slider for each tier. Only Low is open now.
- [ ] Loans: take and pay back in $50,000 steps. Emergency loan when cash < $0.
- [ ] Monthly report card. Save the numbers in `history`.
- [ ] Top bar: cash and last month +/−.
- [ ] Tests: month 1 on Normal = + $4,000 before tax. Sliders always add up to 100%. Churn formula.

**Done when:**

- [ ] The month 1 numbers match the table in section 9.
- [ ] With the start sliders, the company is close to break-even for 24 months.
- [ ] More marketing brings more customers. A higher price brings more churn.

## Step 4 – Map and pixel art

**Goal:** the tile map with 12 sectors. The player can zoom, move the map, select a sector and place a building on a phone and a PC.

**Design sections:** 5.

**Files:** `js/data/sectors.js` · `js/data/buildings.js` · `js/sim/mapgen.js` · `js/render/map.js` · `js/render/camera.js` · `js/render/sprites.js` · `js/ui/input.js` · `js/ui/panels/sector.js` · `assets/sprites/tiles.png` · `assets/sprites/tiles.json` · `tests/mapgen.test.js`

**Tasks:**

- [ ] `mapgen(seed)`: 48 × 30 tiles, 12 sectors with the type counts from section 5. Home Valley is always the start sector. Add roads and houses.
- [ ] Draw colored squares first. Add sprites at the end of the step.
- [ ] Canvas: whole-number scale, `imageSmoothingEnabled = false`, support `devicePixelRatio`.
- [ ] Camera: zoom levels, pan, keep the map in view.
- [ ] `input.js` with Pointer Events: click/tap, drag, pinch, long-press (0.5 s). Set `touch-action: none` on the canvas.
- [ ] Select a sector. The sector panel shows its type, hazard and customers. Locked sectors show a lock.
- [ ] Place a building: pick it, tap a tile, tap ✓. Check the size, the free tiles and the cost.
- [ ] Draw more houses when a sector has more customers.
- [ ] Map view buttons V1–V5 (only Normal and Hazards work now).
- [ ] Draw the sprite sheet (tiles, 6 buildings, houses) and change the squares to sprites.
- [ ] Test: the same seed gives the same tile array (compare a hash).

**Done when:**

- [ ] Pan, zoom, tap and long-press work on a phone. Mouse and keys work on a PC.
- [ ] Buildings stay after save and load.
- [ ] The pixels are sharp on a phone and a PC.

## Step 5 – Grid and outages

**Goal:** each sector has outage hours. Old lines and damage make outages. Crews repair. Customers leave when outages are too long.

**Design sections:** 7.

**Files:** `js/sim/grid.js` · `js/sim/repair.js` · `js/render/particles.js` · `tests/grid.test.js`

**Tasks:**

- [ ] Capacity from substations. Evening peak load from customers.
- [ ] Health change each month (d and the Maintenance budget).
- [ ] Outage hours: H wear, H overload, H damage, H shortage, R, maximum 720.
- [ ] Damage and the repair queue: 1.5 points per technician per week, High → Normal → Low priority.
- [ ] Use H in the churn formula from step 3.
- [ ] Map colors with icons (✓ ! ✕). The "Outage heat map" view.
- [ ] Sector panel: show each part of H.
- [ ] Particles on the lines. A broken line blinks red.
- [ ] Debug: a key that adds damage to the selected sector.
- [ ] Tests: each part of H, the maximum, and the repair speed.

**Done when:**

- [ ] A sector with low health turns yellow, then red.
- [ ] Repair lowers the damage at the right speed.
- [ ] Long outages make customers leave.

## Step 6 – Staff and tech

**Goal:** hire staff, research all 33 techs and deploy them sector by sector.

**Design sections:** 8, 9, 10.

**Files:** `js/data/techTree.js` · `js/sim/workforce.js` · `js/sim/research.js` · `js/sim/deployment.js` · `js/sim/effects.js` · `js/ui/panels/staff.js` · `js/ui/panels/research.js` · `js/ui/panels/projects.js` · `js/ui/techTreeView.js` · `tests/workforce.test.js` · `tests/research.test.js`

**Tasks:**

- [ ] Hire and fire with costs. New staff start next week. Wage slider.
- [ ] Efficiency formula. M comes from the active Organization techs.
- [ ] Research: teams of 3, slots, up to 3 teams per project, queue of 5, RP formula.
- [ ] Deployment: crews of 4, slots, CapEx, time in weeks, status per tech per sector.
- [ ] "Repair first" toggle for technicians.
- [ ] Rush: 1 time per project, cost, ES − 5, crunch counter.
- [ ] Leapfrog: + 60% RP and × 2 deployment time. Fission leap: CS − 25.
- [ ] `techTree.js`: all 33 nodes as data.
- [ ] `effects.js`: one general system that reads effect keys from the data (for example `fLine`, `damageMult.wind`, `managementThreshold`, `unlockTier`, `outageReduce`). No special code per node.
- [ ] Tech tree screen: full graph on PC and tablet, 1 branch as a list on a phone. Status colors and icons.
- [ ] Tests: the efficiency table in section 9, research time, the rush effect.

**Done when:**

- [ ] The player can research and deploy Storm Poles in Home Valley.
- [ ] All 33 nodes load from data with no special code.
- [ ] Projects in progress stay after save and load.

## Step 7 – Meters

**Goal:** Customer, Employee and Government Satisfaction move each month and change the game.

**Design sections:** 11.

**Files:** `js/sim/satisfaction.js` · `js/ui/meters.js` · `tests/satisfaction.test.js`

**Tasks:**

- [ ] Target formulas for CS, ES and GS.
- [ ] Move each meter with r up and r down from the difficulty.
- [ ] Shocks (Rush, fire staff, Fission leap) change the meter at once.
- [ ] Effects below 30: churn × 1.5, strikes, audit fines, price maximum 1.1×.
- [ ] Effects above 75: word of mouth, F ES = 1.2, CapEx − 15%.
- [ ] Top bar meters with ▲ ▼ arrows.
- [ ] Tooltip (tap or hover) lists each part of the target and its value.
- [ ] Save meter values in `history`.
- [ ] Tests: each target formula, the move formula, the 30 and 75 limits.

**Done when:**

- [ ] A price rise makes CS go down slowly, not at once.
- [ ] The tooltip explains each meter change in plain words.

## Step 8 – Growth

**Goal:** the company grows into new sectors and new customer tiers. The 4 phases start at the right months.

**Design sections:** 3 (phases), 5 (open new sectors), 6.

**Files:** `js/data/phases.js` · `js/sim/growth.js` · `js/sim/prosumers.js` · `tests/growth.test.js`

**Tasks:**

- [ ] `phases.js`: start months 1, 41, 101, 181 and what each phase opens.
- [ ] Open a sector: it must touch an owned sector. Cost by phase. Sector limit by phase.
- [ ] Medium, High and Corporate tiers open with their techs.
- [ ] High tier: does not pay in a month when H is over 4 hours (Smart Meters: − 50%).
- [ ] Corporate tier: 50% chance to end the contract when H > 0.5 h. Penalty = 3 × tariff.
- [ ] Prosumers: 2% × F marketing each month in sectors with the Prosumer Program.
- [ ] Market share = player customers ÷ all possible customers in 12 sectors.
- [ ] Map view "Customer tiers".
- [ ] Phase banner: "Phase 2: Regional Grid" with 1 line about what is new.
- [ ] Tests: phase months, sector rules, the Corporate contract rule with a fixed seed.

**Done when:**

- [ ] Phase 2 starts at month 41.
- [ ] The player can open 5 more sectors in Phase 2, but not a 7th.
- [ ] A long outage in a Corporate sector can end a contract.

## Step 9 – Disasters and events

**Goal:** 6 disaster types and event cards. They follow the seed, so a load gives the same future.

**Design sections:** 13.

**Files:** `js/data/disasters.js` · `js/data/events.js` · `js/sim/disasters.js` · `js/sim/eventCards.js` · `js/ui/modals.js` · `js/render/weather.js` · `tests/disasters.test.js`

**Tasks:**

- [ ] Monthly roll for each disaster type. Use season and difficulty values.
- [ ] Choose the sectors. Hazard sectors have a higher chance.
- [ ] Damage with tech values (Storm Poles, Splitters, Underground, Elevated, Shock-Dampened, Wireless).
- [ ] Heatwave: peak + 25% and wholesale at 85% → H shortage.
- [ ] Earthquake stops a fission plant for 2 months.
- [ ] Warnings: 1 week with Weatherproof Sensors (2 weeks on Easy).
- [ ] Storm Prep button: $10,000, damage − 20%, crews start at once.
- [ ] Storm of the Decade: month 110, warning 4 weeks before.
- [ ] Disaster report: damage, what tech saved, time to repair.
- [ ] Event cards: about 1 each 6 months, condition, weight, 2–3 choices with effects.
- [ ] Auto-pause on warnings, disasters and event cards.
- [ ] Rain, wind and flood overlays. Turn them off with "Reduce motion".
- [ ] Tests: the same seed gives the same disasters, also after save and load.

**Done when:**

- [ ] The Storm of the Decade comes at month 110 with a 4-week warning.
- [ ] Storm Poles show a smaller damage number in the report.

## Step 10 – Rivals

**Goal:** Apex Energy and Volt Dynamics enter weak sectors. The player can fight back in 5 ways.

**Design sections:** 12.

**Files:** `js/data/rivals.js` · `js/sim/rivals.js` · `js/ui/panels/rivals.js` · `tests/rivals.test.js`

**Tasks:**

- [ ] Entry score every 3 months. Enter the best sector if the score is more than 25.
- [ ] Strength: start 20, + 3 each month, + 5 when the player's H is over a limit.
- [ ] Customers that move to the rival (formula from section 12).
- [ ] Rival leaves: strength 0, or less than 5% of customers for 6 months.
- [ ] Franchise Charter (R3): the player picks up to 3 sectors. Works while GS ≥ 60.
- [ ] Monopoly Charter (R4): all rivals leave when GS > 75. GS − 10.
- [ ] Buyout: cost formula. The player gets the rival's customers.
- [ ] Local price cut: 10%, 20% or 30%. GS − 2 each month at 30%.
- [ ] Map view "Rival zones". Auto-pause and a news message when a rival enters.
- [ ] Tests: entry score, buyout cost at GS 0, 50 and 100.

**Done when:**

- [ ] On Normal, Apex enters a weak sector at month 55.
- [ ] Each of the 5 actions works and stays after save and load.

## Step 11 – Win and lose

**Goal:** the game can end. The player sees the score, the grade and charts of the full game.

**Design sections:** 14.

**Files:** `js/sim/victory.js` · `js/sim/advisor.js` · `js/data/advisorRules.js` · `js/ui/panels/goals.js` · `js/ui/endScreen.js` · `js/ui/lineChart.js` · `tests/victory.test.js`

**Tasks:**

- [ ] 3 victory paths. Each condition must stay true for 3 months.
- [ ] Goals panel: a progress bar for each path that shows the weakest condition.
- [ ] 3 loss rules with counters and red warning banners.
- [ ] Score formula and grades S, A, B, C, D.
- [ ] End screen: win or loss, grade, score parts, 4 line charts (draw your own small canvas chart).
- [ ] After a loss: buttons to load the last auto-save or a slot.
- [ ] Advisor: rules from `advisorRules.js`, top 3 tips, Apply buttons, "Apply suggested budget".
- [ ] Advisor opens with the O5 tech. On Easy, a basic Advisor is on from the start.
- [ ] Debug: jump to a state that wins or loses.
- [ ] Tests: each win and each loss rule, the score formula.

**Done when:**

- [ ] Debug jumps trigger each of the 3 wins and each of the 3 losses.
- [ ] The game ends after December 2049 with a score.

## Step 12 – Tutorial, accessibility, touch and sound

**Goal:** a new player can learn the game alone, on a phone, a tablet or a PC, with or without sound.

**Design sections:** 15.

**Files:** `js/ui/tutorial.js` · `js/ui/settings.js` · `js/ui/readAloud.js` · `js/ui/keys.js` · `js/audio/audio.js` · `assets/sounds/` · `js/ui/credits.js`

**Tasks:**

- [ ] Tutorial: 8 steps from section 15. Pause until the player does each step. A Skip button.
- [ ] Settings: font (Atkinson Hyperlegible, Lexend, system), text size 90–150%, high contrast, reduce motion, battery saver, auto-pause on project done.
- [ ] Read aloud: 🔊 button on event cards and reports with `speechSynthesis`.
- [ ] Keys for all actions. The `?` key shows the list.
- [ ] Check the color-blind palette. Each color has an icon or a pattern.
- [ ] Finish the 3 layouts: drawer on tablet, bottom bar and bottom sheet on phone.
- [ ] All buttons and tabs are at least 44 × 44 px. Sliders have + / − buttons.
- [ ] `audio.js`: Web Audio API. Start on the first New Game or Continue click.
- [ ] 2–3 music loops (calm, tense) and the sound effects from section 15.
- [ ] Music volume, Effects volume and a Mute button in the top bar.
- [ ] Each sound also has a visual signal.
- [ ] Credits screen with the sources and licenses of fonts, art and sounds.

**Done when:**

- [ ] A new player finishes the tutorial with no help on a phone, a tablet and a PC.
- [ ] The game is fully playable with sound off and with "Reduce motion" on.
- [ ] At 150% text size, no text is cut off.

## Step 13 – Balance

**Goal:** the numbers give a fun 2-hour game. Each victory path is possible, and no path is too easy.

**Design sections:** 18.

**Files:** `tools/sim-runner.js` · `tools/bots/idle.js` · `tools/bots/balanced.js` · `tools/bots/rusher.js` · `tools/bots/pennyPincher.js` · `tools/bots/pathMonopoly.js` · `tools/bots/pathSingularity.js` · `tools/bots/pathUtopia.js` · `docs/balance-log.md`

**Tasks:**

- [ ] Sim runner: options `--seed`, `--difficulty`, `--bot`, `--months`. Write a CSV with 1 row per month.
- [ ] 7 bots. Each bot uses the same `dispatch` actions as the UI.
- [ ] Run each bot with 20 seeds on each difficulty.
- [ ] Compare the results with the balance targets in section 18.
- [ ] Change only the files in `js/data/`. Write each change and its reason in `docs/balance-log.md`.
- [ ] Playtests: 3 people for each difficulty. Write down the real time at the end of each phase.
- [ ] Fix the 5 biggest problems from the playtests.

**Done when:**

- [ ] All targets in section 18 pass in at least 16 of 20 seeds.
- [ ] Playtesters on Normal finish in 100–130 minutes at mostly 1x speed.

## Step 14 – Release

**Goal:** version 1.0 is online and works on all test devices.

**Design sections:** 16, 19.

**Files:** `manifest.json` · `assets/icons/` · `README.md`

**Tasks:**

- [ ] Fix all known bugs. Remove console errors and warnings.
- [ ] The debug panel opens only with `?debug=1`.
- [ ] Set `gameVersion` to `1.0.0`. Lock `saveVersion` 1. Each later change to the state needs a migration.
- [ ] Add a favicon, app icons and `manifest.json` (players can add the game to the home screen).
- [ ] `README.md`: how to run, how to test, how to play.
- [ ] Test on iPhone (Safari), Android (Chrome), iPad and PC (Chrome, Firefox, Edge).
- [ ] Play 1 full game (2 hours) on Normal.
- [ ] Put the game online: GitHub Pages, or itch.io (upload a ZIP with `index.html` at the top level).
- [ ] Note: the online site is a new origin. Saves from `localhost` do not move to it.

**Done when:**

- [ ] A full 2-hour game has no errors on all test devices.
- [ ] The online link works on a phone and a PC.

## After version 1.0

- [ ] Export and import of save files (design section 16).
- [ ] Answer the open question about power lines (player draws them or not).
