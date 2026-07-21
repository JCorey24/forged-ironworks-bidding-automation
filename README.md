# Forged Ironworks Bidding Automation

This repository is the working foundation for turning structural-steel takeoffs into reviewed bid inputs and client-facing proposals. It combines a TypeScript scope-validation core with the spreadsheets, pricing rules, drawing references, and proposal artifacts used by Forged Ironworks.

> **Current status:** early foundation. The line-item scope resolver and scope-aware pricing checks are implemented and tested. The workbook-to-code automation pipeline is not yet connected end to end, and the policy questions marked `CONFIRM WITH ARIE` must not be treated as approved business rules.

## Safety boundary

This system supports an estimator; it does not replace estimator approval. Do not issue a bid when scope is unresolved, a required rate is missing, source documents conflict, or the validation gate fails. See [SKILL.md](SKILL.md) for the operational workflow and stop conditions.

## Repository map

See [docs/REPOSITORY-MAP.md](docs/REPOSITORY-MAP.md) for the component map, current execution path, known gaps, and recommended build order.

## Development

Requirements:

- Node.js 20 or newer
- npm

Install and validate:

```bash
npm ci
npm run validate
```

Individual checks:

```bash
npm run typecheck
npm test
npm run check:scope
```

## Current code path

1. `resolveLineItemScope` merges the project default, company category overrides, and estimator-specific overrides.
2. `validateLineItemScope` rejects unresolved or internally inconsistent responsibility assignments.
3. Scope-aware pricing functions include or exclude material, shop labor, and erection labor.
4. `validateProjectScope` rolls line-item failures into a project-level pass/fail result.

The Excel workbook remains the current operational calculation surface. Connecting workbook rows to these typed models is the next major integration step.

## Key documents

- [Bidding workflow and stop conditions](SKILL.md)
- [Scope rules](reference/scope-rules.md)
- [Rates](reference/rates.md)
- [Proposal template](templates/proposal-template.md)
- [Line-item scope fix](docs/FIX-01-LINE-ITEM-SCOPE.md)

## Data handling

The repository currently contains real project drawings, bid workbooks, and proposals. Treat those files as sensitive business records. Do not add credentials, customer contact information, or unreviewed bid outputs.
