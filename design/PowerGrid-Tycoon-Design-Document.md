# PowerGrid Tycoon – Game Design Document v2

Oct 11, 2026 · @Huseyin Gomleksizoglu

## 1. Summary of changes from v1

Version 2 keeps your game idea. It fixes 14 problems so that you can build the game from this plan.

The v1 plan was good. But some formulas did not work, some parts did not agree, and some data was missing. The table shows each problem and the fix.

| # | Problem in v1 | Fix in v2 | Section |
| --- | --- | --- | --- |
| 1 | The game ticks once a month. But outage limits are in hours. The game cannot measure hours. | The game calculates **outage hours** for each sector each month. | 7 |
| 2 | The efficiency formula makes the team slower from the first hire. | Efficiency is 100% up to the limit. It goes down only after the limit. | 9 |
| 3 | One formula uses engineers and technicians together for all projects. | Research uses engineers. Deployment uses technicians. Each has its own slots. | 8 |
| 4 | The tech tree has 13 nodes. This is too small for 2 hours. Some nodes in the text are not in the tree. | The tree has 33 nodes in 7 branches. All nodes have cost, time and effect. | 10 |
| 5 | Solar needs batteries. But batteries are not in the tree. | A new **Storage** branch. | 10 |
| 6 | The AI Advisor opens at month 60. The pacing table uses it at 1:30 (month 180). | The Advisor is a tech node in Phase 3. | 14 |
| 7 | The satisfaction meters have no formulas. | Each meter has a target formula and a slow drift. | 11 |
| 8 | There is no way to lose. | 3 loss conditions and a final score. | 14 |
| 9 | Speed 2x and 5x make the game shorter than 2 hours. | 2 hours is the time at 1x. A pause button and auto-pause on events. | 3 |
| 10 | The player cannot set prices. | A tariff slider for each customer tier. | 6 |
| 11 | Debt is in the state, but there are no loans. | A loan system with interest. | 6 |
| 12 | Victory needs "100%" prosumer solar. This is almost impossible. | Victory needs 80%. Values change with difficulty. | 14 |
| 13 | No save and load design. | Auto-save, 3 slots, version numbers and safe load. | 16 |
| 14 | No difficulty, tutorial or accessibility plan. | 3 difficulty modes, a short tutorial and a dyslexia-friendly UI. | 4, 15 |

**Your choices from our talk:**

- Players: everyone, with Easy, Normal and Hard modes.
- Map: top-down tile grid with pixel art.
- Devices: phone, tablet and PC.
- Code: several files (HTML, CSS, JavaScript modules).
- Save: auto-save in the browser and 3 save slots. Export and import come later.
- Sound: music and sound effects. The player can turn them off.
- Language: English.

All numbers in this plan are **first values**. Change them after playtests (section 18).

## 2. Game overview and core loop

The player runs a small power company for 20 game years (240 months). The player buys power, sells it, makes the grid better, and tries to win 1 of 3 victory paths.

| Item | Value |
| --- | --- |
| Game type | Strategy tycoon, single player |
| Platform | Web browser (HTML5 Canvas and JavaScript) |
| Length | About 2 hours at 1x speed |
| Players | Everyone. 3 difficulty modes. |
| Save | Auto-save and 3 save slots in the browser |

### Core loop

The game has 2 clocks:

- **Week tick** (4 times each month). Projects move forward. Crews repair damage. A disaster can start.
- **Month tick** (1 time each month). Money, customers and the 3 meters change.

Each month, these steps occur in this order:

1. **Collect money.** Customers pay. The company pays for energy, wages, upkeep and loan interest.
2. **Set the plan.** The player moves budget sliders and price sliders.
3. **Give work.** The player starts research projects and field projects.
4. **Calculate the grid.** The game finds outage hours in each sector.
5. **Update the meters.** Customer, Employee and Government satisfaction change.
6. **Outside events.** Rivals and disasters act.
7. **Show the report.** A short monthly report shows what changed and why.

*Diagram: core loop, 7 month steps and 4 week ticks (see the Word or PDF file).*

The player acts in steps 2 and 3. The game does all other steps. After the report, 4 week ticks run, then the next month starts.

### Design rules

- **Clear choices.** Each choice has a cost and a benefit. The game shows both before the player clicks.
- **Easy to read.** Each number has an icon, a label and a tooltip.
- **No grind.** The game is 2 hours long. Each phase adds a new problem.

## 3. Time, pacing and game speed

One game month is 30 seconds at 1x speed. 240 months × 30 seconds = 120 minutes.

### Calendar

- The game starts in **January 2030**. It stops after **December 2049**.
- 1 month = 4 weeks. 1 week = 7.5 seconds at 1x.
- Seasons: Spring = Mar–May. Summer = Jun–Aug. Fall = Sep–Nov. Winter = Dec–Feb.

### Speed buttons

| Button | Seconds for 1 month | Keyboard key |
| --- | --- | --- |
| Pause | – | Space |
| 1x | 30 | 1 |
| 2x | 15 | 2 |
| 5x | 6 | 3 |

**Note:** A player who uses 2x a lot finishes in about 75–90 minutes. This is fine. The 2-hour target is for 1x.

### Auto-pause

The game pauses by itself when:

- A disaster warning or a disaster starts.
- An event card needs a choice.
- A rival enters a sector.
- The player wins or loses.
- A project finishes (the player can turn this off in Settings).

### Phases

Each phase adds new problems. A phase starts at a fixed month.

| Phase | Months | Time at 1x | What is new | Player focus |
| --- | --- | --- | --- | --- |
| 1. Village Reseller | 1–40 | 0:00–0:20 | 1 sector. Low tier customers. Tutorial. | Learn the money flow. Fix line breaks. Set prices. |
| 2. Regional Grid | 41–100 | 0:20–0:50 | Sectors 2–6. Medium and High tiers. Staff limit. First rival at month 55. | Grow. Pick storm poles or the underground leap. |
| 3. Rival and Storm Wars | 101–180 | 0:50–1:30 | All 12 sectors. Corporate tier. Second rival. "Storm of the Decade" at month 110. Advisor tech. | Defend market share. Pass laws. Survive the big storm. |
| 4. Endgame | 181–240 | 1:30–2:00 | Victory progress bars. Last events. | Put all money into 1 victory path. |

## 4. Difficulty modes

The player picks Easy, Normal or Hard at the start. The game stores the choice in the save file. The player cannot change it later.

Put all these values in one data file (`js/data/difficulty.js`). Then you can tune them without a code change.

| Setting | Easy | Normal | Hard |
| --- | --- | --- | --- |
| Start cash | $250,000 | $150,000 | $80,000 |
| Start customers (Low tier) | 2,400 | 2,000 | 1,600 |
| Wholesale price at start | $0.045 / kWh | $0.05 / kWh | $0.055 / kWh |
| Disaster chance | × 0.5 | × 1.0 | × 1.5 |
| Disaster warning | 2 weeks, always | 1 week, with sensor tech | None without sensor tech |
| First rival enters | Month 80 | Month 55 | Month 40 |
| Rival growth speed | × 0.5 | × 1.0 | × 1.5 |
| Meter speed up / down (section 11) | 0.25 / 0.10 | 0.20 / 0.20 | 0.15 / 0.30 |
| Months of negative cash before bankruptcy | 6 | 3 | 2 |
| Loan limit | $500,000 | $300,000 | $150,000 |
| Victory cash (Monopoly path) | $30M | $50M | $75M |
| Victory market share (Monopoly path) | 80% | 90% | 95% |
| Score multiplier | × 0.75 | × 1.0 | × 1.5 |
| Advisor hints | Always on | After the tech | After the tech |

