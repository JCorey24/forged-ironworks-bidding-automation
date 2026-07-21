import { describe, expect, it } from "vitest";
import {
  calculateMaterialCostFromRates,
  FORGED_IRONWORKS_ESTIMATING_PROFILE,
  MissingRateError,
  QuoteRequiredError,
  requireStandardRate,
  resolveLineItemScope,
  type RateSource,
} from "../src";

const furnishedScope = resolveLineItemScope(
  "FURNISH_AND_ERECT",
  "STRUCTURAL_BEAM",
  {
    finish: "PRIME",
    taxTreatment: "TAXABLE",
    resolutionStatus: "RESOLVED",
    scopeSource: "Test",
  },
);

describe("centralized company rates", () => {
  it("uses the centralized WF material rate", () => {
    const rate = requireStandardRate(
      FORGED_IRONWORKS_ESTIMATING_PROFILE.rateSource,
      "MATERIAL_WF_BEAM",
    );
    const cost = calculateMaterialCostFromRates(
      1000,
      "MATERIAL_WF_BEAM",
      furnishedScope,
      FORGED_IRONWORKS_ESTIMATING_PROFILE.rateSource,
    );

    expect(cost).toBe(1000 * rate.amount);
  });

  it("blocks pricing when a required rate is missing", () => {
    const emptySource: RateSource<"MATERIAL_UNKNOWN"> = {
      id: "empty-test-source",
      get: () => undefined,
    };

    const price = () =>
      calculateMaterialCostFromRates(
        100,
        "MATERIAL_UNKNOWN",
        furnishedScope,
        emptySource,
      );

    expect(price).toThrow(MissingRateError);
    expect(price).toThrow('required rate "MATERIAL_UNKNOWN" is missing');
  });

  it.each([
    "STRUCTURAL_LH_JOIST",
    "STRUCTURAL_METAL_DECK",
    "HARDWARE_JOIST_BEARING",
    "HARDWARE_WOOD_NAILER",
    "HARDWARE_WOOD_NAILER_WASHER",
    "HARDWARE_BRIDGING_TERMINATION",
  ] as const)(
    "keeps %s quote-required instead of allowing a zero price",
    (rateKey) => {
      expect(() =>
        calculateMaterialCostFromRates(
          100,
          rateKey,
          furnishedScope,
          FORGED_IRONWORKS_ESTIMATING_PROFILE.rateSource,
        ),
      ).toThrow(QuoteRequiredError);
    },
  );

  it("contains no historical Alphabet Academy bid total", () => {
    expect(
      JSON.stringify(FORGED_IRONWORKS_ESTIMATING_PROFILE),
    ).not.toMatch(/alphabet academy|grand total|submitted total/i);
  });
});
