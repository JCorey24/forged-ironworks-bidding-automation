# Fix 01 — Line-Item Scope

## Purpose

Replace the unsafe project-wide `Furnish & Erect` / `Erect Only` switch
with scope decisions on every takeoff line.

The project-level scope remains a default only. It must never directly
zero out an entire material or labor section.

## Required takeoff fields

Each takeoff row must carry:

- `furnish`
- `fabricate`
- `erect`
- `finish`
- `providedBy`
- `installedBy`
- `taxTreatment`
- `resolutionStatus`
- `scopeSource`
- `scopeNotes` when needed

## Resolution order

1. Project default
2. Standard company/category override
3. Estimator's explicit project-specific override

The estimator override always wins.

## Standard overrides included

- Loose lintels: furnish and fabricate by FIW; installation by masonry;
  no FIW erection labor.
- Furnish-only pipe bollards: furnish/fabricate by FIW; install by GC.
- Furnish-only anchor bolts and embeds: furnish by FIW; install by GC.

## Blocking behavior

The scope validator fails a line when:

- Any required scope field is `TBD`.
- The resolution status is `QUOTE_REQUIRED` or `ESTIMATOR_REVIEW`.
- `erect = YES` but `installedBy != FIW`.
- `erect = NO` but `installedBy = FIW`.
- `furnish = NO` while `fabricate = YES`, unless the business later adds
  an explicit customer-supplied-material workflow.
- The scope source is blank.

## Integration steps

1. Copy the included `src/`, `tests/`, and `scripts/` folders into the
   repository root.
2. Merge the required dev dependencies from `package.scope-fix.json`
   into the repository's existing `package.json`.
3. Add the scripts shown in `package.scope-fix.json`.
4. Run:

   ```bash
   npm install
   npm run test:scope
   npm run check:scope
   ```

5. Replace all pricing logic that checks the global project scope with
   the functions in `src/services/pricing-scope.ts`.
6. Map the new scope fields into the workbook takeoff rows.
7. Do not connect proposal generation until project scope validation
   returns `PASS`.

## Alphabet Academy baseline

Expected examples:

| Item | Furnish | Fabricate | Erect | Installed By |
|---|---:|---:|---:|---|
| Structural steel framing | YES | YES | YES | FIW |
| Loose lintels | YES | YES | NO | MASONRY |
| Pipe bollards, furnish only | YES | YES | NO | GC |
| Anchor bolts and embeds, furnish only | YES | NO | NO | GC |

These are starting assumptions and still require estimator confirmation
against the actual bid invitation and scope documents.
