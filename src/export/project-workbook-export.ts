import ExcelJS from "exceljs";
import type { CompanyEstimatingProfile } from "../config/company-estimating-profile";
import type { EstimatorReviewAction, EstimatorReviewReport } from "../services/estimator-review-report";
import type { ProjectPricingResult } from "../services/project-pricing";
import type { ForgedIronworksRateKey } from "../rates/forged-ironworks-rates";
import type { RateUnit } from "../rates/rate-source";

export type WorkbookExportMode = "DRAFT_REVIEW" | "SUBMISSION_READY";

export interface EstimateSummaryExport {
  projectName: string;
  readiness: string;
  readyToPrice: boolean;
  readyToSubmit: boolean;
  supportedDraftTotal: number;
  directCostSubtotal: number;
  indirectCostSubtotal: number;
  taxableSubtotal: number | null;
  tax: number | null;
  markup: number;
  warning: string;
}

export interface PricedScopeExportRow {
  description: string;
  costCategory: string;
  quantity: number;
  unit: string;
  rate: number | null;
  rateKey: string;
  rateSource: string;
  calculationMethod: string;
  extendedCost: number;
  traceabilityReference: string;
  status: string;
}

export interface UnresolvedScopeExportRow {
  description: string;
  quantityOrBasis: string;
  reasonUnpriced: string;
  missingInput: string;
  responsibleRole: string;
  pricingOrSubmissionEffect: string;
  relatedActionId: string;
  traceabilityReference: string;
}

export interface EstimatorReviewExportRow {
  priority: string;
  classification: string;
  requiredAction: string;
  whyItMatters: string;
  requiredResolution: string;
  responsibleRole: string;
  status: string;
  draftPricingMayContinue: boolean;
  traceabilityIds: string;
}

export interface RateUsedExportRow {
  rateKey: ForgedIronworksRateKey;
  description: string;
  value: number;
  unit: RateUnit;
  source: string;
  approvalStatus: "STANDARD";
}

export interface ProjectWorkbookExportModel {
  summary: EstimateSummaryExport;
  pricedScope: PricedScopeExportRow[];
  unresolvedScope: UnresolvedScopeExportRow[];
  estimatorReview: EstimatorReviewExportRow[];
  ratesUsed: RateUsedExportRow[];
}

export interface ProjectWorkbookExportInput {
  projectName: string;
  pricing: ProjectPricingResult;
  reviewReport: EstimatorReviewReport;
  companyProfile: CompanyEstimatingProfile;
}

export class SubmissionExportBlockedError extends Error {
  constructor(readiness: string) {
    super(`Submission-ready workbook blocked: project readiness is ${readiness}.`);
    this.name = "SubmissionExportBlockedError";
  }
}