**Easy mode is for families and new players.** It also shows more help text and asks before a risky action (for example, "This tariff will make customers leave. Continue?").

## 5. Map: top-down tile grid

The map is a top-down grid of 48 × 30 tiles. It has 12 sectors (4 across, 3 down). Each sector is 12 × 10 tiles.

### Size

- 1 tile = 24 × 24 pixels. The full map = 1152 × 720 pixels.
- CSS scales the canvas to fit the screen. Keep the pixel art sharp (`image-rendering: pixelated`).
- The player can zoom and move the map with a mouse, keys or touch (see "Controls" below).

### Art style: pixel art

- 1 tile = 24 × 24 pixels. All tiles are in 1 sprite sheet (`assets/sprites/tiles.png`) with a small JSON list of names and positions.
- Use a small palette (about 32 colors). Important states (broken line, outage, rival) also have an icon, not only a color.
- Scale the canvas by whole numbers (1×, 2×, 3×) when possible. Set `ctx.imageSmoothingEnabled = false`. Then the pixels stay sharp.
- Buildings are 1×1 to 3×3 tiles. Some have 2–4 animation frames (wind turbines, water, power flow).
- **Text is not pixel art.** All text uses the readable font from section 15. A pixel font is hard to read for players with dyslexia.
- Start step 4 with colored squares. Change them to sprites later. Free tools: Piskel (in the browser), LibreSprite or Aseprite.

### Controls

Use **Pointer Events** in the code. Then one code path works for mouse, touch and pen. Set `touch-action: none` on the canvas so the browser does not zoom the page.

| Action | PC | Phone and tablet |
| --- | --- | --- |
| Zoom | Mouse wheel or + / − keys | Pinch with 2 fingers |
| Move the map | Drag | Drag with 1 finger |
| Select a sector | Click | Tap |
| Show a tooltip | Hover | Long-press (0.5 s) or the ⓘ button |
| Place a building | Click a tile | Tap a tile, then tap ✓ to confirm. This stops mistakes. |

### Sector types

The game makes the map from a **seed number**. The same seed gives the same map. The start sector is always "Home Valley" (Town).

| Sector type | Count | Possible customers | Hazard |
| --- | --- | --- | --- |
| Town | 3 | Low 3,000 · Medium 500 | Normal |
| Suburb | 3 | Low 1,000 · Medium 2,500 · High 100 | Normal |
| Commercial | 2 | Medium 300 · High 600 · Corporate 10 | Normal |
| Industrial | 1 | High 200 · Corporate 40 | Normal |
| River Valley | 1 | Low 2,000 · Medium 800 | Flood × 3 |
| Hills | 1 | Low 1,500 · Medium 600 | Windstorm × 2. Wind farm + 30% |
| Fault Line | 1 | Medium 1,000 · High 300 · Corporate 5 | Earthquake × 4 |

### Open new sectors

- A new sector must touch a sector that the player has.
- Cost: $50,000 in Phase 2. $150,000 in Phase 3 and 4.
- Phase 1 has only Home Valley. Phase 2 lets the player have up to 6 sectors. Phase 3 opens all 12.

### What the player does on the map

1. **Click a sector.** The side panel shows its customers, outage hours, tech level, health and rivals.
2. **Place a building.** The player picks a building and clicks an empty tile.
3. **Set repair priority.** High, Normal or Low. Crews go to High sectors first.

| Building | Size (tiles) | Effect |
| --- | --- | --- |
| Substation | 1 × 1 | + 5 MW capacity in the sector |
| Battery bank | 1 × 1 | Stores solar power for the night |
| Solar farm | 2 × 2 | + 2 MW in the day |
| Wind farm | 2 × 2 | + 1.5 MW when wind blows. + 30% in Hills. |
| Fission plant | 3 × 3 | + 25 MW |
| Fusion plant | 3 × 3 | + 80 MW. No wholesale power needed. |

Power lines draw by themselves along roads between substations. The player does not draw lines. This keeps the game simple.

### Map views

The player can change the view with buttons or keys V1–V5:

1. Normal
2. Outage heat map
3. Customer tiers
4. Rival zones
5. Hazards

**Accessibility rule:** Each view also uses icons or patterns, not only color. Then color-blind players can read it.

### Animations

- Small dots move along lines to show power flow.
- A broken line blinks red and shows a ⚡ icon.
- Rain, wind and flood overlays during disasters.
- New houses appear when a sector gets more customers.

## 6. Customers, prices and money

Money comes from 4 customer tiers. The player sets a price slider for each tier. Each tier has an outage limit in hours each month.

### Customer tiers

| Tier | Base tariff / month | Energy / month | Peak load | Outage limit / month | Unlocked by | Over the limit |
| --- | --- | --- | --- | --- | --- | --- |
| Low (Residential Basic) | $50 | 400 kWh | 1.2 kW | 48 h | Start | Small churn |
| Medium (Suburban) | $120 | 900 kWh | 2.5 kW | 12 h | Targeted Grid Ads | Medium churn. Moves to rivals. |
| High (Commercial) | $250 | 2,500 kWh | 8 kW | 4 h | B2B Sales Team | High churn. Does not pay for that month. |
| Corporate (Industrial) | $6,000 | 60,000 kWh | 120 kW | 0.5 h | Corporate Direct Sales | 50% chance to end the contract. Penalty = 3 × tariff. |

**Change from v1:** The Corporate tariff went from $1,200 to $6,000. With $1,200, this tier gave less than 2% of the money. Now it gives about 12% of the maximum revenue (65 customers × $6,000 = $390,000 of about $3.1M a month). This makes Corporate customers worth the risk.

### Price sliders

- Each tier has a **tariff multiplier** from 0.6× to 1.5×. The start value is 1.0×.
- A low price brings more customers. A high price brings more money but more churn and lower Customer Satisfaction.

### Monthly money

$$
\text{Revenue} = \sum_{i \in \text{tiers}} N_i \times T_i \times m_i \; - \; \text{WithheldHigh}
$$

$$
\text{EnergyCost} = \max(0,\; D_{\text{total}} - G_{\text{own}}) \times P_{\text{wholesale}} \; - \; 0.5 \times \max(0,\; G_{\text{own}} - D_{\text{total}}) \times P_{\text{wholesale}}
$$

$$
\text{Net} = \text{Revenue} - \text{EnergyCost} - \text{Wages} - \text{Upkeep} - \text{Budget} - \text{Interest} - \text{Penalties} - \text{Tax}
$$

The words in the formulas:

- N = number of customers in the tier. T = base tariff. m = price slider.
- D total = all kWh that customers use this month. G own = kWh from the player's own plants.
- The company sells extra power back at 50% of the wholesale price.
- Upkeep = $2,000 per sector + $500 per building, each month.
- Tax = 20% of positive profit. The Municipal Lobbying tech lowers tax on CapEx by 10%.

### Wholesale price

The wholesale price changes each month:

$$
P_{\text{wholesale}} = P_{\text{base}} \times S_{\text{season}} \times W_{\text{walk}} \times E_{\text{event}}
$$

- Season: Summer × 1.25. Winter × 1.15. Other × 1.0.
- Walk: a random change of ± 3% each month. Keep it between 0.7 and 1.6.
- Event: for example, "Fuel crisis" × 1.5 for 3 months.

### New customers each month

For each tier in each sector:

$$
\text{New}_i = (\text{Potential}_i - N_i - \text{Rival}_i) \times 0.02 \times F_{\text{marketing}} \times F_{\text{price}} \times F_{CS}
$$

