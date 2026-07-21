import { describe, expect, it } from "vitest";
import {
  evaluateProjectAssemblies,
  FORGED_IRONWORKS_ESTIMATING_PROFILE,
  resolveStandardAssemblies,
  type AssemblyMemberInput,
} from "../src";

function wfBeam(
  index: number,
  overrides: Partial<AssemblyMemberInput> = {},
): AssemblyMemberInput {
  return {
    lineItemId: `aa-beam-${index}`,
    memberMark: `B${index}`,
    memberType: "WF_BEAM",
    section: "W18x35",
    lengthFt: 24,
    condition: "STANDARD",
    globalShopHoursPerTonEnabled: true,
    ...overrides,
  };
}

describe("approved assembly quantity policies", () => {
  it("creates two WF beam ends without inventing hardware quantities", () => {
    const result = resolveStandardAssemblies(wfBeam(1));
    const ends = result.applications.find(
      (item) => item.assemblyId === "WF_BEAM_END",
    );

    expect(ends?.instanceCount).toBe(2);
    expect(ends?.components).toContainEqual(
      expect.objectContaining({
        id: "beam-end-connection-scope",
        quantity: null,
      }),
    );
    expect(ends?.components.some((item) => item.id === "field-bolts")).toBe(false);
  });

  it("groups repeated missing beam-end hardware into one review item", () => {
    const result = evaluateProjectAssemblies(
      Array.from({ length: 9 }, (_, index) => wfBeam(index + 1)),
    );
    const beamEnds = result.exceptions.filter(
      (item) => item.assemblyId === "WF_BEAM_END",
    );

    expect(beamEnds).toHaveLength(1);
    expect(beamEnds[0].quantity).toBe(9);
    expect(beamEnds[0].severity).toBe("REVIEW");
  });

  it("derives 114 Alphabet Academy nailer bolts and washers from run length and approved spacing", () => {
    const result = resolveStandardAssemblies(
      wfBeam(1, { lengthFt: 228, woodNailer: { required: true } }),
    );
    const nailer = result.applications.find(
      (item) => item.assemblyId === "WOOD_NAILER_HARDWARE",
    );

    expect(nailer?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "wood-nailer-bolts", quantity: 114 }),
        expect.objectContaining({ id: "wood-nailer-washers", quantity: 114 }),
      ]),
    );
    expect(nailer?.outcome).toBe("BLOCKED");
  });

  it("derives 49 working wall-angle epoxy anchors from actual run length", () => {
    const input: AssemblyMemberInput = {
      lineItemId: "aa-wall-angle",
      memberMark: "PA-1",
      memberType: "PERIMETER_ANGLE",
      section: "L3x3x1/4",
      lengthFt: 193,
      condition: "STANDARD",
      globalShopHoursPerTonEnabled: true,
      perimeterAnchors: {
        required: true,
        specification: "EPOXY_ANCHOR",
      },
    };
    const result = evaluateProjectAssemblies([input]);
    const anchors = result.applications[0];

    expect(anchors.components[0]).toEqual(
      expect.objectContaining({
        quantity: 49,
        rateKey: "HARDWARE_EPOXY_ANCHOR",
      }),
    );
    expect(anchors.outcome).toBe("AUTO_APPLY");
  });

  it("uses the drawing-supported count for 20 bridging terminations", () => {
    const input: AssemblyMemberInput = {
      lineItemId: "aa-bridging",
      memberMark: "BR-1",
      memberType: "JOIST",
      section: "BRIDGING",
      lengthFt: null,
      condition: "STANDARD",
      globalShopHoursPerTonEnabled: true,
      bridgingTermination: { required: true, count: 20 },
    };
    const result = resolveStandardAssemblies(input);
    const bridging = result.applications[0];

    expect(bridging.instanceCount).toBe(20);
    expect(bridging.components[0]).toEqual(
      expect.objectContaining({ quantity: 20, quoteRequired: true }),
    );
    expect(bridging.outcome).toBe("BLOCKED");
  });

  it("introduces neither raw plate geometry nor a historical project total", () => {
    const policy = JSON.stringify({
      approvals: FORGED_IRONWORKS_ESTIMATING_PROFILE.assemblyApprovalPolicy,
      quantities: FORGED_IRONWORKS_ESTIMATING_PROFILE.assemblyQuantities,
    });

    expect(policy).not.toMatch(/plateDimensions|plateWeight|alphabet academy|grand total|submitted total/i);
  });
});