export function createProjectWorkbookExportModel(
  input: ProjectWorkbookExportInput,
): ProjectWorkbookExportModel {
  const { pricing, reviewReport, companyProfile } = input;
  const pricedScope: PricedScopeExportRow[] = [
    ...pricing.pricedMaterialLines,
    ...pricing.pricedHardwareLines,
  ].map((line) => ({
    description: line.description,
    costCategory: line.costCategory,
    quantity: line.quantity,
    unit: line.unit,
    rate: line.rateAmount,
    rateKey: line.rateKey,
    rateSource: line.rateSource,
    calculationMethod: line.calculationMethod,
    extendedCost: line.extendedCost,
    traceabilityReference: line.assemblyInstance
      ? `${line.takeoffRecordId}|${line.assemblyInstance.assemblyId}:v${line.assemblyInstance.version}:${line.assemblyInstance.componentId}`
      : line.takeoffRecordId,
    status: "FINAL",
  }));

  for (const line of pricing.projectCostLines) {
    const rate = companyProfile.rateSource.get(line.rateKey);
    pricedScope.push({
      description: humanize(line.costCategory),
      costCategory: line.costCategory,
      quantity: line.quantity,
      unit: line.unit,
      rate: rate?.status === "STANDARD" ? rate.amount : null,
      rateKey: line.rateKey,
      rateSource: line.rateSource,
      calculationMethod: line.calculationMethod,
      extendedCost: line.extendedCost,
      traceabilityReference: line.id,
      status: line.status,
    });
  }

  for (const line of pricing.allowanceLines) {
    const basis = line.allowance.pricingBasis;
    pricedScope.push({
      description: line.allowance.id,
      costCategory: "ALLOWANCE",
      quantity: line.allowance.quantityBasis.quantity,
      unit: line.allowance.quantityBasis.type,
      rate: basis.type === "FIXED_AMOUNT" ? basis.amount : null,
      rateKey: basis.type === "RATE_KEY" ? basis.rateKey : "FIXED_APPROVED_ALLOWANCE",
      rateSource: line.allowance.approvalSource,
      calculationMethod: line.calculationMethod,
      extendedCost: line.extendedCost,
      traceabilityReference: `${line.takeoffRecordId}|${line.assemblyId}:v${line.assemblyVersion}`,
      status: line.allowance.mayAppearInFinalProposal ? "FINAL" : "PROVISIONAL",
    });
  }

  const actions = reviewReport.requiredEstimatorActions;
  const unresolvedScope: UnresolvedScopeExportRow[] = [
    ...pricing.unresolvedLines,
    ...pricing.quoteRequiredLines,
  ].map((line) => unresolvedRow(
    line.description,
    line.quantity === undefined ? "Unknown" : `${line.quantity} ${line.unit ?? ""}`.trim(),
    line.reason,
    line.takeoffRecordId,
    line.reasonCode,
    actions,
  ));
  for (const category of pricing.unresolvedCostCategories) {
    const action = actionForCostCategory(category, actions);
    unresolvedScope.push({
      description: humanize(category),
      quantityOrBasis: "Not supplied",
      reasonUnpriced: action?.whatIsMissing ?? `${humanize(category)} input is unresolved.`,
      missingInput: action?.resolutionInput ?? "Provide the required approved project input.",
      responsibleRole: action?.responsibleSourceOrRole ?? "Estimator",
      pricingOrSubmissionEffect: action?.affects.join(", ") ?? "COST, FINAL_SUBMISSION",
      relatedActionId: action?.id ?? "",
      traceabilityReference: action ? traceIds(action) : `project-cost:${category}`,
    });
  }

  const usedRateKeys = new Set<ForgedIronworksRateKey>([
    ...pricing.pricedMaterialLines.map((line) => line.rateKey),
    ...pricing.pricedHardwareLines.map((line) => line.rateKey),
    ...pricing.projectCostLines.map((line) => line.rateKey),
    ...pricing.allowanceLines.flatMap((line) =>
      line.allowance.pricingBasis.type === "RATE_KEY"
        ? [line.allowance.pricingBasis.rateKey]
        : [],
    ),
  ]);
  const ratesUsed = [...usedRateKeys].map((rateKey): RateUsedExportRow => {
    const rate = companyProfile.rateSource.get(rateKey);
    if (!rate || rate.status !== "STANDARD") {
      throw new Error(`Export blocked: used rate ${rateKey} is not an approved standard rate.`);
    }
    return {
      rateKey,
      description: humanize(rateKey),
      value: rate.amount,
      unit: rate.unit,
      source: rate.source,
      approvalStatus: "STANDARD",
    };
  });

  return {
    summary: {
      projectName: input.projectName,
      readiness: reviewReport.projectReadiness.status,
      readyToPrice: reviewReport.projectReadiness.readyToPrice,
      readyToSubmit: reviewReport.projectReadiness.readyToSubmit,
      supportedDraftTotal: pricing.supportedDraftTotal,
      directCostSubtotal: pricing.directCostSubtotal,
      indirectCostSubtotal: pricing.indirectCostSubtotal,
      taxableSubtotal: pricing.taxableSubtotal,
      tax: pricing.tax,
      markup: pricing.markup,
      warning: "INTERNAL DRAFT — total excludes unresolved scope and is not ready for submission.",
    },
    pricedScope,
    unresolvedScope,
    estimatorReview: actions.map((action) => ({
      priority: `${action.priorityRank} - ${action.priority}`,
      classification: action.severity,
      requiredAction: action.whatIsMissing,
      whyItMatters: action.whyItMatters,
      requiredResolution: action.resolutionInput,
      responsibleRole: action.responsibleSourceOrRole,
      status: action.status,
      draftPricingMayContinue: action.draftPricingAllowed,
      traceabilityIds: traceIds(action),
    })),
    ratesUsed,
  };
}