- F marketing = 0.5 + (marketing budget ÷ $20,000). Maximum 2.0.
- F price = 2 − m. (Price 0.6× gives 1.4. Price 1.5× gives 0.5.)
- F CS = 0.5 + CS ÷ 100. Add 0.1 when CS is more than 75 (word of mouth).
- A tier must be unlocked by its tech. Else, New = 0.

### Lost customers (churn) each month

$$
\text{Lost}_i = N_i \times \left( b_i + k_i \times \max\left(0, \frac{H}{L_i} - 1\right) + 0.04 \times \max(0,\; m_i - 1) \right)
$$

- H = outage hours in the sector this month (section 7). L = outage limit of the tier.
- Base churn b: Low 0.5%, Medium 1%, High 1.5%, Corporate 0%.
- Outage factor k: Low 2%, Medium 5%, High 8%. Maximum total churn: 25% a month.
- Corporate customers use the contract rule in the tier table, not this formula.

### Budget sliders

1. The player sets **total budget** as a percent of last month's revenue (10% to 60%).
2. The player splits the budget across 5 sliders: Marketing, R&D materials, Maintenance, Lobbying and PR.
3. The 5 sliders always add up to 100%. When the player moves one slider, the others change to keep 100%. A lock icon stops a slider from changing.

### Loans

- The player can take a loan in steps of $50,000, up to the difficulty limit.
- Interest = 1% of the debt each month.
- The player can pay back at any time.
- When cash goes below $0, the game takes an emergency loan if the limit allows. If not, the bankruptcy counter starts (section 14).

## 7. Grid simulation: capacity and outages

The game does not simulate each hour. It calculates **outage hours (H)** for each sector each month with one formula. This is fast and easy to test.

### Two limits in each sector

1. **Distribution capacity.** Substations and lines carry power. If the evening peak load is more than the capacity, rolling blackouts occur.
2. **Supply.** Usually the wholesaler sells all the power you need. But during a **Supply Crunch** event or a summer heatwave, the wholesaler gives less. Then your own plants, batteries and the VPP must fill the gap.

**Solar rule:** Solar farms do not help at the evening peak. Only battery banks can store solar power for the evening. This is why solar needs batteries.

### Outage hours formula

$$
H = \min\left(720,\; H_{\text{wear}} + H_{\text{overload}} + H_{\text{damage}} + H_{\text{shortage}}\right) \times R
$$

| Part | Formula | Meaning |
| --- | --- | --- |
| H wear | (100 − Health) ÷ 100 × 20 × f line | Old lines fail more. f line: Overhead 1.0, Storm Poles 0.7, Underground 0.3, Wireless 0.1. |
| H overload | 120 × max(0, (Peak − Capacity) ÷ Peak) | Rolling blackouts at the evening peak (about 4 h a day). |
| H damage | Sum of 168 × (Damage ÷ 100) for each week | Damage from disasters that is not repaired yet. |
| H shortage | 120 × (supply gap ÷ Peak) | Only during Supply Crunch or heatwave. |
| R | 1.0 − tech reductions | Smart Meters − 10%. Grid Operations Center − 20%. Minimum 0.5. |

720 is the number of hours in a month. H cannot be more than 720.

### Sector health

Each sector has **Health** from 0 to 100. Each month:

$$
\text{Health}_{\text{new}} = \text{Health} - d + \frac{\text{Maintenance budget for the sector}}{\$2{,}500}
$$

- d = 2 for overhead lines. d = 1 for underground. d = 0.5 for wireless.
- The game splits the Maintenance budget across sectors by size.
- If Health is less than 40, small random failures can occur.

### Damage and repair

- Disasters add **Damage** (0 to 100) to a sector.
- Each field technician on repair fixes 1.5 damage points each week. Multiply by Efficiency (section 9) and the ES bonus or penalty (section 11).
- Crews go to sectors with High priority first, then Normal, then Low.
- The Automated Line Splitters tech cuts storm damage by 50%.

### Colors on the map

- **Green:** H is less than the limit of all tiers in the sector.
- **Yellow:** H is more than the limit of 1 tier.
- **Red:** H is more than 48 hours.

Each color also has an icon: ✓, ! and ✕.

## 8. Research and field deployment

A technology has 2 steps. **Research** unlocks it. **Deployment** puts it in each sector. Engineers do research. Technicians do deployment. They do not share slots.

### Status of a technology

The research status belongs to the tech. The deployment status belongs to the tech **and** the sector.

1. `LOCKED` – a prerequisite is missing.
2. `AVAILABLE` – the player can start research.
3. `RESEARCHING` – a team works on it.
4. `UNLOCKED` – research is done.
5. `DEPLOYING` – a crew works on it in 1 sector.
6. `ACTIVE` – it works in that sector.

Some techs (Regulatory, Organization and PR) need no deployment. They go to `ACTIVE` everywhere when research is done. The tech table (section 10) shows this.

### Research

- 1 research team = 3 engineers.
- Research slots = floor(idle engineers ÷ 3).
- The player can put up to 3 teams on one project.
- The player can queue up to 5 projects. When a slot is free, the next project starts.

$$
\text{RP per month} = \text{Engineers on the project} \times 10 \times \text{Efficiency} \times F_{ES} \times F_{RD}
$$

- F ES = Employee Satisfaction factor (section 11).
- F RD = 0.75 + (R&D materials budget ÷ $15,000). Maximum 1.5.
- 1 team with no bonus makes 30 RP each month.

### Deployment

- 1 field crew = 4 technicians.
- Deployment slots = floor(idle technicians ÷ 4).
- Technicians on repair work are not idle. The player decides: repair first or build first. A toggle sets the default: "Repair first".
- 1 crew works on 1 sector at a time.
- The player pays the CapEx when the project starts.

### Rush

- The player can rush 1 time per project.
- Cost: 50% of the original project cost (RP projects: $ equal to RP × $50).
- Effect: the time left is cut by 50%.
- Side effect: the team works overtime. Employee Satisfaction goes down 5 points at once. The "crunch" counter goes up by 1 for 3 months (section 11).

### Example

The player researches Reinforced Storm Poles (300 RP) with 2 teams (60 RP each month). It takes 5 months. Then 1 crew deploys it in Home Valley in 6 weeks for $25,000.

## 9. Staff, wages and efficiency

The company has 3 staff roles. More staff do more work, up to the **Management Threshold (M)**. After M, each new person adds less.

### Staff roles

| Role | Wage / month | Start count | Job | If you have too few |
| --- | --- | --- | --- | --- |
| Research Engineer | $5,000 | 3 | Research (section 8) | New tech is slow. |
| Field Technician | $3,500 | 4 | Deployment and repair | Repairs wait. Outages grow. |
| PR and Policy Specialist | $4,000 | 1 | Marketing and lobbying power | Weak campaigns. Weak defense against rivals. |

- **Hire:** costs 1 month of wage. The person starts next week.
- **Fire:** costs 1 month of wage. Employee Satisfaction goes down 3 points.
- **Wage slider:** 0.8× to 1.3× for all staff. A high wage raises Employee Satisfaction.
- **PR effect:** each PR specialist adds 10% to marketing and 15% to lobbying.

### Efficiency formula (fixed)

The v1 formula made the team slower from the first hire. At M, it gave the minimum (35%). The new formula is 100% up to M:

$$
\text{Efficiency} = \begin{cases} 1 & \text{if } S \le M \\ \max\left(0.35,\; \left(\dfrac{M}{S}\right)^{0.8}\right) & \text{if } S > M \end{cases}
$$

