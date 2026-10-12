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
