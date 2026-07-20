---
name: forged-ironworks-bidding
description: Use when preparing a bid or proposal for a Forged Ironworks job — covers takeoff-to-bid workflow, rate lookup, F&E vs erect-only scope rules, and tax handling.
---

# Forged Ironworks Bidding Automation

## Overview

Turns a takeoff into a priced, formatted proposal: quantify the job, apply
the F&E-vs-Erect-Only and tax branching logic in
[reference/scope-rules.md](reference/scope-rules.md), price it with the
rates in [reference/rates.md](reference/rates.md), validate against the
mandatory gate, then generate the client-facing proposal.

> ⚠️ **Not fully signed off.** Rules in scope-rules.md marked
> `[CONFIRM WITH ARIE]` are running as working defaults, not confirmed
> policy, until he signs off:
> 1. Taxable vs. non-taxable line-item split (Section 2)
> 2. Waste % three-tier resolution — 0–20% pass / 20–30% caution / >30% hard
>    fail (Section 3)
> 3. Profit floor (4.5%) vs. overall margin target (10%+) reconciliation
>    (Section 4)
> 4. Connection hardware quantification — bolts per connection type (Section 5B, ADDED 2026-07-16)
> 5. Painting production rate — lbs/hr or SF/hr (rates.md, ADDED 2026-07-16)
> 6. Freight load count for jobs with a joist/deck package (rates.md, ADDED 2026-07-16)

## When to Use

- A new job needs a bid/proposal prepared
- An existing bid needs re-pricing after a scope or rate change

## Workflow

1. **Takeoff** — quantify the job directly in the `Takeoff` tab of
   [templates/bid-workbook-master.xlsx](templates/bid-workbook-master.xlsx)
   (ADDED 2026-07-16 — replaces the old separate takeoff-template.xlsx /
   bid-calc-engine.xlsx pair; takeoff and pricing are now one linked
   workbook so they cannot go out of sync). Every takeoff row must be
   tagged with a **Pricing Group** — this is what the Section 5 tab sums
   against. A row with no Pricing Group is invisible to pricing and will
   silently be excluded; check for blanks before moving on.
2. **Classify scope** — apply [reference/scope-rules.md](reference/scope-rules.md)
   to determine Furnish & Erect vs. Erect-only, and tax treatment
3. **Price it** — the `Section 5 - Pricing` tab pulls quantities from
   `Takeoff` and rates from `Rates` by formula — do not hand-type a material
   quantity or weight into Section 5. If an item has no rate in `Rates`
   (e.g. a new structural package item), add it there first as an explicit
   `QUOTE REQUIRED` row — never leave it silently absent.
4. **Validate — MANDATORY, do not skip** (ADDED 2026-07-16) — check the
   `Validation Gate` tab. If `OVERALL STATUS` reads anything other than
   `READY FOR REVIEW`, STOP: state each FAIL/FLAGGED item to the estimator
   and do not proceed to step 5. This is the literal enforcement of
   scope-rules.md Section 7 and the STOP Conditions below — it is a gate,
   not a suggestion.
5. **Write the proposal** — populate
   [templates/proposal-template.md](templates/proposal-template.md) from the
   priced bid sheet, only once step 4 passes
6. **Log it** — save the finished bid under `completed-bids/` to feed the
   calibration loop (see below)

## Quick Reference

| Step | Input | Output | File |
|---|---|---|---|
| Takeoff | Blueprints | Quantities | templates/bid-workbook-master.xlsx (`Takeoff` tab) |
| Scope | Contract docs | F&E / E-only, tax flag | reference/scope-rules.md |
| Pricing | Quantities + rates | Priced bid | templates/bid-workbook-master.xlsx (`Section 5 - Pricing` tab, linked by formula — not retyped) |
| Validate | Priced bid | PASS/FAIL gate | templates/bid-workbook-master.xlsx (`Validation Gate` tab) |
| Proposal | Priced bid (post-gate) | Client-facing doc | templates/proposal-template.md |
| Calibration | Actual job cost vs. bid | Updated rates | completed-bids/ |