S = total staff. M = Management Threshold.

Example with M = 25:

| Total staff (S) | Efficiency | Real work (S × Efficiency) |
| --- | --- | --- |
| 20 | 100% | 20.0 |
| 30 | 86% | 25.9 |
| 40 | 69% | 27.5 |
| 60 | 50% | 29.8 |
| 80 | 39% | 31.5 |

The real work still goes up after M, but very slowly. Each new person costs a full wage. So the player wants to raise M.

### Raise the Management Threshold

| Tech (Organization branch) | M after |
| --- | --- |
| Start | 25 |
| Modular Project Management | 45 |
| Autonomous Drone Logistics | 70 |
| Enterprise Resource Planning | 100 |

The staff panel shows S, M and Efficiency as a bar. The bar turns yellow at 90% of M and red over M.

### Month 1 check (Normal)

The first month must be close to break-even. Then the player has time to learn.

| Item | Amount |
| --- | --- |
| Revenue: 2,000 Low × $50 | + $100,000 |
| Energy: 800,000 kWh × $0.05 | − $40,000 |
| Wages: 3 engineers, 4 technicians, 1 PR | − $33,000 |
| Upkeep: 1 sector, 2 buildings | − $3,000 |
| Budget sliders: 20% of revenue | − $20,000 |
| **Net before tax** | **+ $4,000** |

## 10. Technology tree

The tree has 33 nodes in 7 branches. 3 nodes are active at the start. The player can research the other 30.

All research costs follow the tier:

| Tier | Research cost | Time with 1 team | Time with 3 teams |
| --- | --- | --- | --- |
| 1 | 90 RP | 3 months | 1 month |
| 2 | 300 RP | 10 months | 3–4 months |
| 3 | 900 RP | 30 months | 10 months |
| 4 | 2,400 RP | 80 months | 27 months |

All 30 nodes cost about 23,400 RP. A good player makes about 25,000–40,000 RP in one game. So a player can get most nodes, but must choose the order.

### Leapfrog rules

- 2 nodes have a leapfrog path: **Underground Conduits** (from Overhead Lines) and **Modular Fission** (from Bulk Grid Resale).
- Leapfrog cost: research + 60%. Deployment time × 2.
- Fission leapfrog also gives a one-time Customer Satisfaction loss of 25 points (public protest).
- The tree screen shows the leapfrog path as a dashed line with the extra cost.

### All nodes

Deploy: "–" = no field work (active at once). "Build" = a building that the player places on the map.

| ID | Node | Tier | Needs | Deploy (per sector) | Effect |
| --- | --- | --- | --- | --- | --- |
| **Distribution** |  |  |  |  |  |
| D1 | Overhead Lines | Start | – | – | f line = 1.0 |
| D2 | Reinforced Storm Poles | 2 | D1 | $25,000 · 6 wk | f line = 0.7. Windstorm damage − 40%. |
| D5 | Underground Conduits | 3 | D3. Leap: D1 | $120,000 · 10 wk | f line = 0.3. No windstorm damage. Earthquake damage × 1.5. |
| D8 | Resonant Wireless Grid | 4 | D5 | $300,000 · 16 wk | f line = 0.1. No wind, flood or quake damage. |
| **Resilience** |  |  |  |  |  |
| D3 | Weatherproof Sensors | 2 | D2 | $10,000 · 2 wk | Disaster warning 1 week before. |
| D4 | Automated Line Splitters | 3 | D3 | $40,000 · 6 wk | Storm damage − 50%. |
| D6 | Shock-Dampened Substations | 3 | D5 | $60,000 · 6 wk | Earthquake damage − 70%. |
| D7 | Elevated Substations | 2 | D2 | $30,000 · 4 wk | Flood damage − 70%. |
| **Generation** |  |  |  |  |  |
| G1 | Bulk Grid Resale | Start | – | – | Buy all power from the wholesaler. GS drag from coal. |
| G2 | Solar Farms | 2 | G1 | Build: $80,000 | + 2 MW in the day. GS up. |
| G3 | Wind Farms | 2 | G2 | Build: $90,000 | + 1.5 MW. + 30% in Hills. |
| G4 | Modular Fission | 3 | G3. Leap: G1 | Build: $2M · 24 wk | + 25 MW, day and night. Needs GS ≥ 40 for a permit. |
| G5 | Commercial Fusion | 4 | G4 | Build: $8M · 30 wk | + 80 MW. Clean. |
| **Storage** |  |  |  |  |  |
| S1 | Battery Banks | 2 | G2 | Build: $50,000 | + 2 MW at the evening peak. |
| S2 | Grid-Scale Storage | 3 | S1 | Build: $400,000 | + 10 MW at the evening peak. |
| S3 | Virtual Power Plant (VPP) | 3 | S1 and P5 | $30,000 · 4 wk | Each prosumer adds 0.5 kW at the evening peak. |
| **Customers and PR** |  |  |  |  |  |
| P1 | Local Billboards | Start | – | – | Low tier customers. |
| P2 | Targeted Grid Ads | 1 | P1 | – | Unlocks Medium tier. |
| P7 | Community Outreach | 1 | P1 | – | CS + 3. PR specialists + 10% stronger. |
| P3 | B2B Sales Team | 2 | P2 | – | Unlocks High tier. |
| P5 | Prosumer Solar Program | 2 | P2 and G2 | $15,000 · 4 wk | Low and Medium customers can add rooftop solar. The company buys it at the wholesale price. CS + 5. |
| P6 | Smart Meters | 2 | P2 | $20,000 · 4 wk | Outage hours − 10%. Withheld High payments − 50%. |
| P4 | Corporate Direct Sales | 3 | P3 and D3 | – | Unlocks Corporate tier. |
| **Regulatory** |  |  |  |  |  |
| R1 | Municipal Lobbying | 1 | – | – | CapEx tax − 10%. |
| R2 | Environmental Compliance Office | 2 | R1 | – | GS + 5. Coal drag − 50%. |
| R3 | Exclusive Franchise Charters | 3 | R1 | – | Protect up to 3 sectors from new rivals while GS ≥ 60. |
| R4 | Utility Monopoly Charter | 4 | R3 | – | Remove all rivals when GS > 75. GS − 10 one time (antitrust anger). |
| **Organization** |  |  |  |  |  |
| O1 | Modular Project Management | 2 | – | – | M = 45. |
| O2 | Field Crew Training | 2 | O1 | – | Repair speed + 25%. |
| O3 | Autonomous Drone Logistics | 3 | O2 | – | M = 70. Repair + 25%. Deploy time − 20%. |
| O4 | Grid Operations Center | 3 | O1 and P6 | $50,000 one time | Outage hours − 20%. |
| O5 | AI Advisor Core | 3 | O3 and O4 | – | Unlocks the Advisor (section 14). |
| O6 | Enterprise Resource Planning | 4 | O3 | – | M = 100. |

Put this table in `js/data/techTree.js` as data. The code reads it. Do not write a special code path for each node.

## 11. The 3 satisfaction meters

Each meter is a number from 0 to 100. Each month, the game calculates a **target**. Then the meter moves part of the way to the target. This makes changes smooth and easy to understand.

### How a meter moves

$$
\text{Meter}_{\text{new}} = \text{Meter} + r \times (\text{Target} - \text{Meter})
$$

r depends on the direction and the difficulty:

| Difficulty | r when the meter goes up | r when the meter goes down |
| --- | --- | --- |
| Easy | 0.25 | 0.10 |
| Normal | 0.20 | 0.20 |
| Hard | 0.15 | 0.30 |

