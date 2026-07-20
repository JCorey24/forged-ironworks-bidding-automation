# Forged Iron Works — Rate Reference (Single Source of Truth)

**Last updated:** *(fill in date — update this every time a rate changes)*
**Updated by:** *(name)*

> This file is the ONLY place rates should live. The SOP and any workbook formulas should reference this file, not restate numbers. If a rate changes, update it here first.

---

## Material Buy Rates ($/lb)

| Material | $/lb | Cost Code | Notes |
|---|---|---|---|
| WF Beams | $1.20 | 50004 | ASTM A992 Gr. 50 |
| Tube / HSS | $1.06 | 50004 | ASTM A500 Gr. B |
| Angles | $0.87 | 50004 | ASTM A36 |
| Channels | $0.93 | 50004 | ASTM A36 |
| Flats | $0.84 | 50004 | ASTM A36 |
| Bent Plate | $1.35 | 50004 | ASTM A36 |
| Burned Plate | $1.50 | 50004 | ASTM A36 |
| Misc Channels | $1.12 | 50004 | ASTM A36 |

> Reference for current market pricing: https://www.sdi-structural.com/resources/price-list.php

## Hardware Unit Prices ($/EA)

| Item | $/EA | Cost Code | Notes |
|---|---|---|---|
| Anchor Bolts | $35.00 | 50004 | |
| Shear Studs | $4.50 | 50004 | If composite deck |
| Field Bolts | $75.00 | 50005 | A325N |
| Epoxy Anchors | $75.00 | 50004 | |
| Bollards | $195.00 | 50004 | Furnish only |

## Service & Processing Rates

| Service | Rate | Unit | Notes |
|---|---|---|---|
| Painting | $75.00 | $/hr | Applied to painted lbs |
| Galvanizing | $0.55 | $/lb | Applied to galvanized lbs |
| Sales Tax | 7% | % | See "Taxable vs. Non-Taxable" in scope-rules.md — do not apply blindly to every line |
| Engineering | $50.00 | $/ton | Only if required |
| Detailing | $250.00 | $/ton | Applied to total tonnage |
| Shop Labor | $75.00 | $/hr | Tons × 10 = shop hours |
| Outbound Freight | $1,200.00 | $/load | Per truck |
| J&D Markup | 10% | % | Applied to joist & deck cost, before tax |

## Erection Labor Rates

| Condition | $/hr | Notes |
|---|---|---|
| Local (< 50 miles) | $75.00 | Standard rate |
| Regional (50–100 miles) | $82.00 | |
| Overnight / Travel (> 100 mi) | $95.00 | + per diem $65/man/day + hotel ~$175/night (2 men/room) |

## Equipment Rates

| Equipment | Rate | Unit | Notes |
|---|---|---|---|
| Crane | $300.00 | $/hr | $80/hr if RAD crane |
| Lull / Telehandler | $1,500.00 | $/wk | |
| Boom Lift | $1,225.00 | $/wk | |
| Scissor Lift | $600.00 | $/wk | |
| Welder (machine) | $200.00 | $/wk | |
| Scaffold | $1,000.00 | $/day/floor | |
| Perimeter Cable | $25.00 | $/day/ft | |
| Equipment Delivery | $1,000.00 | $/EA | |
| Material Delivery | $1,200.00 | $/load | |

## Misc Scope Item Unit Prices

| Item | Unit Price | Unit | Notes |
|---|---|---|---|
| Dumpster / Trash Gates | $5,000.00 | $/EA | |
| Roof Access Ladder | $2,103.00 | $/EA | Buyout price — verify VLF |
| Steel Railing — 2-Line | $200.00 | $/LF | |
| Repair Rail | $200.00 | $/LF | |
| Cable Railing | $650.00 | $/LF | |
| Wall Fix (railing) | $800.00 | $/EA | |
| Pipe Bollards | $195.00 | $/EA | Furnish only |
| Grating | *(price by SF or LF — no standard rate set)* | | |
| Fall Protection Anchors | *(quote per install)* | | |

## Structural Package Items — Quote Required (ADDED 2026-07-16)

> These items have no flat rate because they vary too much by span, spec, and mill pricing to standardize. Their absence from the tables above was previously silent (no row = easy to miss = risk of a $0 line slipping into a bid). Listing them explicitly here makes "no rate" a documented decision instead of a gap. Per scope-rules.md Section 6, any bid needing these items MUST stop and get a supplier quote — do not price at $0 and do not estimate.

| Item | Unit Price | Unit | Notes |
|---|---|---|---|
| LH Joists (long-span) | *(quote required — no standard rate)* | $/joist | Heavier/pricier than K-series; no per-joist rate exists. Get supplier quote before pricing. STOP condition per scope-rules.md §6. |
| Metal Deck | *(quote required — no standard rate)* | $/SF or $/sq | No per-SF rate exists. Get supplier quote before pricing. STOP condition per scope-rules.md §6. |

## Production Benchmarks

| Task | Rate | Unit | Notes |
|---|---|---|---|
| Columns (set & detail) | 9 | pcs/day | Adjust for height & connections |
| Beams | 9 | pcs/day | Adjust for moment connections |
| Joists (K-series) | 192 | pcs/day | |
| Perimeter Angle | 38.4 | LF/hr | Continuous runs |
| Metal Deck | 45 | sq/day | Per square (100 SF) |
| Shop Labor multiplier | 10 | hrs/ton | Tons × 10 = shop hours |
| Crane hrs (from erect hrs) | ÷ 9.75 | — | Erect hrs ÷ 9.75 = crane hrs (calibrate per job) |
| Painting | **[CONFIRM WITH ARIE]** | lbs/hr or SF/hr | ADDED 2026-07-16 — was previously missing. Painting has a $/hr rate above but nothing to convert painted weight/area into hours, so painting could never actually be priced even when called for on drawings. Need a real number before this row is usable. |

## Freight Load Assumption (ADDED 2026-07-16)

Outbound Freight above is priced flat at $1,200/load, assuming 1 load per job. **[CONFIRM WITH ARIE]** — proposed rule: LH joists and metal deck typically ship separately from miscellaneous steel. If a job includes a Structural Package Item (joist/deck, see above), assume 2 loads minimum unless the supplier confirms combined shipping. Until confirmed, treat load count as a manual per-job input, not a hardcoded 1.

## Profit Targets & Sanity Checks

| Metric | Value | Applies To |
|---|---|---|
| Minimum profit line | 4.5% | Of Sub Total (Section 8 profit line item) |
| Target overall margin | 10%+ | Profit ÷ Grand Total — see scope-rules.md for how this relates to the 4.5% line |
| Standard markup | 1.12× | Grand Total ÷ Total Cost |
| Quote rounding | $500–$1,000 | Round UP to nearest $500 or $1,000 above calculated total |
| Quote valid | 14 days | After 14 days, subject to review |
| Erection delay charge | $1,500 | If FIW unable to erect at time of delivery |

---

*Mirrors: Forged_Ironworks_Bid_Intake.xlsx — "Rate Reference" tab. Keep these in sync — this file and that tab should never disagree. If they do, this file wins until reconciled.*
