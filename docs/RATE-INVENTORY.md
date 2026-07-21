# Rate Inventory

Inventory captured before the centralized company rate source was added.

## Current rate locations

| Location | Values found | Disposition |
|---|---|---|
| `reference/rates.md` | Material, hardware, service, labor, travel, freight, equipment, buyout, markup, waste/production, and quote-required entries | Authoritative human-readable source; mirrored into the typed source in this commit |
| `reference/scope-rules.md` | Repeated tax, waste, profit, hardware, and buyout values | Remains policy documentation; numeric duplication should be replaced with rate keys in a later documentation pass |
| `SKILL.md` | Repeated waste and profit thresholds; operational warnings about missing rates | Remains workflow documentation |
| `bid-sheet/bid-workbook-master.xlsx` | `Rates` tab mirrors company rates; `Inputs` repeats tax/markup/margin values; pricing formulas contain a `$75/hr` fallback; Bid Summary hardcodes one `$1,200` freight input | Not changed; must be migrated to consume an exported structured rate set later |
| `completed-bids/Alphabet-Academy-2026-07-16-bid-calc.xlsx` | Historical `Rates` and `Inputs` copies plus embedded labor, freight, detailing, production, and project-total calculations | Historical record; must not become a company default |
| `completed-bids/Alphabet-Academy-2026-07-16-takeoff.xlsx` | Historical quantities and weights | Historical record; not a rate source |
| `tests/pricing-scope.test.ts` | Inline rates used to unit-test generic arithmetic | Retained as isolated arithmetic fixtures, not company defaults |
| `scripts/check-scope.ts` | No pricing rates | No change required |
| `src/services/pricing-scope.ts` | Caller-supplied numeric rates, but no company constants | Existing generic functions preserved; one centralized-rate path added |

## Intentional unresolved entries

- LH joists and metal deck remain `QUOTE_REQUIRED`.
- Grating and fall-protection anchors remain `QUOTE_REQUIRED`.
- Joist-bearing hardware remains `QUOTE_REQUIRED` because neither rate nor quantification is approved.
- Painting has an hourly service rate, but its production benchmark remains unresolved.
- Waste thresholds and default freight load count remain `PENDING_CONFIRMATION` in the company profile.

## Remaining duplication for later cleanup

- Numeric policy examples in `scope-rules.md` and `SKILL.md` still repeat values from `rates.md`.
- The master workbook still maintains its own Rate Reference tab, a `$75/hr` formula fallback, a `$1,200` freight input, and duplicated values on its Inputs tab.
- Historical completed-bid workbooks retain embedded snapshot rates by design.
- Generic pricing tests still use simple inline numbers to test arithmetic independently of company configuration.
