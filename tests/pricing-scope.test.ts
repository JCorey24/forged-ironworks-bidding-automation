import { describe, expect, it } from "vitest";
import {
  calculateErectionCost,
  calculateMaterialCost,
  calculateShopLaborCost,
  resolveLineItemScope,
  UnresolvedScopeError,
} from "../src";

describe("scope-aware pricing", () => {
  it("prices furnished material", () => {
    const scope = resolveLineItemScope(
      "FURNISH_AND_ERECT",
      "STRUCTURAL_BEAM",
      {
        finish: "PRIME",
        taxTreatment: "TAXABLE",
        resolutionStatus: "RESOLVED",
        scopeSource: "Test",
      },
    );

    expect(calculateMaterialCost(1000, 1.2, scope)).toBe(1200);
  });

  it("returns zero material cost when FIW does not furnish", () => {
    const scope = resolveLineItemScope(
      "ERECT_ONLY",
      "STRUCTURAL_BEAM",
      {
        resolutionStatus: "RESOLVED",
        scopeSource: "Test",
      },
    );

    expect(calculateMaterialCost(1000, 1.2, scope)).toBe(0);
  });

  it("prices loose-lintel material but no erection labor", () => {
    const scope = resolveLineItemScope(
      "ERECT_ONLY",
      "LOOSE_LINTEL",
      {
        finish: "GALVANIZE",
        taxTreatment: "TAXABLE",
      },
    );

    expect(calculateMaterialCost(500, 0.87, scope)).toBe(435);
    expect(calculateErectionCost(8, 75, scope)).toBe(0);
    expect(calculateShopLaborCost(4, 75, scope)).toBe(300);
  });

  it("throws when material scope is unresolved", () => {
    const scope = resolveLineItemScope(
      "MIXED_SCOPE",
      "STRUCTURAL_BEAM",
    );

    expect(() => calculateMaterialCost(1000, 1.2, scope)).toThrow(
      UnresolvedScopeError,
    );
  });

  it("rejects negative pricing inputs", () => {
    const scope = resolveLineItemScope(
      "FURNISH_AND_ERECT",
      "STRUCTURAL_BEAM",
      {
        finish: "PRIME",
        taxTreatment: "TAXABLE",
        resolutionStatus: "RESOLVED",
        scopeSource: "Test",
      },
    );

    expect(() => calculateMaterialCost(-1, 1.2, scope)).toThrow(
      RangeError,
    );
  });
});
