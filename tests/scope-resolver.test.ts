import { describe, expect, it } from "vitest";
import {
  resolveLineItemScope,
  validateLineItemScope,
  type TakeoffLine,
} from "../src";

describe("line-item scope resolver", () => {
  it("keeps loose lintels furnish-only on an F&E project", () => {
    const scope = resolveLineItemScope(
      "FURNISH_AND_ERECT",
      "LOOSE_LINTEL",
      {
        finish: "GALVANIZE",
        taxTreatment: "TAXABLE",
      },
    );

    expect(scope.furnish).toBe("YES");
    expect(scope.fabricate).toBe("YES");
    expect(scope.erect).toBe("NO");
    expect(scope.installedBy).toBe("MASONRY");
    expect(scope.resolutionStatus).toBe("RESOLVED");
  });

  it("does not remove furnish-only loose lintels on an erect-only project", () => {
    const scope = resolveLineItemScope(
      "ERECT_ONLY",
      "LOOSE_LINTEL",
      {
        finish: "GALVANIZE",
        taxTreatment: "TAXABLE",
      },
    );

    expect(scope.furnish).toBe("YES");
    expect(scope.fabricate).toBe("YES");
    expect(scope.erect).toBe("NO");
  });

  it("allows an estimator-specific override to win", () => {
    const scope = resolveLineItemScope(
      "FURNISH_AND_ERECT",
      "PIPE_BOLLARD_FURNISH_ONLY",
      {
        erect: "YES",
        installedBy: "FIW",
        resolutionStatus: "RESOLVED",
        scopeSource: "Estimator override approved for this project",
      },
    );

    expect(scope.erect).toBe("YES");
    expect(scope.installedBy).toBe("FIW");
    expect(scope.scopeSource).toContain("Estimator override");
  });

  it("fails unresolved mixed-scope items", () => {
    const scope = resolveLineItemScope(
      "MIXED_SCOPE",
      "STRUCTURAL_BEAM",
    );

    const line: TakeoffLine = {
      id: "beam-001",
      pricingGroupId: "WF_BEAMS",
      memberMark: "B1",
      section: "W21x48",
      description: "W21x48 roof beam",
      category: "STRUCTURAL_BEAM",
      quantity: 1,
      unit: "EA",
      lengthFt: 20,
      source: { sheet: "S-102" },
      confidence: "HIGH",
      reviewRequired: false,
      scope,
    };

    const issues = validateLineItemScope(line);

    expect(
      issues.some((issue) => issue.code === "SCOPE_UNRESOLVED"),
    ).toBe(true);

    expect(
      issues.some((issue) => issue.code === "SCOPE_NOT_RESOLVED"),
    ).toBe(true);
  });

  it("fails a responsibility conflict", () => {
    const scope = resolveLineItemScope(
      "FURNISH_AND_ERECT",
      "STRUCTURAL_BEAM",
      {
        finish: "PRIME",
        taxTreatment: "TAXABLE",
        installedBy: "GC",
        resolutionStatus: "RESOLVED",
        scopeSource: "Bad test data",
      },
    );

    const line: TakeoffLine = {
      id: "beam-002",
      pricingGroupId: "WF_BEAMS",
      memberMark: "B2",
      section: "W16x31",
      description: "W16x31 roof beam",
      category: "STRUCTURAL_BEAM",
      quantity: 1,
      unit: "EA",
      lengthFt: 18,
      source: { sheet: "S-102" },
      confidence: "HIGH",
      reviewRequired: false,
      scope,
    };

    const issues = validateLineItemScope(line);

    expect(
      issues.some(
        (issue) => issue.code === "INSTALL_RESPONSIBILITY_CONFLICT",
      ),
    ).toBe(true);
  });
});
