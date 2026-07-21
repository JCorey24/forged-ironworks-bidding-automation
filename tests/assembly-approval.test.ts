import { describe, expect, it } from "vitest";
import {
  evaluateProjectAssemblies,
  FORGED_IRONWORKS_ESTIMATING_PROFILE,
  type AssemblyApprovalPolicy,
  type AssemblyMemberInput,
} from "../src";

function hss(
  index: number,
  overrides: Partial<AssemblyMemberInput> = {},
): AssemblyMemberInput {
  return {
    lineItemId: `aa-column-${index}`,
    memberMark: `C${index}`,
    memberType: "HSS_COLUMN",
    section: "HSS6x6x3/8",
    lengthFt: 12,
    condition: "STANDARD",
    globalShopHoursPerTonEnabled: true,
    basePlate: { lengthIn: 12, widthIn: 12, thicknessIn: 0.75 },
    topPlate: { lengthIn: 8, widthIn: 8, thicknessIn: 0.5 },
    anchorRodCount: 4,
    ...overrides,
  };
}

function beam(overrides: Partial<AssemblyMemberInput> = {}): AssemblyMemberInput {
  return {
    lineItemId: "beam-b1",
    memberMark: "B1",
    memberType: "WF_BEAM",
    section: "W18x35",
    lengthFt: 24,
    condition: "STANDARD",
    globalShopHoursPerTonEnabled: true,
    ...overrides,
  };
}

function policyWithAllowance(
  assemblyId: "HSS_COLUMN_TOP" | "WOOD_NAILER_HARDWARE",
  coversCause: string,
): AssemblyApprovalPolicy {
  const base = FORGED_IRONWORKS_ESTIMATING_PROFILE.assemblyApprovalPolicy;
  return {
    ...base,
    id: "approved-test-policy",
    rules: {
      ...base.rules,
      [assemblyId]: {
        ...base.rules[assemblyId],
        managementApproval: "APPROVED",
        allowance: {
          id: `${assemblyId.toLowerCase()}-allowance-v1`,
          assemblyId,
          assemblyVersion: 1,
          coversCause,
          quantityBasis: {
            type: "PER_MEMBER",
            quantity: 1,
            description: "One approved estimating allowance per member",
          },
          pricingBasis: {
            type: "FIXED_AMOUNT",
            amount: 100,
            currency: "USD",
          },
          approvalSource: "Test management approval",
          confidence: "MEDIUM",
          reviewThreshold: {
            type: "EXTENDED_COST_ABOVE",
            value: 1000,
          },
          mayAppearInFinalProposal: false,
        },
      },
    },
  };
}

describe("project assembly approval", () => {
  it("groups nine Alphabet Academy top-plate exceptions into one record", () => {
    const inputs = Array.from({ length: 9 }, (_, index) =>
      hss(index + 1, { topPlate: undefined }),
    );
    const result = evaluateProjectAssemblies(inputs);
    const topPlate = result.exceptions.find(
      (item) => item.assemblyId === "HSS_COLUMN_TOP",
    );

    expect(topPlate?.quantity).toBe(9);
    expect(topPlate?.lineItemIds).toHaveLength(9);
    expect(result.exceptions.filter((item) => item.assemblyId === "HSS_COLUMN_TOP")).toHaveLength(1);
  });

  it("applies an approved allowance without inventing top-plate geometry or weight", () => {
    const result = evaluateProjectAssemblies(
      [hss(1, { topPlate: undefined })],
      policyWithAllowance("HSS_COLUMN_TOP", "drawing-derived plate dimensions"),
    );
    const top = result.applications.find(
      (item) => item.assemblyId === "HSS_COLUMN_TOP",
    );

    expect(top?.outcome).toBe("APPLY_ALLOWANCE");
    expect(top?.allowance?.approvalSource).toBe("Test management approval");
    expect(top?.components).toEqual([]);
  });

  it("does not convert quote-required wood-nailer hardware into an allowance", () => {
    const result = evaluateProjectAssemblies(
      [beam({ woodNailer: { required: true, fastenerSpacingIn: 24 } })],
      policyWithAllowance("WOOD_NAILER_HARDWARE", "supplier quote required"),
    );
    const nailer = result.applications.find(
      (item) => item.assemblyId === "WOOD_NAILER_HARDWARE",
    );

    expect(nailer?.outcome).toBe("BLOCKED");
    expect(nailer?.allowance).toBeUndefined();
    expect(result.readiness.readyToPrice).toBe(false);
  });

  it("allows draft pricing to continue with a review-required beam end", () => {
    const result = evaluateProjectAssemblies([beam()]);

    expect(result.applications[0].outcome).toBe("REVIEW_REQUIRED");
    expect(result.readiness).toEqual({
      draftPricingAllowed: true,
      readyToPrice: true,
      readyToSubmit: false,
    });
  });

  it("prevents pricing and submission readiness when an assembly is blocked", () => {
    const result = evaluateProjectAssemblies([
      hss(1, { basePlate: undefined }),
    ]);

    expect(result.readiness.readyToPrice).toBe(false);
    expect(result.readiness.readyToSubmit).toBe(false);
    expect(result.exceptions.some((item) => item.severity === "BLOCKER")).toBe(true);
  });

  it("contains no historical Alphabet Academy bid total", () => {
    expect(
      JSON.stringify(FORGED_IRONWORKS_ESTIMATING_PROFILE.assemblyApprovalPolicy),
    ).not.toMatch(/alphabet academy|grand total|submitted total/i);
  });
});
