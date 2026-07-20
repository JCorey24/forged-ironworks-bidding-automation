# Forged Iron Works — Scope & Pricing Logic Rules

> This file resolves the branching logic that the SOP describes in prose but never wires into an explicit rule. Read this before running any pricing step. Items marked **[CONFIRM WITH ARIE]** are judgment calls the audit surfaced — a reasonable default is proposed, but this needs a human sign-off before it's treated as policy.

---

## 1. Furnish & Erect vs. Erect Only

Pulled from Intake Form Section 2, Question 1.

- **If "Furnish & Erect (F&E)":** Include ALL material cost rows (Section 5, Step 1) AND all erection/labor rows (Section 7) — **except loose lintels, see Section 5 exception below.**
- **If "Erect Only":** SKIP all material cost rows in Step 1 entirely. Only price labor, equipment, and erection costs. Do not apply material buy rates.
- **If this flag is blank or unanswered on intake:** STOP. Do not proceed to takeoff or pricing. Flag to the estimator — this single answer changes which half of the pricing engine runs.

## 2. Sales Tax — Taxable vs. Non-Taxable Line Items

The SOP says tax applies to "taxable material" but never lists what that means. Proposed default:

**Taxable (apply 7%):**
- All material buy-rate line items (WF Beams, Tube/HSS, Angles, Channels, Flats, Bent Plate, Burned Plate, Misc Channels)
- Hardware (Anchor Bolts, Shear Studs, Field Bolts, Epoxy Anchors, Bollards)
- Joist & Deck package (after markup is applied — see Section 6 of SOP)

**Non-taxable:**
- Labor (shop labor, erection labor, painting/galvanizing service hours)
- Equipment rental (crane, lifts, welder, scaffold)
- Freight / delivery
- Engineering, detailing, bonds
- Profit line

**[CONFIRM WITH ARIE]** — this is a reasonable materials-vs-services split, but it's not written down anywhere in the SOP. Get sign-off once, then this becomes policy and stops being a per-job guess.

**Override:** If the GC provides a signed tax exemption certificate before the bid is due, skip sales tax entirely regardless of the above (per Intake Form Section 2, Question 4).

## 3. Waste % Threshold — Resolving the Conflict

The SOP contains two different numbers for the same check:
- Section 3: target ≤20% ideal, reconsider stock length if >30%
- Section 12 (Final QC): pass bar is ≤30%

**Resolved rule:**
- **0–20% waste:** Pass, no action needed.
- **20–30% waste:** Caution — try an alternate stock length before finalizing, but not a hard blocker if no better option exists.
- **>30% waste:** Hard fail. Do not submit the takeoff line as-is. Re-run stock length selection or flag to estimator.

**[CONFIRM WITH ARIE]** — using this three-tier version unless corrected.

## 4. Profit Line vs. Overall Margin Target

The SOP has two profit concepts that aren't explicitly reconciled:
- Section 8: Profit = 4.5% minimum, added as its own line item on Sub Total
- Section 8 sanity check: target ≥10% overall margin (Profit ÷ Grand Total)

**Resolved rule:** The 4.5% is a floor for the explicit profit line item — it is NOT the same thing as total margin. Total margin also picks up the J&D 10% markup and the rounding-up step (Section 8: "round to nearest $500–$1,000 above calculated total"). After all three are applied, run the sanity check: Profit ÷ Grand Total should land at 10%+. If it doesn't, the shortfall should be made up by increasing the explicit profit % above the 4.5% floor — not by changing material rates or skipping rounding.

**[CONFIRM WITH ARIE]** — this is the most consequential ambiguity in the whole SOP since it directly controls what gets quoted. Get explicit sign-off before this logic goes live on a real bid.

## 5. Never-Miss Items — Pricing Table Mapping

Explicit link between Intake Form Section 4 (Never-Miss Items) and where each item actually gets priced, so nothing gets flagged on intake and then dropped before pricing:

| Never-Miss Item (Intake §4) | Priced In | Rate Source |
|---|---|---|
| Perimeter Angle (PA) – LF | Section 3D takeoff (tonnage) | Angles rate, rates.md |
| Loose Lintels – EA | Section 3E takeoff (tonnage) | Angles rate, rates.md [1] |
| Roof Access Ladder – VLF | Section 3J (buyout) | $2,103/EA, rates.md |
| Pipe Bollards – EA | Section 3J (buyout) | $195/EA, rates.md |
| Dumpster/Trash Gates – EA | Section 3J (buyout) | $5,000/EA, rates.md |
| HVAC/RTU Support Frames – EA | Section 3 takeoff (tonnage, evaluate per job) | Material rate + evaluated labor hours |
| Roof Penetration Frames – EA | Section 3 takeoff (tonnage, evaluate per job) | Material rate + evaluated labor hours |
| Canopy Steel | Section 3 takeoff (tonnage) | Material rate by shape |
| Epoxy Anchors – EA | Section 3J (buyout) | $75/EA, rates.md |
| Cable/Wall-Mount Railing – LF | Section 3J (buyout) | $650/LF or $800/EA, rates.md |
| Fall Protection Anchors – EA | Section 3J (quote per install) | No standard rate — get sub quote |
| Grating – SF/LF | Section 3J (quote by SF/LF) | No standard rate — price per job |

