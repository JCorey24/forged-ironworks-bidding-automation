import { describe, expect, it } from "vitest";
import {
  resolveLineItemScope,
  validateProjectScope,
  validateTakeoffLine,
  type TakeoffLine,
} from "../src";

function makeLine(overrides: Partial<TakeoffLine> = {}): TakeoffLine {
  return {
    id: "AA-C2-001",
    pricingGroupId: "HSS_COLUMNS",
    memberMark: "C2",
    section: "HSS6x6x3/8",
    description: "HSS column C2",
    category: "HSS_COLUMN",
    quantity: 1,
    unit: "EA",
    lengthFt: 12.5,
    source: { category: "DRAWING_DERIVED", sheet: "S-201", detail: "Column schedule" },
    confidence: "HIGH",
    reviewRequired: false,
    scope: resolveLineItemScope("FURNISH_AND_ERECT", "HSS_COLUMN", {
      finish: "PRIME",
      taxTreatment: "TAXABLE",
      resolutionStatus: "RESOLVED",
      scopeSource: "S-201 column schedule",
    }),
    ...overrides,
  };
}

describe("takeoff traceability validation", () => {
  it("accepts a traceable high-confidence member", () => {
    expect(validateTakeoffLine(makeLine())).toEqual([]);
  });

  it("blocks a member whose mark, section, or drawing sheet is missing", () => {
    const issues = validateTakeoffLine(
      makeLine({ memberMark: "", section: "", source: { category: "DRAWING_DERIVED", sheet: "" } }),
    );

    expect(
      issues.filter((issue) => issue.code === "TAKEOFF_TRACE_MISSING"),
    ).toHaveLength(3);
  });

  it("blocks low-confidence extraction unless it enters exception review", () => {
    const result = validateProjectScope(
      [makeLine({ confidence: "LOW", reviewRequired: false })],
    );

    expect(result.status).toBe("FAIL");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "LOW_CONFIDENCE_REVIEW_REQUIRED" }),
    );
  });

  it("requires a concise reason for an exception review", () => {
    const issues = validateTakeoffLine(
      makeLine({ reviewRequired: true, reviewReason: "  " }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "REVIEW_REASON_MISSING" }),
    );
  });

  it("allows non-linear items to record an explicit null length", () => {
    expect(validateTakeoffLine(makeLine({ lengthFt: null }))).toEqual([]);
  });

  it("rejects invalid quantities and lengths", () => {
    const issues = validateTakeoffLine(
      makeLine({ quantity: 0, lengthFt: Number.NaN }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "TAKEOFF_QUANTITY_INVALID" }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "TAKEOFF_LENGTH_INVALID" }),
    );
  });
});