Some events change a meter at once (for example, Rush: ES − 5). These "shocks" go directly into the meter, not the target.

The top bar shows each meter with an arrow: ▲ if the target is higher, ▼ if it is lower. The tooltip lists each part of the target and its value.

### Customer Satisfaction (CS) target

$$
CS_T = 60 - 40(\bar{m} - 1) - \min(30,\; 1.5\bar{H}) + 10\,c - 10\,k + B_{CS}
$$

- m̄ = average price slider (weighted by customers).
- H̄ = average outage hours (weighted by customers).
- c = clean share of energy (own solar, wind, fission, fusion and prosumer solar).
- k = coal share = wholesale share × 0.6.
- B CS = bonuses: Prosumer Program + 5. Community Outreach + 3. PR budget ÷ $5,000 (maximum + 10).

### Employee Satisfaction (ES) target

$$
ES_T = 65 + 30(w - 1) - \min(30,\; 10\,n_{\text{crunch}}) - 20\,o + B_{ES}
$$

- w = wage slider.
- n crunch = number of rushed projects in the last 3 months.
- o = overload = repair backlog in weeks ÷ 8 (maximum 1).
- B ES = bonuses: Field Crew Training + 5. Drone Logistics + 10.

### Government Satisfaction (GS) target

$$
GS_T = 50 + 25\,c - 20\,k + U + L - A + B_{GS}
$$

- U = uptime: + 10 if H̄ < 2 hours. 0 if 2–12 hours. − 20 if H̄ > 12 hours.
- L = lobbying = lobbying budget ÷ $5,000 × (1 + 0.15 × PR specialists). Maximum 20.
- A = antitrust = 15 if market share > 80% and Monopoly Charter is not active.
- B GS = Environmental Compliance Office + 5.

### Effects of each meter

| Meter | Below 30 | 30 to 75 | Above 75 |
| --- | --- | --- | --- |
| **CS** | Churn × 1.5. Rival entry chance × 2. "Public petition" event. | Normal | + 10% new customers (word of mouth). |
| **ES** | F ES = 0.75. Each month: 50% chance of a 1-month strike (repair and deployment − 50%). | F ES = 1.0 | F ES = 1.2 (+ 20% research and deployment speed). |
| **GS** | Audit fine of $50,000–$250,000 every 6 months. Price slider maximum 1.1×. No fission permits. | Normal | CapEx − 15% (tax credit). Charters work. Rival buyouts cost less. |

**Start values:** CS 60, ES 65, GS 50.

## 12. Rival companies

2 computer rivals enter weak sectors and take customers. They use simple rules, not a full economy. This keeps them easy to code and easy for the player to understand.

### The 2 rivals

| Rival | Enters (Normal) | Style | Price | Outage hours |
| --- | --- | --- | --- | --- |
| Apex Energy | Month 55 | Fast and cheap | 0.8× | High (12–24 h) |
| Volt Dynamics | Month 120 | Slow and reliable | 1.1× | Low (1–3 h) |

### When a rival enters

Every 3 months, each rival checks all sectors that it is not in. It gives each sector a score:

$$
\text{Entry} = 50 \times \text{UnservedShare} + 2 \times \max(0,\; H - 12) + 30 \times (\bar{m} - 1) + 20 \times [CS < 30]
$$

- The rival enters the sector with the highest score, if the score is more than 25.
- A rival can also enter a sector that the player has not opened yet.
- A sector protected by a Franchise Charter is skipped.

### Rival strength

- Each rival has a **Strength** from 0 to 100 in each sector. It starts at 20.
- Strength + 3 each month (× rival growth from difficulty).
- Strength + 5 more in a month when the player's outage hours in that sector are over a tier limit.

### Customers that move to the rival

$$
\text{Move}_i = N_i \times \frac{\text{Strength}}{100} \times 0.03 \times \left(1 + \max\left(0, \frac{H}{L_i} - 1\right)\right) \times \max(0.5,\; 1 + m_i - m_{\text{rival}})
$$

### What the player can do

| Action | Needs | Effect | Cost or risk |
| --- | --- | --- | --- |
| **A. Franchise Charter** | R3 and GS ≥ 60 | Rivals cannot enter up to 3 chosen sectors. | Stops if GS goes below 60. |
| **B. Monopoly Charter** | R4 and GS > 75 | All rivals leave all sectors. No payment to them. | GS − 10 one time. |
| **C. Hostile buyout** | Cash | The player gets all rival customers in 1 sector. The rival leaves. | Cost below. |
| **D. Local price cut** | – | Discount of 10%, 20% or 30% in 1 sector. Rival strength − 4 each month for each 10%. | Less revenue. At 30%: GS − 2 each month (unfair price). |
| **E. Be better** | – | Low outage hours stop rival growth. | Maintenance and tech cost. |

**Buyout cost (fixed v1 formula with GS as 0–100):**

$$
\text{Buyout} = \text{Rival monthly revenue in the sector} \times 24 \times \left(1.5 - \frac{GS}{100}\right)
$$

At GS 0, the cost is 1.5× the value. At GS 100, the cost is 0.5× the value.

### When a rival leaves

- Strength goes to 0, or
- the rival has less than 5% of the sector customers for 6 months, or
- a charter or buyout removes it.

The rival's customers come back to the "unserved" pool. The player can win them with marketing.

## 13. Disasters and grid resilience

Disasters add Damage to sectors (section 7). The right tech cuts the damage. v1 had 3 disasters. v2 adds a Heatwave, an Ice Storm and 1 big scripted storm.

### Disaster table (Normal)

At each month tick, the game rolls once for each disaster type. The disaster starts in a random week of that month.

| Disaster | Chance each month | Sectors hit | Damage (0–100) | What cuts the damage |
| --- | --- | --- | --- | --- |
| Windstorm | Spring and Fall 8%. Other 2%. | 1–3. Hills × 2 chance. | 20–40 | Storm Poles − 40%. Line Splitters − 50%. Underground and Wireless: no damage. |
| Ice Storm | Winter 4%. Other 0%. | 1–2 | 15–30 | Storm Poles − 40%. Underground and Wireless: no damage. |
| Flash Flood | Summer 6%. Other 1%. | River Valley × 3 chance + 1 neighbor | 25–50 | Elevated Substations − 70%. Wireless: no damage. |
| Earthquake | 1% (from month 60) | Fault Line × 4 chance + neighbors | 30–60 | Underground × 1.5 (worse). Shock-Dampened − 70%. Wireless: no damage. A fission plant stops for 2 months. |
| Heatwave | Summer 10% | All sectors | No damage | Peak load + 25% for 1 month. Wholesale gives only 85% of the need. Batteries, VPP and own plants help. |
| Storm of the Decade | Month 110, always | 4 sectors | 50–70 | Same as Windstorm. |

Multiply all chances by the difficulty value (section 4). Use the seeded random number generator (section 17). Then a save and load gives the same disasters.

### Warnings and storm prep

- The Storm of the Decade always gives a warning 4 weeks before. This teaches the player to prepare.
- With Weatherproof Sensors, other disasters give a warning 1 week before (2 weeks on Easy).
- After a warning, the player can click **Storm Prep** in a sector. Cost: $10,000. Effect: damage − 20%. Crews wait near the sector, so repair starts at once.

### Prosumers in a flood

Private rooftop solar keeps some homes on. In a sector with the Prosumer Program, outage hours from damage go down by (prosumer share × 50%).

### Disaster report

