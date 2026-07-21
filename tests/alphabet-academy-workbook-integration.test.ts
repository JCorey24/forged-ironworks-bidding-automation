import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  FORGED_IRONWORKS_ESTIMATING_PROFILE,
  createProjectWorkbookExportModel,
  runAlphabetAcademyDraftReview,
} from "../src";

describe("Alphabet Academy executable workbook path", () => {
  it("runs fixture ingestion through pricing, review, export, and workbook reopen", async () => {
    const directory = await mkdtemp(join(tmpdir(), "alphabet-academy-export-"));
    const outputPath = join(directory, "Alphabet-Academy-draft-review.xlsx");
    const run = await runAlphabetAcademyDraftReview(outputPath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputPath);
    const model = createProjectWorkbookExportModel({
      projectName: "Alphabet Academy",
      pricing: run.pricing,
      reviewReport: run.reviewReport,
      companyProfile: FORGED_IRONWORKS_ESTIMATING_PROFILE,
    });

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Estimate Summary",
      "Priced Scope",
      "Unresolved Scope",
      "Estimator Review",
      "Rates Used",
    ]);

    const summary = keyValueRows(workbook.getWorksheet("Estimate Summary")!);
    expect(summary.get("Supported Draft Total")).toBe(run.pricing.supportedDraftTotal);
    expect(summary.get("Direct Cost Subtotal")).toBe(run.pricing.directCostSubtotal);
    expect(summary.get("Indirect Cost Subtotal")).toBe(run.pricing.indirectCostSubtotal);
    expect(summary.get("Markup")).toBe(run.pricing.markup);
    expect(summary.get("Readiness")).toBe("DRAFT");
    expect(summary.get("Ready To Price")).toBe("NO");
    expect(summary.get("Ready To Submit")).toBe("NO");
    expect(String(summary.get("Warning"))).toMatch(/excludes unresolved scope/i);

    const pricedRows = tableRows(workbook.getWorksheet("Priced Scope")!);
    expect(pricedRows).toHaveLength(model.pricedScope.length);
    for (const expected of model.pricedScope) {
      expect(pricedRows.filter((row) =>
        row["Traceability Reference"] === expected.traceabilityReference &&
        row["Extended Cost"] === expected.extendedCost
      )).toHaveLength(1);
    }

    const pricedReferences = pricedRows.map((row) => String(row["Traceability Reference"]));
    const unresolvedRows = tableRows(workbook.getWorksheet("Unresolved Scope")!);
    for (const row of unresolvedRows) {
      for (const traceId of String(row["Traceability Reference"]).split("|")) {
        expect(pricedReferences).not.toContain(traceId);
      }
    }

    const reviewRows = tableRows(workbook.getWorksheet("Estimator Review")!);
    expect(reviewRows.filter((row) => row.Classification === "BLOCKER")).toHaveLength(13);
    expect(reviewRows.filter((row) => row.Classification === "REVIEW")).toHaveLength(2);
    expect(reviewRows.every((row) => String(row["Traceability Ids"]).length > 0)).toBe(true);

    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => row.eachCell((cell) => {
        expect(typeof cell.value === "object" && cell.value !== null && "formula" in cell.value).toBe(false);
      }));
    }
  });
});

function keyValueRows(sheet: ExcelJS.Worksheet): Map<string, ExcelJS.CellValue> {
  const result = new Map<string, ExcelJS.CellValue>();
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    result.set(String(sheet.getCell(row, 1).value), sheet.getCell(row, 2).value);
  }
  return result;
}

function tableRows(sheet: ExcelJS.Worksheet): Record<string, ExcelJS.CellValue>[] {
  const headers = (sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1).map(String);
  const rows: Record<string, ExcelJS.CellValue>[] = [];
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    rows.push(Object.fromEntries(headers.map((header, index) => [header, sheet.getCell(row, index + 1).value])));
  }
  return rows;
}
