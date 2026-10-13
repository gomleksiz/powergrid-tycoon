# PowerGrid Tycoon

A browser strategy game: run an electric company from January 2030 to December 2049.
About 2 hours at 1x speed. Phone, tablet and PC. Easy, Normal and Hard.

Plain HTML, CSS and JavaScript modules. No build step, no framework, no server code.
Saves stay in the browser (localStorage). The whole game is about 215 KB.

## How to run

```bash
npm start            # = npx serve -l 8080
```

Open <http://localhost:8080>. Always use port 8080: saves belong to the origin, so another port looks like an empty save list.

On a phone on the same Wi-Fi, open `http://<your-PC-IP>:8080`. The phone has its own saves.

## How to test

```bash
npm test                 # all tests, including the balance targets (about 10 s)
npm run sim -- --seed 42 --difficulty normal --bot balanced   # 1 game, CSV (1 row a month) to stdout
npm run balance          # all 7 bots × 20 seeds × 3 difficulties, checks design section 18
```

Bots: `idle`, `balanced`, `rusher`, `pennyPincher`, `pathMonopoly`, `pathSingularity`, `pathUtopia` (`tools/bots/`).

Debug: open the game with `?debug=1`, then press **F9** for the debug panel (speed 20x, cash, meters, jump to a month, disasters, event cards, unlock a tech, win and loss set-ups, seed, state to the console). **K** adds damage to the selected sector.

## How to play

You start with 1 town, Home Valley, 2,500 customers (Normal) and 1 substation. A rival comes from month 1.

1. **Money:** set the budget (Budget tab) and the price of each customer tier. Each budget slider shows what it does now and where more money does nothing. The bank lends more as you grow. Watch the monthly report.
2. **Grid:** old lines and storms cause outage hours. Outages make customers leave. Raise Maintenance, hire technicians, set repair priority. New customers connect only while your substations have room: build substations as you grow.
3. **Tech:** engineers research (Research tab, tech tree with T); technicians deploy tech in each sector (Projects tab).
4. **Grow:** from month 41 open new sectors (tap a sector, "Open this sector"). Unlock Medium, High and Corporate customers with tech.
5. **Meters:** keep Customer, Employee and Government Satisfaction up. Tap a meter to see why it moves.
6. **Rivals and disasters:** Apex Energy, Volt Dynamics and Nova Power take customers and run sales drives (Hard: 2 rivals from month 1). Storms, floods, quakes and heatwaves damage the grid and can break buildings; strikes, fires and cyber attacks come as event cards.
7. **Offices:** hire a Project Manager (Staff tab). It warns you about idle staff and stuck projects, and can start research and deployments by itself. Or press **Schedule all** in the Projects tab.
8. **Live board:** the 📊 Board (key D) shows the whole company: money, power use and production, every city with its customers, rival and outages, rival prices and disasters. 🗺 Map shows the map. Build from the Sector tab: the game picks the place.
9. **Outages:** the Sector tab shows how many technicians repair there (also 🔧 on the map) and **What to do**, with a button for each tip: repair a broken building, call an emergency crew (contractors start at once and do not strike), hire, upgrade. Station technicians in a city (Local crew) so they fix it first.
10. **Growth and power:** from 2038 the towns grow each year, and each home needs a bit more power at the peak. The region gets power shortages; own plants keep the lights on. Upgrade buildings to level 2 and 3 (Sector tab). Sell power to the government in a shortage (Budget tab → Energy market).
11. **Marketing:** a Marketing department runs price campaigns (Customers tab), for example 50% off for 6 months. When you are cheaper than a rival, its customers switch to you and it starts a price war.
12. **Win** one of 3 paths (Goals tab) and keep it for 3 months: Corporate Monopoly, Technological Singularity or Decentralized Utopia. You lose by bankruptcy, a revoked license (GS below 10) or customer collapse.

The tutorial (on by default for Easy and Normal) teaches the first steps.

### Keys

| Key | Action |
| --- | --- |
| Space | Pause / play |
| 1, 2, 3 | Speed 1x, 2x, 5x |
| Esc | Pause menu (or stop building) |
| + / −, arrows | Zoom, move the map |
| V | Next map view |
| E B R P S C X G | Tabs: Sector, Budget, Research, Projects, Staff, Customers, Rivals, Goals |
| T | Tech tree |
| N | News log |
| M | Mute |
| ? | Key list |

## Put it online

```bash
npm run package          # → dist/powergrid-tycoon-1.2.0.zip (index.html at the top level)
```

The ZIP has only the files the game needs. Any static host works:

- **cPanel:** File Manager → `public_html` (or a sub-folder such as `public_html/powergrid`) → Upload the ZIP → Extract. PHP and MySQL are not needed. The game works from a sub-folder.
- **itch.io:** new HTML project, upload the ZIP, "This file will be played in the browser".
- **GitHub Pages:** put the files from the ZIP in the published branch or folder.

The online site is a new origin: saves from `localhost` do not move to it. Players can add the game to their home screen (`manifest.json`).

## Folders

```
index.html, manifest.json
css/            base.css (tokens, fonts, themes), layout.css (3 layouts), components.css, screens.css
js/main.js      entry point
js/core/        loop, store, bus, rng, time, session
js/data/        all numbers and all text (balance.js, difficulty.js, techTree.js, text.js, ...)
js/sim/         game rules – no DOM, no Math.random()
js/save/        save.js, migrate.js, checksum.js
js/ui/          screens, panels, dialogs, tutorial, settings, keys
js/render/      canvas drawing (map, views, weather, particles)
js/audio/       music and sound effects (Web Audio API)
assets/         fonts, sprites, icons
tests/          node --test
tools/          sim runner, bots, balance check, sprite and icon makers, package
design/         the design document and the development steps
docs/           design-notes.md (choices where the design has gaps), balance-log.md
```

## Saves

`saveVersion` is still 1 in version 1.2.0: all new fields have start values in `createState()`, so 1.0 and 1.1 saves load as they are. Each later change to the game state needs a migration step in `js/save/migrate.js` (new fields get their start value from `createState()` by themselves).

## Progress

- [x] Steps 1–12 – the full game
- [x] Step 13 – Balance with bots: all 10 targets pass on Normal (`docs/balance-log.md`)
- [x] Step 14 – Release build: version 1.0.0, debug panel, icons, manifest, package
- [x] Version 1.1 – Project Manager, Schedule all, outage help and crews on the map, growth, regional shortages and selling to the government, upgrades, Marketing campaigns and price wars; alerts pause only while they are open (`docs/design-notes.md`, `docs/balance-log.md`)
- [x] Version 1.2 – a harder game: rivals from month 1, a third rival and sales drives, bigger towns with a connection limit, customer service costs, stronger price effects, broken buildings, emergency crews, strikes and new event cards; then a live board, building from the panel, local crews, budget effects, loans that grow, disasters without pop-ups (`docs/design-notes.md`, `docs/balance-log.md`)
- [ ] Playtests with people (3 for each difficulty) and tests on real devices: iPhone (Safari), Android (Chrome), iPad, PC (Chrome, Firefox, Edge)
- [ ] Put it online
- Later (after 1.0): export and import of save files; the open question about power lines

## Credits

- Fonts: Atkinson Hyperlegible (© Braille Institute of America) and Lexend (© The Lexend Project Authors), both SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`).
- Pixel art and icons: drawn in code by `tools/make-sprites.js` and `tools/make-icons.js`.
- Music and sound effects: made in code with the Web Audio API (`js/audio/audio.js`).
