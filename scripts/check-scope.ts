import {
  resolveLineItemScope,
  validateProjectScope,
  type TakeoffLine,
} from "../src";

const sampleLines: TakeoffLine[] = [
  {
    id: "AA-LL-001",
    pricingGroupId: "ANGLES",
    memberMark: "LL-1",
    section: "L4x4x3/8",
    description: "Loose lintels",
    category: "LOOSE_LINTEL",
    quantity: 10,
    unit: "EA",
    lengthFt: null,
    source: { category: "DRAWING_DERIVED", sheet: "S-302", detail: "4", revision: "2026-05-01" },
    confidence: "HIGH",
    reviewRequired: false,
    scope: resolveLineItemScope(
      "FURNISH_AND_ERECT",
      "LOOSE_LINTEL",
      {
        finish: "GALVANIZE",
        taxTreatment: "TAXABLE",
      },
    ),
  },
  {
    id: "AA-BM-001",
    pricingGroupId: "WF_BEAMS",
    memberMark: "B1",
    section: "W21x48",
    description: "W21x48 roof beam",
    category: "STRUCTURAL_BEAM",
    quantity: 1,
    unit: "EA",
    lengthFt: 20,
    source: { category: "DRAWING_DERIVED", sheet: "S-102", revision: "2026-05-01" },
    confidence: "HIGH",
    reviewRequired: false,
    scope: resolveLineItemScope(
      "FURNISH_AND_ERECT",
      "STRUCTURAL_BEAM",
      {
        finish: "PRIME",
        taxTreatment: "TAXABLE",
        resolutionStatus: "RESOLVED",
        scopeSource: "Estimator review of S-102",
      },
    ),
  },
];

const result = validateProjectScope(sampleLines);

console.log(JSON.stringify(result, null, 2));

if (result.status === "FAIL") {
  process.exitCode = 1;
}