After each disaster, a small report shows:

- the damage in each sector,
- how much tech saved (for example, "Storm Poles saved 12 damage points"),
- the time to repair with the current crews.

This report teaches the player why resilience tech is worth the money.

### Event cards (not disasters)

About 1 time each 6 months, an event card asks the player to choose. Each choice has a clear cost and benefit. Examples:

| Event | Choice A | Choice B |
| --- | --- | --- |
| Fuel crisis: wholesale × 1.5 for 3 months | Pay the cost | Raise prices 10% for 3 months (CS − 5) |
| City asks for free EV chargers | Pay $100,000 (GS + 8) | Say no (GS − 3) |
| Union asks for a 5% raise | Yes (ES + 10, wages + 5%) | No (ES − 10) |
| University offers a research deal | Pay $50,000 (+ 300 RP) | Say no |
| Reporter finds an old outage | Public apology (CS + 3, GS − 2) | No comment (CS − 5) |

Put event cards in `js/data/events.js`. Each card has a condition, a weight and 2–3 choices with effects.

## 14. Advisor, victory, loss and score

The player can win 3 ways, can lose 3 ways, and always gets a score at the end.

### Victory paths (Normal)

The player can win by any path. The path that the player picks only tells the Advisor what to help with. A condition must stay true for 3 months in a row.

| Path | Conditions | Main techs |
| --- | --- | --- |
| 1. Corporate Monopoly | Cash ≥ $50M and market share ≥ 90% of all 12 sectors | P4, R4 |
| 2. Technological Singularity | Fusion makes ≥ 50% of all energy, and Wireless Grid is active in ≥ 9 sectors | G5, D8 |
| 3. Decentralized Utopia | ≥ 80% of Low and Medium customers are prosumers, VPP active in ≥ 9 sectors, GS ≥ 60 and CS ≥ 70 | P5, S3 |

The Easy and Hard values for path 1 are in section 4.

**Prosumer growth:** In a sector with the Prosumer Program, 2% × F marketing of Low and Medium customers become prosumers each month.

Each path has a progress bar on the Goals screen. The bar shows the weakest condition, so the player knows what to fix.

### Loss conditions

| Loss | Rule | Warning |
| --- | --- | --- |
| Bankruptcy | Cash < $0 and the loan is at its limit for 3 months (Easy 6, Hard 2) | Red banner 1 month before |
| License revoked | GS < 10 for 6 months in a row | Red banner at month 4 |
| Customer collapse | Fewer than 200 customers for 3 months | Red banner at month 2 |

After a loss, the player can load the last auto-save or a slot.

### The Advisor

- The player researches **AI Advisor Core** (O5, Tier 3). Most players get it in months 100–150. On Easy, a basic Advisor is on from the start.
- The Advisor uses **rules**, not real AI. Each rule checks the state and gives a short tip.
- It shows the top 3 tips. Each tip has an **Apply** button.
- It also has **Apply suggested budget**. This sets the 5 budget sliders for the chosen victory path.

Example rules:

| If | Tip |
| --- | --- |
| A sector has Health < 40 | "Raise Maintenance. Sector X has low health." |
| Staff > 90% of M | "Research an Organization tech before you hire more." |
| Repair backlog > 2 weeks | "Hire 4 technicians or set Repair first." |
| Path 3 and prosumers < 50% | "Raise Marketing. More homes will add solar." |
| GS < 60 and a rival is near | "Raise Lobbying to protect sectors with a charter." |
| Cash < 2 months of costs | "Lower the budget or take a small loan." |

### Final score

The game ends at a victory or after December 2049.

$$
\text{Score} = \left( \frac{\text{Net worth}}{\$10{,}000} + 50 \times \text{Share\%} + 10 \times \overline{\text{Meters}} + 2{,}000 \times [\text{Win}] + 20 \times \text{Months left} \right) \times D
$$

- Net worth = cash − debt + 50% of all CapEx.
- Meters = average of CS, ES and GS.
- D = difficulty multiplier (section 4).
- Grades: S ≥ 15,000. A ≥ 10,000. B ≥ 6,000. C ≥ 3,000. D below 3,000. Tune these after playtests.

The end screen shows the grade and 4 line charts: cash, customers, the 3 meters and market share for all 240 months.

## 15. Screens, tutorial and accessibility

The game has 5 screens. The main game screen has a top bar, the map, a side panel and a news bar.

### Screens

1. **Title:** New Game, Continue, Load, Settings, Credits.
2. **New Game:** company name, difficulty, map seed (optional), tutorial on/off.
3. **Game:** see the layout below.
4. **Pause menu:** Resume, Save, Load, Settings, Quit to title.
5. **End:** win or loss, grade, score parts and 4 history charts.

### Game screen layout

| Area | What it shows |
| --- | --- |
| Top bar | Company name · date · cash (and last month +/−) · customers · CS, ES, GS meters with ▲▼ · speed buttons · save icon |
| Center | Map canvas |
| Side panel (tabs) | Sector · Budget · Research · Projects · Staff · Customers · Rivals · Goals and Advisor |
| Bottom | News bar with the last 5 messages. Click to open the full log. |

The **tech tree** opens as a full-screen layer. Branches are rows. Tiers are columns. Lines show prerequisites. Each status has a color **and** an icon (🔒, ○, ⟳, ✓).

The **monthly report** is a small card: money in, money out, customers +/−, meter changes and the top reason for each change. The player can set it to "popup" or "log only".

### Screen sizes: phone, tablet and PC

The layout changes with the screen width. Plan this in step 1, so you do not build the UI two times.

| Width | Device | Layout |
| --- | --- | --- |
| 1024 px or more | PC, big tablet in landscape | Top bar, map in the center, side panel on the right, news bar at the bottom |
| 600–1023 px | Tablet | Map uses the full width. The side panel opens as a drawer from the right. |
| Less than 600 px | Phone | Small top bar: date, cash, 3 meter icons, pause. The map fills the screen. The panel tabs become a bottom bar. A panel opens as a bottom sheet. |

Rules for small screens:

- Each button and tab is at least 44 × 44 px.
- Sliders have big handles and + / − buttons for small steps.
- No information only on hover. Each tooltip also opens with a tap on ⓘ or a long-press.
- On a phone, landscape is better, but portrait must also work.
- On a phone, the tech tree shows 1 branch at a time as a list. On a tablet and PC, it shows the full graph.
- A "Battery saver" setting draws at 30 frames each second and turns off particles.
- Test on real devices: iPhone (Safari), Android phone (Chrome), iPad, and a PC (Chrome, Firefox, Edge).

### Tutorial (first 10 months)

The tutorial is on by default for Easy and Normal. The player can skip it. The game pauses until the player does each step.

1. Read the top bar.
2. Move the budget sliders.
3. Change the Low tier price.
4. Start research on Targeted Grid Ads.
5. Repair a line break (scripted in month 3).
6. Hire 1 technician.
7. Read the monthly report.
8. Save the game to slot 1.

### Accessibility: easy to read

These rules help players with dyslexia and other reading problems. They also make the game easier for all players.

