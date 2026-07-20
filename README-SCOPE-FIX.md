# Forged Ironworks Bidding — Scope Fix 01

This bundle implements the first repair:

> Replace the project-wide scope switch with scope decisions on every
> takeoff line.

## Copy into the repository

Extract this archive into the repository root. It adds:

```text
src/
  config/
  models/
  services/
  validation/
scripts/
tests/
docs/
```

It also includes:

- `package.scope-fix.json`
- `tsconfig.scope-fix.json`

Do **not** overwrite the repository's existing `package.json`.
Merge the dependencies and scripts from `package.scope-fix.json`.

## Commands

```bash
npm install
npm run typecheck:scope
npm run test:scope
npm run check:scope
```

## Important

This bundle is intentionally limited to Fix 01. It does not yet repair:

- Workbook range/formula defects
- Quote-required supplier records
- Labor crew-hour/man-hour logic
- Drawing revision control
- Connection hardware takeoff
- Strict proposal-generation gate

Those should be implemented and tested separately.
