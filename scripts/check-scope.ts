import {
  resolveLineItemScope,
  validateProjectScope,
  type TakeoffLine,
} from "../src";

const sampleLines: TakeoffLine[] = [
  {
    id: "AA-LL-001",
    pricingGroupId: "ANGLES",
    description: "Loose lintels",
    category: "LOOSE_LINTEL",
    quantity: 10,
    unit: "EA",
    drawingSheet: "S-302",
    drawingDetail: "4",
    drawingRevision: "2026-05-01",
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
    description: "W21x48 roof beam",
    category: "STRUCTURAL_BEAM",
    quantity: 1,
    unit: "EA",
    drawingSheet: "S-102",
    drawingRevision: "2026-05-01",
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
