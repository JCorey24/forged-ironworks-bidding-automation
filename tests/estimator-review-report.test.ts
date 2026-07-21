import { describe, expect, it } from "vitest";
import {
  ALPHABET_ACADEMY_FIXTURE,
  FORGED_IRONWORKS_ESTIMATING_PROFILE,
  createEstimatorReviewReport,
  priceProject,
} from "../src";

const pricing = priceProject(
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

function report() {
  return createEstimatorReviewReport(pricing);
}

describe("estimator review report", () => {
  it("groups all unresolved HSS length evidence into one action", () => {
    const actions = report().requiredEstimatorActions.filter((action) =>
      action.id.includes("HSS_LENGTH_UNRESOLVED"),
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].traceability.takeoffRecordIds).toEqual(expect.arrayContaining([
      "aa-hss-c2", "aa-hss-c3",
    ]));
    expect(actions[0].traceability.assemblyIds).toContain("STANDARD_ASSEMBLY_SELECTION");
  });

  it("groups connection geometry by assembly type", () => {
    const actions = report().requiredEstimatorActions.filter((action) =>
      action.id.includes("CONNECTION_GEOMETRY_UNRESOLVED"),
    );

    expect(actions).toHaveLength(3);
    expect(actions.flatMap((action) => action.traceability.assemblyIds).sort()).toEqual([
      "HSS_COLUMN_BASE", "HSS_COLUMN_TOP", "WF_BEAM_END",
    ]);
    expect(actions.every((action) => action.severity === "BLOCKER")).toBe(true);
  });

  it("identifies joist and deck supplier quotes separately", () => {
    const quotes = report().requiredEstimatorActions.filter((action) =>
      action.priority === "SUPPLIER_QUOTE",
    );

    expect(quotes).toHaveLength(2);
    expect(quotes.flatMap((action) => action.traceability.rateKeys).sort()).toEqual([
      "STRUCTURAL_LH_JOIST", "STRUCTURAL_METAL_DECK",
    ]);
    expect(quotes.every((action) => /supplier quote/i.test(action.resolutionInput))).toBe(true);
  });

  it("identifies missing wood-nailer and bridging rates", () => {
    const missingRates = report().requiredEstimatorActions.filter((action) =>
      action.priority === "MISSING_RATE",
    );

    expect(missingRates.flatMap((action) => action.traceability.rateKeys)).toEqual(expect.arrayContaining([
      "HARDWARE_WOOD_NAILER",
      "HARDWARE_WOOD_NAILER_WASHER",
      "HARDWARE_BRIDGING_TERMINATION",
    ]));
  });

  it("reports freight, equipment, erection, and tax policy as separate actions", () => {
    const actions = report().requiredEstimatorActions;

    expect(actions.map((action) => action.id)).toEqual(expect.arrayContaining([
      expect.stringContaining("FREIGHT_LOAD_COUNT_REQUIRED"),
      expect.stringContaining("EQUIPMENT_SELECTION_REQUIRED"),
      expect.stringContaining("ERECTION_INPUTS_REQUIRED"),
      expect.stringContaining("TAX_POLICY_PENDING"),
    ]));
    expect(actions.find((action) => action.id.includes("TAX_POLICY_PENDING"))?.responsibleSourceOrRole).toBe("Forged Ironworks management");
  });

  it("distinguishes nonblocking reviews from blockers and preserves priority order", () => {
    const actions = report().requiredEstimatorActions;

    expect(actions.some((action) => action.severity === "BLOCKER")).toBe(true);
    expect(actions.some((action) => action.severity === "REVIEW")).toBe(true);
    expect(actions.map((action) => action.priorityRank)).toEqual(
      [...actions.map((action) => action.priorityRank)].sort((a, b) => a - b),
    );
    expect(actions.filter((action) => action.severity === "REVIEW").every((action) =>
      action.traceability.readinessRules.length === 1 &&
      action.traceability.readinessRules[0] === "READY_TO_SUBMIT"
    )).toBe(true);
  });

  it("keeps the supported draft total and priced-scope summary visible", () => {
    const review = report();

    expect(review.supportedDraftTotal).toBe(27242.04);
    expect(review.pricedScopeSummary).toMatchObject({
      materialLineCount: 7,
      hardwareLineCount: 2,
      allowanceLineCount: 0,
      projectCostLineCount: 4,
    });
    expect(review.conciseSummary).toContain("$27242.04");
  });

  it("updates a review action without mutating pricing evidence", () => {
    const initial = report();
    const reviewAction = initial.requiredEstimatorActions.find((action) =>
      action.severity === "REVIEW" && action.priority === "NONBLOCKING_REVIEW",
    )!;
    const updated = createEstimatorReviewReport(pricing, {
      [reviewAction.id]: "RESOLVED",
    });

    expect(updated.requiredEstimatorActions.find((action) => action.id === reviewAction.id)?.status).toBe("RESOLVED");
    expect(updated.groupedReviewItems).toEqual(initial.groupedReviewItems);
  });

  it("becomes ready to price after true blockers are resolved but still gates submission", () => {
    const initial = report();
    const blockerStatuses = Object.fromEntries(
      initial.requiredEstimatorActions
        .filter((action) => action.severity === "BLOCKER")
        .map((action) => [action.id, "RESOLVED" as const]),
    );
    const updated = createEstimatorReviewReport(pricing, blockerStatuses);
    const oneBlocker = initial.requiredEstimatorActions.find((action) => action.severity === "BLOCKER")!;
    const rejectedProvisional = createEstimatorReviewReport(pricing, {
      [oneBlocker.id]: "ACCEPTED_PROVISIONAL",
    });

    expect(updated.projectReadiness).toEqual({
      status: "READY_TO_PRICE",
      draftPricingAllowed: true,
      readyToPrice: true,
      readyToSubmit: false,
    });
    expect(rejectedProvisional.requiredEstimatorActions.find((action) => action.id === oneBlocker.id)?.status).toBe("OPEN");
    expect(rejectedProvisional.projectReadiness.readyToPrice).toBe(false);
  });

  it("uses no historical proposal total", () => {
    expect(JSON.stringify(report())).not.toMatch(
      /10790|historical (bid|proposal) total|flat adjustment|unclassified residual/i,
    );
  });
});
