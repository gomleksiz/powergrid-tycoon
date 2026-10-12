# PowerGrid Tycoon

A browser strategy game: run an electric company from Jan 2030 to Dec 2049.
Plain HTML, CSS and JavaScript modules. No build step, no server code. Saves stay in the browser (localStorage).

## Run

```bash
npm start            # = npx serve -l 8080
```

Open <http://localhost:8080>. Always use port 8080: saves belong to the origin, so another port looks like an empty save list.

On a phone on the same Wi-Fi, open `http://<your-PC-IP>:8080`. The phone has its own saves.

## Test

```bash
npm test                                              # node --test
npm run sim -- --seed 42 --difficulty normal --months 24   # headless sim, CSV to stdout
```

## Keys

| Key | Action |
| --- | --- |
| Space | Pause / play |
| 1, 2, 3 | Speed 1x, 2x, 5x |
| Esc | Pause menu |

## Folders

```
index.html
css/            base.css (tokens, font), layout.css (3 layouts), screens.css
js/main.js      entry point
js/core/        loop, store, bus, rng, time, session
js/data/        all numbers (balance.js) and all text (text.js)
js/sim/         game rules – no DOM, no Math.random()
js/save/        save.js, migrate.js, checksum.js
js/ui/          screens, panels, dialogs, keys
js/render/      canvas drawing
assets/         fonts, sprites, sounds, icons
tests/          node --test
tools/          sim runner, sprite maker (node tools/make-sprites.js)
design/         the design document and the development steps
docs/           design-notes.md: choices where the design leaves a gap
```

## Put it online

The game is static files only. Any static host works:

- **cPanel:** upload everything except `node_modules/`, `tests/`, `tools/` and `design/` into `public_html/` (or a sub-folder) with the File Manager or FTP. PHP and MySQL are not needed.
- **GitHub Pages** or **itch.io** (ZIP with `index.html` at the top level).

The online site is a new origin: saves from `localhost` do not move to it.

## Progress

- [x] Step 1 – Skeleton
- [x] Step 2 – Save and load
- [x] Step 3 – Money
- [x] Step 4 – Map and pixel art
- [x] Step 5 – Grid and outages
- [x] Step 6 – Staff and tech
- [x] Step 7 – Meters
- [x] Step 8 – Growth
- [x] Step 9 – Disasters and events
- [x] Step 10 – Rivals
- [x] Step 11 – Win and lose
- [ ] Step 12 – Tutorial, accessibility, touch and sound

## Credits

- Font: Atkinson Hyperlegible, © Braille Institute of America, SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
