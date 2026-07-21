import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  ALPHABET_ACADEMY_FIXTURE,
  FORGED_IRONWORKS_ESTIMATING_PROFILE,
  SubmissionExportBlockedError,
  createEstimatorReviewReport,
  createProjectWorkbookExportModel,
  exportProjectPricingWorkbook,
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
const report = createEstimatorReviewReport(pricing);
const input = {
  projectName: "Alphabet Academy",
  pricing,
  reviewReport: report,
  companyProfile: FORGED_IRONWORKS_ESTIMATING_PROFILE,
};

describe("typed project workbook export", () => {
  it("copies the supported draft total directly from project pricing", () => {
    const model = createProjectWorkbookExportModel(input);

    expect(model.summary.supportedDraftTotal).toBe(pricing.supportedDraftTotal);
    expect(model.summary).toMatchObject({
      readiness: "DRAFT",
      readyToPrice: false,
      readyToSubmit: false,
    });
    expect(model.summary.warning).toMatch(/excludes unresolved scope/i);
  });

  it("formats existing values without independently recalculating pricing", () => {
    const alteredPricing = {
      ...pricing,
      supportedDraftTotal: 12345.67,
      directCostSubtotal: 7654.32,
      pricedMaterialLines: pricing.pricedMaterialLines.map((line, index) =>
        index === 0 ? { ...line, extendedCost: 432.1 } : line
      ),
    };
    const alteredReport = { ...report, supportedDraftTotal: 12345.67 };
    const model = createProjectWorkbookExportModel({
      ...input,
      pricing: alteredPricing,
      reviewReport: alteredReport,
    });

    expect(model.summary.supportedDraftTotal).toBe(12345.67);
    expect(model.summary.directCostSubtotal).toBe(7654.32);
    expect(model.pricedScope.find((row) => row.traceabilityReference === "aa-wf-verified")?.extendedCost).toBe(432.1);
  });

  it("keeps all unsupported Alphabet Academy scope out of priced scope", () => {
    const model = createProjectWorkbookExportModel(input);
    const unresolved = model.unresolvedScope.map((row) => `${row.description} ${row.reasonUnpriced}`).join("\n");
    const pricedRefs = model.pricedScope.map((row) => row.traceabilityReference).join("\n");

    expect(unresolved).toMatch(/C2 HSS columns|C3 HSS columns/);
    expect(unresolved).toMatch(/Leveling plate|Shear plate|Cap plate/);
    expect(unresolved).toMatch(/Wood-nailer|Bridging|anchor rods|Heavy hex|base washers/i);
    expect(unresolved).toMatch(/Long-span joist|Metal deck/);
    expect(unresolved).toMatch(/Freight|Equipment|Erection/);
    expect(pricedRefs).not.toMatch(/aa-hss-c2|aa-hss-c3|aa-leveling|aa-shear-plate|aa-cap-plate|aa-quote/);
    expect(model.unresolvedScope
      .filter((row) => /Leveling plate|Shear plate|Cap plate/.test(row.description))
      .every((row) => row.relatedActionId.includes("CONNECTION_GEOMETRY_UNRESOLVED"))
    ).toBe(true);
  });

  it("exports only centralized rates actually used by completed pricing lines", () => {
    const model = createProjectWorkbookExportModel(input);
    const usedInPricing = new Set([
      ...pricing.pricedMaterialLines.map((line) => line.rateKey),
      ...pricing.pricedHardwareLines.map((line) => line.rateKey),
      ...pricing.projectCostLines.map((line) => line.rateKey),
    ]);

    expect(new Set(model.ratesUsed.map((rate) => rate.rateKey))).toEqual(usedInPricing);
    expect(model.ratesUsed.every((rate) => rate.value > 0 && rate.approvalStatus === "STANDARD")).toBe(true);
    expect(model.ratesUsed.map((rate) => rate.rateKey)).not.toEqual(expect.arrayContaining([
      "MATERIAL_HSS", "FREIGHT_OUTBOUND", "SALES_TAX",
    ]));
  });

  it("creates no completed zero-dollar row for missing scope", () => {
    const model = createProjectWorkbookExportModel(input);

    expect(model.pricedScope.every((row) => row.extendedCost > 0)).toBe(true);
    expect(model.unresolvedScope.every((row) => !("extendedCost" in row))).toBe(true);
  });

  it("preserves blocker and review classifications and traceability", () => {
    const model = createProjectWorkbookExportModel(input);

    expect(model.estimatorReview.filter((row) => row.classification === "BLOCKER")).toHaveLength(13);
    expect(model.estimatorReview.filter((row) => row.classification === "REVIEW")).toHaveLength(2);
    expect(model.estimatorReview.every((row) => row.traceabilityIds.length > 0)).toBe(true);
  });

  it("generates an in-memory Alphabet Academy draft-review workbook with no formulas", async () => {
    const buffer = await exportProjectPricingWorkbook(input, "DRAFT_REVIEW");
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    await workbook.xlsx.load(arrayBuffer);

    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Estimate Summary",
      "Priced Scope",
      "Unresolved Scope",
      "Estimator Review",
      "Rates Used",
    ]);
    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => row.eachCell((cell) => {
        expect(typeof cell.value === "object" && cell.value !== null && "formula" in cell.value).toBe(false);
      }));
    }
  });

  it("rejects submission-ready export while blockers remain", async () => {
    await expect(exportProjectPricingWorkbook(input, "SUBMISSION_READY"))
      .rejects.toBeInstanceOf(SubmissionExportBlockedError);
  });

  it("leaves legacy workbook artifacts byte-for-byte unchanged", () => {
    const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

    expect(digest("bid-sheet/bid-workbook-master.xlsx")).toBe(
      "0ca0360b09a934b738ab80b0971238d82b9b95a495c8c03976f37e9f1d8a3500",
    );
    expect(digest("completed-bids/Alphabet-Academy-2026-07-16-bid-calc.xlsx")).toBe(
      "b24c2d6b7f286e9a99199de831b70b7678631c904afc287563c460116e944bd3",
    );
  });
});