- **Font:** Atkinson Hyperlegible as default. Settings also offer Lexend and the system font. Research shows text settings (size, spacing, contrast) matter more than the font ([Font Alternatives](https://fontalternatives.com/blog/best-free-accessible-fonts-dyslexia-low-vision/)).
- **Text size:** 18 px base. A slider from 90% to 150%.
- **Spacing:** line height 1.5. Letter spacing 0.02 em. Left-aligned text only.
- **Short text:** max 70 characters per line. No long paragraphs. No ALL CAPS and no italics in long text.
- **Words:** short sentences, simple words, one idea per sentence. All game text is in `js/data/text.js`.
- **Numbers:** short form ($1.2M) with the full number in the tooltip.
- **Read aloud:** a 🔊 button on event cards and reports. Use the browser's speech API (`speechSynthesis`).
- **Color:** a color-blind safe palette. Each color also has an icon or a pattern. A high-contrast theme.
- **Motion:** a "Reduce motion" switch stops particles and screen shake.
- **Keyboard:** all actions have keys. The `?` key shows the key list.
- **Tooltips:** each number and each icon has a plain-words tooltip.

### Music and sound effects

Sound is optional. The game is fully playable with no sound.

- **Music:** 2–3 short loops. A calm loop for normal play. A tense loop for disasters and rival attacks.
- **Sound effects:** click, cash in, alert, storm, project done, victory, loss.
- **Settings:** Music volume, Effects volume and a Mute button in the top bar. Start values: music 40%, effects 70%.
- Browsers play sound only after the player touches or clicks the page. Start the audio on the first "New Game" or "Continue" click.
- Use the Web Audio API and `.mp3` files. Keep each file small.
- Each sound also has a visual signal (a flash, an icon or a banner). Then players with no sound miss nothing.
- Use only sounds that you made or that have a free license (for example, CC0). Write each source in the Credits screen.

## 16. Save and load system

The game saves to the browser's `localStorage`: 2 auto-save keys and 3 player slots. Each save is one JSON text with a version number and a checksum.

### Facts about browser storage

- `localStorage` can hold about 5 MiB for each origin. When it is full, the browser throws a `QuotaExceededError`. Always put save code in `try...catch` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).
- An origin = scheme + host + **port**. You chose several files, so you will use a local server. **Always use the same port** (for example, `http://localhost:8080`). If the port changes, the saves seem to disappear.
- Private (incognito) windows usually delete the data at the end. The Settings screen shows a warning for this.

**iPhone and iPad (Safari):** Safari can delete data from a site that the player did not use in the last 7 days of browser use ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). The game can ask the browser to keep its data with `navigator.storage.persist()`. Export and import (later) will be the full fix.

### Storage keys

| Key | Content |
| --- | --- |
| `pgt.auto.a` and `pgt.auto.b` | Auto-saves. The game writes to them in turn. |
| `pgt.slot.1`, `pgt.slot.2`, `pgt.slot.3` | Player save slots |
| `pgt.settings` | Font, text size, sound and other settings. Not part of a game save. |

**Why 2 auto keys?** If the browser closes during a write, one key can break. The other key is still good. On load, the game uses the newest key that passes the checks.

### When the game saves

- **Auto-save:** after each month tick (after the report), and when the tab is hidden (`visibilitychange`) or closed (`pagehide`).
- **Slot save:** from the Pause menu, at any time. The game pauses first. If the slot has a save, the game asks: "Replace this save?"

### Save file format

```json
{
  "saveVersion": 1,
  "gameVersion": "0.1.0",
  "savedAt": "2026-10-11T22:30:00Z",
  "playTimeSec": 3600,
  "checksum": "9f2c41ab",
  "meta": {
    "company": "Bright Volt Co",
    "difficulty": "normal",
    "month": 87,
    "cash": 2450000
  },
  "state": { "...": "the full game state (section 17)" }
}
```

- `meta` lets the Load screen show slot cards without a full read of `state`.
- `checksum` = a simple hash (for example, FNV-1a) of the `state` text. If it does not match, the save is broken.
- `state` includes the **random number generator state**. After a load, the same disasters and events come. A reload does not give a new roll.

### What not to save

- Animation data (particles, camera shake).
- Values that the game can calculate again (outage hours, targets, efficiency). Calculate them after load.

### Load steps

1. Read the text. Parse the JSON in `try...catch`.
2. Check the checksum.
3. If `saveVersion` is old, run the migration functions in order (v1 → v2 → v3).
4. If `saveVersion` is newer than the game, stop. Show: "This save is from a newer version."
5. Calculate the derived values.
6. Start the game paused.

If a step fails, show a plain message and the other saves. Never crash.

### Size

The state is about 30–80 KB. The month history (240 months × 12 numbers) is about 25 KB. 5 saves use less than 1 MB. This is well below the limit.

### Later: export and import

Export and import come after version 1.0. The save is already one JSON text, so this is easy:

- **Export** = download the save text as a `.json` file.
- **Import** = choose a file, then use the same load steps as above.

## 17. Technical architecture

Use plain HTML, CSS and JavaScript modules. No framework and no build tool. The most important rule: **the simulation code never touches the screen.** Then you can test it and run it fast in Node.js.

### Folder layout

```text
powergrid-tycoon/
  index.html
  css/          base.css (fonts, colors, themes) · layout.css · components.css
  assets/       fonts/ · sprites/ · sounds/
  js/
    main.js     starts the game and connects the parts
    core/       loop.js · rng.js · store.js · bus.js
    data/       difficulty.js · techTree.js · sectors.js · buildings.js · events.js · text.js · balance.js
    sim/        tick.js · economy.js · customers.js · grid.js · workforce.js · research.js
                deployment.js · satisfaction.js · rivals.js · disasters.js · eventCards.js · victory.js · advisor.js
    render/     map.js · camera.js · particles.js · sprites.js
    ui/         topbar.js · panels/ · techTreeView.js · modals.js · report.js · tutorial.js · settings.js
    save/       save.js · migrate.js · checksum.js
  tools/        sim-runner.js (runs 240 months in Node for balance tests)
  tests/        *.test.js
```

### The parts and their rules

| Part | Job | Rule |
| --- | --- | --- |
| `core/store.js` | Holds the one game state | The UI changes state only with actions, for example `dispatch({type: 'SET_PRICE', tier: 'low', value: 1.1})`. |
| `sim/` | All game rules | Pure functions: they get the state and the random generator. No DOM. No `Math.random()`. |
| `data/` | All numbers and text | No logic. Tune the game here. |
| `render/` | Draws the map on the canvas | Reads the state. Never changes it. |
| `ui/` | HTML panels, buttons, sliders | Reads the state. Sends actions. |
| `core/bus.js` | Messages between parts | For example, `month:end` → the report and the auto-save listen. |
| `save/` | Save and load (section 16) | Saves only the state. |

*Diagram: code parts, who calls and who reads (see the Word or PDF file).*

The loop sends a tick to sim/. Only sim/ makes a new state. The screen code reads the state and sends actions back.

### Game loop

The screen draws at about 60 frames each second. The simulation moves in fixed steps of 1 week. A time "accumulator" connects the two. This is the fixed timestep method ([Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/)). Limit the frame time and the steps for each frame. Then a slow computer does not fall into a "spiral of death".

```js
const WEEK_MS = 7500;          // 1 week at 1x
let acc = 0, last = performance.now();

function frame(now) {
  const dt = Math.min(now - last, 250);   // limit a long frame
  last = now;
  if (!state.paused) acc += dt * state.speed;
  let steps = 0;
  while (acc >= WEEK_MS && steps < 8) {   // max 8 weeks per frame
    weekTick(state, rng);                 // month tick runs inside on week 4
    acc -= WEEK_MS;
    steps++;
  }
  render(state, acc / WEEK_MS);           // 0..1 for smooth animation
  requestAnimationFrame(frame);
}
```

Pause the loop when the tab is hidden. At 5x, 1 week is 1.5 seconds, so 8 steps per frame is enough.

### Random numbers

