import { describe, expect, it } from "vitest";
import {
  ALPHABET_ACADEMY_FIXTURE,
  FORGED_IRONWORKS_ESTIMATING_PROFILE,
  priceProject,
} from "../src";

function result() {
  return priceProject(
    {
      takeoffLines: ALPHABET_ACADEMY_FIXTURE.takeoffLines,
      assemblyExceptions: ALPHABET_ACADEMY_FIXTURE.unresolvedAssemblyExceptions,
      requiredQuoteRateKeys: ALPHABET_ACADEMY_FIXTURE.requiredQuoteRateKeys,
      costInputs: {
        equipment: { required: true },
        erection: { required: true },
      },
    },
    FORGED_IRONWORKS_ESTIMATING_PROFILE,
  );
}

describe("project-level pricing", () => {
  it("creates traceable cost lines for all supported verified steel", () => {
    const priced = result().pricedMaterialLines;

    expect(new Set(priced.map((line) => line.rateKey))).toEqual(
      new Set(["MATERIAL_WF_BEAM", "MATERIAL_ANGLE", "MATERIAL_BURNED_PLATE"]),
    );
    expect(priced).toHaveLength(7);
    expect(priced.every((line) =>
      line.takeoffRecordId &&
      line.rateSource.includes("reference/rates.md") &&
      line.quantity > 0 &&
      line.unit === "LB" &&
      line.calculationMethod === "WEIGHT_TIMES_RATE" &&
      line.extendedCost > 0
    )).toBe(true);
  });

  it("does not price HSS whose drawing-derived length and weight are unresolved", () => {
    const priced = result();

    expect(priced.pricedMaterialLines.some((line) => line.rateKey === "MATERIAL_HSS")).toBe(false);
    expect(priced.unresolvedLines.filter((line) => line.reasonCode === "HSS_LENGTH_UNRESOLVED")).toHaveLength(2);
  });

  it("does not invent connection-plate material cost", () => {
    const priced = result();
    const unresolvedPlateIds = new Set(
      ALPHABET_ACADEMY_FIXTURE.takeoffLines
        .filter((line) => ["LEVELING_PLATE", "SHEAR_PLATE", "CAP_PLATE"].includes(line.category))
        .map((line) => line.id),
    );

    expect(priced.pricedMaterialLines.some((line) => unresolvedPlateIds.has(line.takeoffRecordId))).toBe(false);
    expect(priced.unresolvedLines.filter((line) => unresolvedPlateIds.has(line.takeoffRecordId))).toHaveLength(27);
    expect(priced.allowanceLines).toEqual([]);
  });

  it("prices approved studs and epoxy anchors but blocks nailer and bridging hardware", () => {
    const priced = result();

    expect(priced.pricedHardwareLines.map((line) => line.rateKey)).toEqual([
      "HARDWARE_SHEAR_STUD",
      "HARDWARE_EPOXY_ANCHOR",
    ]);
    expect(priced.unresolvedLines).toEqual(expect.arrayContaining([
      expect.objectContaining({ takeoffRecordId: "aa-hw-nailer-bolts", rateKey: "HARDWARE_WOOD_NAILER" }),
      expect.objectContaining({ takeoffRecordId: "aa-hw-nailer-washers", rateKey: "HARDWARE_WOOD_NAILER_WASHER" }),
      expect.objectContaining({ takeoffRecordId: "aa-hw-bridging-anchors", rateKey: "HARDWARE_BRIDGING_TERMINATION" }),
    ]));
  });

  it("keeps joist and deck supplier quotes blocked", () => {
    const priced = result();

    expect(priced.quoteRequiredLines.map((line) => line.rateKey)).toEqual([
      "STRUCTURAL_LH_JOIST",
      "STRUCTURAL_METAL_DECK",
    ]);
    expect(priced.groupedBlockers.some((item) => item.code === "SUPPLIER_QUOTE_REQUIRED")).toBe(true);
  });

  it("subtotals only positive supported priced scope", () => {
    const priced = result();
    const allPriced = [...priced.pricedMaterialLines, ...priced.pricedHardwareLines];

    expect(priced.subtotalByCostCategory).toEqual({
      MATERIAL: allPriced.filter((line) => line.costCategory === "MATERIAL").reduce((sum, line) => Math.round((sum + line.extendedCost) * 100) / 100, 0),
      HARDWARE: allPriced.filter((line) => line.costCategory === "HARDWARE").reduce((sum, line) => Math.round((sum + line.extendedCost) * 100) / 100, 0),
      ALLOWANCE: 0,
    });
    expect(allPriced.every((line) => line.extendedCost > 0 && line.rateAmount > 0)).toBe(true);
  });

  it("does not double-price a takeoff rate through an assembly component", () => {
    const fixture = ALPHABET_ACADEMY_FIXTURE;
    const priced = priceProject(
      {
        takeoffLines: fixture.takeoffLines,
        assemblyApplications: [{
          assemblyId: "PERIMETER_ANGLE_ANCHOR",
          assemblyVersion: 1,
          lineItemId: "aa-hw-perimeter-anchors",
          instanceCount: 1,
          outcome: "AUTO_APPLY",
          confidence: "HIGH",
          components: [{ id: "epoxy-anchors", description: "Epoxy anchors", quantity: 49, unit: "EA", source: "CALCULATED", rateKey: "HARDWARE_EPOXY_ANCHOR", quoteRequired: false }],
          additionalShopHours: 0,
        }],
        assemblyExceptions: fixture.unresolvedAssemblyExceptions,
        requiredQuoteRateKeys: fixture.requiredQuoteRateKeys,
      },
      FORGED_IRONWORKS_ESTIMATING_PROFILE,
    );

    expect(priced.pricedHardwareLines.filter((line) => line.rateKey === "HARDWARE_EPOXY_ANCHOR")).toHaveLength(1);
  });

  it("does not bypass takeoff validation before pricing", () => {
    const invalidWf = {
      ...ALPHABET_ACADEMY_FIXTURE.takeoffLines.find((line) => line.id === "aa-wf-verified")!,
      memberMark: "",
    };
    const priced = priceProject(
      { takeoffLines: [invalidWf] },
      FORGED_IRONWORKS_ESTIMATING_PROFILE,
    );

    expect(priced.pricedMaterialLines).toEqual([]);
    expect(priced.unresolvedLines).toEqual([
      expect.objectContaining({ takeoffRecordId: "aa-wf-verified", reasonCode: "TAKEOFF_VALIDATION_FAILED" }),
    ]);
    expect(priced.groupedBlockers.some((item) => item.code === "TAKEOFF_TRACE_MISSING")).toBe(true);
  });

  it("uses neither a zero-dollar completion nor a historical project total", () => {
    const priced = result();
    const serialized = JSON.stringify(priced);

    expect([...priced.pricedMaterialLines, ...priced.pricedHardwareLines].some((line) => line.extendedCost === 0)).toBe(false);
    expect(serialized).not.toMatch(/10790|historical (bid|proposal) total|flat adjustment|unclassified residual/i);
  });

  it("remains a traceable draft while blockers and review items exist", () => {
    const priced = result();

    expect(priced.groupedReviewItems.length).toBeGreaterThan(0);
    expect(priced.groupedBlockers.length).toBeGreaterThan(0);
    expect(priced.readiness).toEqual({
      status: "DRAFT",
      draftPricingAllowed: true,
      readyToPrice: false,
      readyToSubmit: false,
    });
  });
});