## STOP Conditions — When to Escalate Instead of Guessing

Per [reference/scope-rules.md](reference/scope-rules.md) Section 6, enforced
mechanically by the `Validation Gate` tab in step 4 above (Section 7,
ADDED 2026-07-16) — do not proceed and produce a bid number if any of these
occur — flag to the estimator instead:

- A drawing dimension, quantity, or spec is illegible, missing, or
  contradicted by another sheet
- Two sheets disagree on the same quantity (e.g., column schedule vs.
  architectural elevation)
- An intake Section 2 scope flag is unanswered or marked "TBD"
- A "never-miss" item (scope-rules.md Section 5) appears on the drawings but
  has no clear pricing path
- Connection hardware (field bolts, bearing hardware) exists on the job but
  has no confirmed quantification rule (scope-rules.md Section 5B, ADDED
  2026-07-16)
- Waste % exceeds 30% on any line and no alternate stock length resolves it
- The calculated Profit ÷ Grand Total sanity check falls below 10% after
  rounding
- Total tons don't reconcile across takeoff tabs and the BID sheet
- Any pricing line reads $0 or blank with no adjacent note explaining why
  (ADDED 2026-07-16 — a bare $0 is treated as an error, not a valid value)

In all of these cases: stop the pricing run, state clearly what's
unresolved, and ask — do not fill in a plausible-sounding number and move
on. **If the Validation Gate's `OVERALL STATUS` reads `DRAFT - DO NOT
SUBMIT`, this list is why — read the individual check results before
overriding anything.**

## Common Mistakes

Surfaced during the Alphabet Academy test run (2026-07-16) — all now closed
by the fixes above, kept here so they don't recur silently:

- **Retyping instead of linking.** Section 5 material quantities were
  hand-copied from the takeoff (with waste pre-applied by hand) instead of
  computed by formula. This meant a takeoff change would never propagate to
  pricing, and the retyping step is exactly where waste got applied
  correctly once but wouldn't update if the takeoff did. Fixed by the
  Pricing Group / SUMIF link in templates/bid-workbook-master.xlsx.
- **Silent $0 on missing rates.** LH joists and metal deck had no rate in
  rates.md, so the pricing line was $0 with nothing flagging it as
  incomplete — indistinguishable from "this costs nothing." Fixed by
  requiring an explicit `QUOTE REQUIRED` row for any priced-but-rateless
  item (rates.md, Structural Package Items section).
- **Connection hardware silently dropped.** Field bolts and joist-bearing
  hardware have no quantification rule anywhere in scope-rules.md, so they
  never got priced even though they're never actually optional on a steel
  job. Fixed by scope-rules.md Section 5B (still needs Arie's
  bolts-per-connection number).
- **Painting rate without a production benchmark.** rates.md had a $/hr
  painting rate but no lbs/hr or SF/hr to convert painted weight into
  hours, so painting could be identified as in-scope from drawings but
  never actually priced.
- **Takeoff carried forward without re-verification.** Perimeter angle
  quantity (193 LF) was carried from a prior draft proposal, not
  independently measured, and its size was never confirmed against the
  actual drawing set (which may not even need an edge angle — see A-105
  parapet detail).
- **Partial cross-referencing on openings.** Loose lintel counts were
  checked against the door schedule but not the window schedule, so
  exterior window openings needing lintels could be missing from the
  takeoff entirely.
- **Off-by-one cell references are easy to introduce silently.** When
  rebuilding the workbook, an Inputs-tab row misalignment fed text into a
  numeric formula. `recalc.py` caught it as `#VALUE!` before delivery —
  any workbook rebuild should run recalc.py and confirm `total_errors: 0`
  before being treated as done, not just "looks right."

## Calibration Loop

Not defined in reference/rates.md or reference/scope-rules.md — needs
input. Open question: how do completed-bids entries get reviewed against
actual job cost to correct rates.md over time (who reviews, how often, what
triggers a rate change)?
