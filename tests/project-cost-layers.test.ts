import { describe, expect, it } from "vitest";
import {
  ALPHABET_ACADEMY_FIXTURE,
  FORGED_IRONWORKS_ESTIMATING_PROFILE,
  priceProject,
  type CompanyEstimatingProfile,
  type ProjectPricingInput,
} from "../src";

const baseInput: ProjectPricingInput = {
  takeoffLines: ALPHABET_ACADEMY_FIXTURE.takeoffLines,
  assemblyExceptions: ALPHABET_ACADEMY_FIXTURE.unresolvedAssemblyExceptions,
  requiredQuoteRateKeys: ALPHABET_ACADEMY_FIXTURE.requiredQuoteRateKeys,
  costInputs: {
    equipment: { required: true },
    erection: { required: true },
  },
};

function result(input: ProjectPricingInput = baseInput, profile = FORGED_IRONWORKS_ESTIMATING_PROFILE) {
  return priceProject(input, profile);
}

function layer(category: string) {
  return result().projectCostLines.find((line) => line.costCategory === category)!;
}

describe("project cost layers", () => {
  it("uses supported fabricated tonnage and the approved ten shop-hours-per-ton policy", () => {
    const priced = result();
    const supportedWeight = priced.pricedMaterialLines.reduce((sum, line) => sum + line.quantity, 0);
    const shop = layer("SHOP_LABOR");

    expect(shop.basis?.supportedFabricatedSteelWeightLb).toBeCloseTo(supportedWeight, 6);
    expect(shop.basis?.supportedTonnage).toBeCloseTo(supportedWeight / 2000, 6);
    expect(shop.quantity).toBeCloseTo((supportedWeight / 2000) * 10, 6);
    expect(shop.rateKey).toBe("LABOR_SHOP");
    expect(shop.calculationMethod).toBe("SUPPORTED_TONS_TIMES_HOURS_PER_TON_TIMES_RATE");
  });

  it("excludes unresolved HSS and connection plates from supported labor weight", () => {
    const priced = result();
    const unresolvedIds = new Set(priced.unresolvedLines.map((line) => line.takeoffRecordId));
    const shop = layer("SHOP_LABOR");

    expect(priced.pricedMaterialLines.some((line) => unresolvedIds.has(line.takeoffRecordId))).toBe(false);
    expect(shop.basis?.supportedFabricatedSteelWeightLb).toBeCloseTo(9224 + 2721.36 + 366.69, 1);
  });

  it("uses the same explicit supported tonnage for detailing and engineering", () => {
    const shop = layer("SHOP_LABOR");
    const detailing = layer("DETAILING");
    const engineering = layer("ENGINEERING");

    expect(detailing.quantity).toBeCloseTo(shop.basis!.supportedTonnage!, 6);
    expect(engineering.quantity).toBeCloseTo(shop.basis!.supportedTonnage!, 6);
    expect([detailing.rateKey, engineering.rateKey]).toEqual(["SERVICE_DETAILING", "SERVICE_ENGINEERING"]);
  });

  it("blocks freight instead of using the pending one-load default", () => {
    const priced = result();

    expect(priced.projectCostLines.some((line) => line.costCategory === "FREIGHT")).toBe(false);
    expect(priced.unresolvedCostCategories).toContain("FREIGHT");
    expect(priced.groupedBlockers.some((item) => item.code === "FREIGHT_LOAD_COUNT_REQUIRED")).toBe(true);
  });

  it("keeps required equipment and erection unresolved without approved inputs", () => {
    const priced = result();

    expect(priced.unresolvedCostCategories).toEqual(expect.arrayContaining(["EQUIPMENT", "ERECTION_LABOR"]));
    expect(priced.projectCostLines.some((line) => ["EQUIPMENT", "ERECTION_LABOR"].includes(line.costCategory))).toBe(false);
    expect(priced.groupedBlockers.map((item) => item.code)).toEqual(expect.arrayContaining(["EQUIPMENT_SELECTION_REQUIRED", "ERECTION_INPUTS_REQUIRED"]));
  });

  it("applies tax only when the taxable-category policy is approved", () => {
    const pending = result();
    const approvedTaxProfile: CompanyEstimatingProfile = {
      ...FORGED_IRONWORKS_ESTIMATING_PROFILE,
      costLayers: {
        ...FORGED_IRONWORKS_ESTIMATING_PROFILE.costLayers,
        tax: {
          taxableCostCategories: {
            value: ["MATERIAL"],
            approval: "APPROVED",
            source: "Test-approved taxable material policy",
          },
        },
      },
    };
    const approved = result(baseInput, approvedTaxProfile);

    expect(pending.taxableSubtotal).toBeNull();
    expect(pending.tax).toBeNull();
    expect(approved.taxableSubtotal).toBe(approved.subtotalByCostCategory.MATERIAL);
    expect(approved.tax).toBeCloseTo(approved.taxableSubtotal! * 0.07, 2);
    expect(approved.projectCostLines.find((line) => line.costCategory === "TAX")?.dependencySource).toBe("Test-approved taxable material policy");
  });

  it("calculates markup from supported direct and indirect costs", () => {
    const priced = result();
    const markup = layer("MARKUP");
    const supportedBasis = priced.directCostSubtotal + priced.indirectCostSubtotal;

    expect(markup.basis?.supportedCostSubtotal).toBe(supportedBasis);
    expect(markup.extendedCost).toBeCloseTo(supportedBasis * 0.12, 2);
    expect(markup.rateKey).toBe("MARKUP_STANDARD");
    expect(JSON.stringify(markup)).not.toMatch(/10790|historical|target/i);
  });

  it("does not stack assembly fabrication hours on the global tonnage rule", () => {
    const baseline = layer("SHOP_LABOR");
    const withAssemblyHours = result({
      ...baseInput,
      assemblyApplications: [{
        assemblyId: "WF_BEAM_END",
        assemblyVersion: 1,
        lineItemId: "aa-wf-verified",
        instanceCount: 2,
        outcome: "AUTO_APPLY",
        confidence: "HIGH",
        components: [],
        additionalShopHours: 100,
      }],
    }).projectCostLines.find((line) => line.costCategory === "SHOP_LABOR")!;

    expect(withAssemblyHours.quantity).toBe(baseline.quantity);
    expect(withAssemblyHours.extendedCost).toBe(baseline.extendedCost);
  });

  it("creates no completed zero-dollar cost layer", () => {
    const priced = result();

    expect(priced.projectCostLines.every((line) => line.extendedCost > 0)).toBe(true);
    expect(priced.unresolvedCostCategories).toEqual(expect.arrayContaining(["FREIGHT", "EQUIPMENT", "ERECTION_LABOR", "TAX"]));
  });

  it("reports a supported draft total while material blockers preserve draft-only readiness", () => {
    const priced = result();

    expect(priced.supportedDraftTotal).toBe(
      Math.round((priced.directCostSubtotal + priced.indirectCostSubtotal + priced.markup) * 100) / 100,
    );
    expect(priced.readiness).toEqual({ status: "DRAFT", draftPricingAllowed: true, readyToPrice: false, readyToSubmit: false });
  });
});