export async function exportProjectPricingWorkbook(
  input: ProjectWorkbookExportInput,
  mode: WorkbookExportMode = "DRAFT_REVIEW",
): Promise<Buffer> {
  if (
    mode === "SUBMISSION_READY" &&
    input.reviewReport.projectReadiness.status !== "READY_TO_SUBMIT"
  ) {
    throw new SubmissionExportBlockedError(input.reviewReport.projectReadiness.status);
  }
  const model = createProjectWorkbookExportModel(input);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Forged Ironworks typed pricing export";
  addSummarySheet(workbook, model.summary);
  addTableSheet(workbook, "Priced Scope", Object.keys(model.pricedScope[0] ?? {}), model.pricedScope);
  addTableSheet(workbook, "Unresolved Scope", Object.keys(model.unresolvedScope[0] ?? {}), model.unresolvedScope);
  addTableSheet(workbook, "Estimator Review", Object.keys(model.estimatorReview[0] ?? {}), model.estimatorReview);
  addTableSheet(workbook, "Rates Used", Object.keys(model.ratesUsed[0] ?? {}), model.ratesUsed);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function addSummarySheet(workbook: ExcelJS.Workbook, summary: EstimateSummaryExport): void {
  const sheet = workbook.addWorksheet("Estimate Summary");
  sheet.addRow(["Estimate Summary"]);
  for (const [key, value] of Object.entries(summary)) sheet.addRow([humanize(key), value ?? "Not available"]);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 80;
}

function addTableSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: readonly object[],
): void {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers.map(humanize));
  for (const row of rows) {
    const values = row as Record<string, unknown>;
    sheet.addRow(headers.map((header) => values[header] ?? ""));
  }
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  headers.forEach((_, index) => { sheet.getColumn(index + 1).width = 24; });
}

function unresolvedRow(
  description: string,
  quantity: string,
  reason: string,
  traceId: string,
  reasonCode: string,
  actions: readonly EstimatorReviewAction[],
): UnresolvedScopeExportRow {
  const assemblyId = reasonCode === "CONNECTION_GEOMETRY_UNRESOLVED"
    ? description.toLowerCase().includes("leveling")
      ? "HSS_COLUMN_BASE"
      : description.toLowerCase().includes("shear")
        ? "WF_BEAM_END"
        : description.toLowerCase().includes("cap")
          ? "HSS_COLUMN_TOP"
          : undefined
    : undefined;
  const action = actions.find((item) =>
    item.traceability.takeoffRecordIds.includes(traceId) ||
    (assemblyId !== undefined && item.traceability.assemblyIds.includes(assemblyId)),
  );
  return {
    description,
    quantityOrBasis: quantity,
    reasonUnpriced: reason,
    missingInput: action?.resolutionInput ?? reason,
    responsibleRole: action?.responsibleSourceOrRole ?? "Estimator",
    pricingOrSubmissionEffect: action?.affects.join(", ") ?? "COST, FINAL_SUBMISSION",
    relatedActionId: action?.id ?? "",
    traceabilityReference: traceId,
  };
}

function actionForCostCategory(
  category: string,
  actions: readonly EstimatorReviewAction[],
): EstimatorReviewAction | undefined {
  const code = {
    FREIGHT: "FREIGHT_",
    EQUIPMENT: "EQUIPMENT_",
    ERECTION_LABOR: "ERECTION_",
    TAX: "TAX_",
  }[category];
  return code ? actions.find((action) => action.id.includes(code)) : undefined;
}

function traceIds(action: EstimatorReviewAction): string {
  return [
    ...action.traceability.takeoffRecordIds,
    ...action.traceability.assemblyIds,
    ...action.traceability.rateKeys,
    ...action.traceability.projectCostLineIds,
    ...action.traceability.readinessRules,
  ].join("|");
}

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