- Use a small seeded generator, for example **mulberry32** (about 10 lines).
- Keep its state inside the game state. The save file stores it.
- Never use `Math.random()` in `sim/`. You can use it in `render/` for visual effects only.

### Game state (main fields)

```js
state = {
  version, seed, rng,                   // rng = generator state (a number)
  time:     { month, week, playTimeSec, speed, paused },
  company:  { name, difficulty, cash, debt },
  prices:   { low, medium, high, corporate },
  budget:   { totalPct, split: { marketing, rd, maintenance, lobbying, pr }, locks },
  staff:    { engineers, technicians, pr, wageMult },
  sectors:  [ { id, type, owned, health, damage, priority, discount,
                customers: { low, medium, high, corporate }, prosumers,
                buildings: [ { type, x, y } ], tech: { D2: 'ACTIVE' }, rival } ],
  tech:     { nodes: { G2: { status, rp } }, queue: [] },
  projects: [ { id, kind, node, sector, teams, progress, total, rushed } ],
  meters:   { cs, es, gs },
  rivals:   [ { id, active, sectors } ],
  events:   { cooldown, pending },
  goals:    { target, holdMonths, loss: { bankrupt, license, collapse } },
  history:  { cash: [], customers: [], cs: [], es: [], gs: [], share: [] },
  flags:    { tutorialStep, stormOfDecadeDone }
}
```

Use only plain objects, arrays, numbers, strings and booleans. No classes, `Map` or `Set` in the state. Then `JSON.stringify` saves it with no extra code.

### Run the game on your computer

ES modules need a web server. Use one of these, always with **port 8080**:

- `npx serve -l 8080`
- `python -m http.server 8080`
- VS Code "Live Server" with the port set to 8080.

## 18. Balance, testing and debug tools

The numbers in this plan are first values. A computer test runs the game 240 months in a few seconds. Use it to tune the numbers before people play.

### Simulation runner

The `sim/` code has no DOM, so Node.js can run it:

```text
node tools/sim-runner.js --seed 42 --difficulty normal --bot balanced
```

The runner writes a CSV file with 1 row for each month: cash, customers, market share, CS, ES, GS, RP and average outage hours. Open the CSV in a spreadsheet and make charts.

### Test bots

A bot is a simple script that plays the game.

| Bot | How it plays |
| --- | --- |
| Idle | Does nothing after month 1. |
| Balanced | Even budget. Researches each branch in order. Repairs first. |
| Rusher | Leapfrogs to Underground and Fission. Rushes projects. |
| Penny-pincher | Minimum budget. High prices. |
| Path bots (3) | Each one follows 1 victory path. |

### Balance targets (Normal)

| Check | Target |
| --- | --- |
| Idle bot | Does not win. Score grade D. |
| Balanced bot | Wins at month 200–235. |
| Each path bot | Wins its own path before month 240. |
| Fastest win of any bot | Not before month 160. |
| Balanced bot customers | Month 40: 4,000–6,000. Month 100: 15,000–25,000. Month 180: more than 30,000. |
| Penny-pincher | Loses customers and ends with a low score, but is not bankrupt before month 100. |

**Tune these values first** (biggest effect): wholesale price, base tariffs, new customer rate (0.02), churn values, research costs, disaster chances, rival growth.

### Automatic tests

Use the Node test runner (`node --test`). No library is needed.

- **Formulas:** efficiency, outage hours, churn, buyout cost, meter movement.
- **Save round trip:** save → load → the state is equal.
- **Migration:** an old save loads correctly.
- **Same seed, same game:** 2 runs with the same seed and the same actions give the same result after 240 months.

### Debug panel

Open it with F9 only when the address has `?debug=1`.

- Speed 20x.
- Add cash. Set a meter. Jump to a month.
- Start a disaster or an event card now.
- Unlock a tech.
- Show the seed. Copy the state to the console.

### Playtests

- 3 people for each difficulty.
- Write down the real time at the end of each phase.
- Ask 3 questions: "What was hard to understand?", "When were you bored?", "What did you want to do, but could not?"

## 19. Build plan

Build the game in 14 steps. Each step makes a game that runs. Build the save system in step 2. Then each new feature must work with save and load from the start.

| # | Step | Work | Done when |
| --- | --- | --- | --- |
| 1 | Skeleton | Folders, `index.html`, game loop, speed buttons, pause, page layout for phone, tablet and PC, store, message bus, seeded random generator | The date moves at 1x, 2x and 5x. Pause works. |
| 2 | Save and load | Auto-save keys, 3 slots, checksum, version, Load screen | Reload the page and "Continue" works. The round-trip test passes. |
| 3 | Money (1 sector, Low tier) | Revenue, energy cost, wages, upkeep, budget sliders, price slider, loans, monthly report | The month 1 numbers match section 9. |
| 4 | Map | Pixel-art sprite sheet, tile grid, map from seed, 12 sectors, zoom and drag, sector panel, place buildings | The same seed gives the same map. |
| 5 | Grid and outages | Health, damage, repair, capacity, outage hours, map colors and icons | A test sector with low health shows yellow, then red. |
| 6 | Staff and tech | Hire and fire, efficiency, research teams, field crews, rush, all 33 nodes from data, tech tree screen | The player can research and deploy Storm Poles. |
| 7 | Meters | CS, ES and GS targets, effects, top bar arrows, tooltips | The tooltip shows each part of each target. |
| 8 | Growth | Medium, High and Corporate tiers, open new sectors, phases | Phase 2 starts at month 41. |
| 9 | Disasters and events | 6 disaster types, warnings, Storm Prep, disaster report, event cards | The Storm of the Decade comes at month 110 with a warning. |
| 10 | Rivals | 2 rivals, entry score, strength, customer moves, charters, buyout, local price cut | Apex enters a weak sector at month 55. |
| 11 | Win and lose | 3 victory paths, 3 loss rules, Advisor, score, end screen with charts | Debug jumps can trigger each win and each loss. |
| 12 | Tutorial and accessibility | 8 tutorial steps, font and size settings, read aloud, high contrast, reduce motion, keys, touch controls, music and sound effects | A new player finishes the tutorial with no help on a phone, a tablet and a PC. |
| 13 | Balance | Sim runner, 7 bots, tune `data/` files, playtests | All balance targets in section 18 pass. |
| 14 | Release | Fix bugs, lock save version 1, put the game online (for example, GitHub Pages or itch.io) | A full 2-hour game with no errors in the console. |

**At the end of each step:**

- [ ] Run the automatic tests.
- [ ] Play for 10 minutes.
- [ ] Save, reload the page, and load. Check that nothing changed.

The small tasks for each step are in the Development Steps tab.

## 20. Decisions

You made these choices on Oct 11, 2026. The plan sections now include them.

| Topic | Decision | Where in the plan |
| --- | --- | --- |
| Art | Pixel art | Section 5, build step 4 |
| Sound | Music and sound effects. The player can turn them off. | Section 15, build step 12 |
| Export / import | Later, after version 1.0 | Section 16 |
| Devices | Phone, tablet and PC | Sections 5 and 15, build steps 1 and 12 |
| Language | English only | Section 15 (all text in `text.js`) |

## Sources

- [Storage quotas and eviction criteria – MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Fix Your Timestep! – Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/)
- [Best Free Fonts for Dyslexia and Low Vision – Font Alternatives](https://fontalternatives.com/blog/best-free-accessible-fonts-dyslexia-low-vision/)
- [7 Most Accessible Fonts for Websites – WebAbility](https://www.webability.io/blog/font-for-dyslexia)