**[1]** Loose lintels are angles (L-shapes), confirmed against engineered lintel schedules (e.g. project S-302 "Typ. Loose Lintel Schedule" specs L3-1/2x3-1/2x1/4 through L6x3-1/2x5/16) — not Channels. This was a standing error in this table; corrected 2026-07-16.

**Loose lintels are furnish-only, regardless of overall job scope.** Installation is always by others (masonry/GC sets them during wall construction), even on a Furnish & Erect job. Price the loose lintel line as material cost only — zero erection labor hours — even though Section 1 above says F&E jobs get all labor rows priced. This is a standing exception specific to loose lintels, not a per-job judgment call.

## 5B. Connection Hardware Quantification (ADDED 2026-07-16)

Never-Miss Items (Section 5 above) covers buyout-priced items. It has no equivalent rule for **connection hardware** — field bolts, joist-to-beam bearing hardware/welds — which are never optional on a real steel job but have no quantification path in the SOP. This was a real gap, not a one-off miss: without a rule, the AI has no way to generate this line even when it wants to.

**Proposed rule:**
- Field bolts (A325N, rates.md Hardware table): quantity = (# moment/shear connections) × (bolts per connection). **[CONFIRM WITH ARIE]** — need the actual company standard for bolts-per-connection by connection type (moment vs. shear). Do not guess this number; treat as a STOP condition (Section 6 below) until Arie provides it.
- Joist-to-beam bearing hardware/welds: **[CONFIRM WITH ARIE]** — no rate or quantification method exists yet. Flag as STOP, not $0, whenever a joist package is in scope.

Once Arie confirms the bolts-per-connection standard, this becomes policy the same way Section 5's table is policy, and stops being a per-job judgment call.

## 6. STOP Conditions — When to Escalate Instead of Guessing

Do not silently proceed and produce a bid number if any of the following occur. Flag to the estimator instead:

- A drawing dimension, quantity, or spec is illegible, missing, or contradicted by another sheet
- Two sheets disagree on the same quantity (e.g., column schedule vs. architectural elevation)
- An intake Section 2 scope flag is unanswered or marked "TBD"
- A "never-miss" item (Section 5 above) appears on the drawings but has no clear pricing path
- Waste % exceeds 30% on any line and no alternate stock length resolves it
- The calculated Profit ÷ Grand Total sanity check falls below 10% after rounding
- Total tons don't reconcile across takeoff tabs and the BID sheet (QC checklist, first bullet)

**In all of these cases:** stop the pricing run, state clearly what's unresolved, and ask — do not fill in a plausible-sounding number and move on.

## 7. Mandatory Pre-Submission Gate (ADDED 2026-07-16)

**This is the actual fix for how the Alphabet Academy bid got to a Bid Summary with a live $0 line in it.** Sections 5 and 6 above already contained the right rules — the Never-Miss table and the STOP conditions. The failure wasn't missing logic, it was that nothing *forced* those rules to run before output was generated. They were reference material the AI could consult, not a gate it had to clear.

**New rule: a Bid Summary may not be generated until every one of the following is explicitly true, and the takeoff/bid-calc output must show the checklist results, not just the final numbers:**

1. **Every row in the Section 5 Never-Miss Items table** is marked one of: `PRICED` (cite the line item #), `N/A` (not present on this job — state why), or `FLAGGED` (present but unpriced — this blocks submission per Section 6).
2. **Every Section 6 STOP condition** has been checked against this specific job, not just listed as a possibility.
3. **No pricing line may read $0 or blank without an adjacent note stating why** ("no rate — quote required, see rates.md" or "N/A this job"). A $0 with no note is treated as an error, not a valid value.
4. **Opening/lintel takeoffs must cross-reference both the door schedule AND the window schedule** before the opening count is treated as final — door-schedule-only counts (as happened here) are incomplete by definition, since exterior window openings can also need loose lintels.
5. Only after 1–4 pass does the Bid Summary get generated. If any item is `FLAGGED`, the bid is a draft, not a quote — say so explicitly in the output.

*This section is the "Blueprints" enforcement layer referenced by the bidding skill/SOP — SKILL.md (or whatever drives Claude Code) should treat this as a hard gate, not an optional review step.*

---

*Companion to rates.md. Together these two files are the "Directions" layer for the bidding skill — SKILL.md should route to both before any pricing step runs.*
