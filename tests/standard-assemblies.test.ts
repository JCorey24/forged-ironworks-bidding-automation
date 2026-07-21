import { describe, expect, it } from "vitest";
import {
  resolveStandardAssemblies,
  STANDARD_ASSEMBLIES,
  type AssemblyMemberInput,
} from "../src";

function normalHss(overrides: Partial<AssemblyMemberInput> = {}): AssemblyMemberInput {
  return {
    lineItemId: "column-c2",
    memberMark: "C2",
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

function normalBeam(overrides: Partial<AssemblyMemberInput> = {}): AssemblyMemberInput {
  return {
    lineItemId: "beam-b1",
    memberMark: "B1",
    memberType: "WF_BEAM",
    section: "W18x35",
    lengthFt: 24,
    condition: "STANDARD",
    globalShopHoursPerTonEnabled: true,
    boltsPerBeamEnd: 4,
    ...overrides,
  };
}

describe("standard assembly library", () => {
  it("contains seven typed, versioned provisional assemblies", () => {
    expect(STANDARD_ASSEMBLIES.map((assembly) => assembly.id)).toEqual([
      "HSS_COLUMN_BASE",
      "HSS_COLUMN_TOP",
      "WF_BEAM_END",
      "JOIST_BEARING_PLATE",
      "WOOD_NAILER_HARDWARE",
      "PERIMETER_ANGLE_ANCHOR",
      "BRIDGING_TERMINATION",
    ]);
    expect(STANDARD_ASSEMBLIES.every((assembly) => assembly.version === 1)).toBe(true);
    expect(STANDARD_ASSEMBLIES.every((assembly) => assembly.maturity === "PROVISIONAL")).toBe(true);
  });

  it("automatically gives a normal HSS column a calculated base assembly", () => {
    const result = resolveStandardAssemblies(normalHss());
    const base = result.applications.find((item) => item.assemblyId === "HSS_COLUMN_BASE");

    expect(base?.outcome).toBe("AUTO_APPLY");
    expect(base?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "plate", unit: "LB", source: "CALCULATED" }),
        expect.objectContaining({ id: "anchor-rods", quantity: 4 }),
      ]),
    );
  });

  it("automatically gives a normal WF beam exactly two beam-end instances", () => {
    const result = resolveStandardAssemblies(normalBeam());
    const ends = result.applications.find((item) => item.assemblyId === "WF_BEAM_END");

    expect(ends?.instanceCount).toBe(2);
    expect(ends?.components).toContainEqual(
      expect.objectContaining({ id: "field-bolts", quantity: 8 }),
    );
  });

  it("calculates wood-nailer fasteners from beam length and supplied spacing", () => {
    const result = resolveStandardAssemblies(
      normalBeam({ woodNailer: { required: true, fastenerSpacingIn: 24 } }),
    );
    const nailer = result.applications.find((item) => item.assemblyId === "WOOD_NAILER_HARDWARE");

    expect(nailer?.components[0]).toEqual(
      expect.objectContaining({ quantity: 12, rateKey: "HARDWARE_WOOD_NAILER", quoteRequired: true }),
    );
    expect(nailer?.outcome).toBe("BLOCKED");
  });

  it("does not invent plate weight when required dimensions are missing", () => {
    const result = resolveStandardAssemblies(normalHss({ basePlate: undefined }));
    const base = result.applications.find((item) => item.assemblyId === "HSS_COLUMN_BASE");

    expect(base?.outcome).toBe("BLOCKED");
    expect(base?.components.some((item) => item.id === "plate")).toBe(false);
    expect(base?.exception?.message).toContain("plate dimensions");
  });

  it("creates one concise exception instead of applying standards to a nonstandard member", () => {
    const result = resolveStandardAssemblies(normalBeam({ condition: "NONSTANDARD" }));

    expect(result.applications).toEqual([]);
    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0].code).toBe("NONSTANDARD_CONDITION");
  });

  it("does not double-count shop labor when global hours per ton is enabled", () => {
    const result = resolveStandardAssemblies(normalHss());

    expect(result.applications.every((item) => item.additionalShopHours === 0)).toBe(true);
  });

  it("blocks rather than inventing assembly labor when global hours per ton is disabled", () => {
    const result = resolveStandardAssemblies(
      normalHss({ globalShopHoursPerTonEnabled: false }),
    );

    expect(result.applications.every((item) => item.outcome === "BLOCKED")).toBe(true);
    expect(result.exceptions[0].message).toContain("shop-hours-per-ton");
  });
});
