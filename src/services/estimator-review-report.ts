import type {
  ProjectCostCategory,
  ProjectLayerCostCategory,
  ProjectPricingIssue,
  ProjectPricingReadiness,
  ProjectPricingResult,
} from "./project-pricing";
import type { ForgedIronworksRateKey } from "../rates/forged-ironworks-rates";

export type ReviewActionStatus =
  | "OPEN"
  | "RESOLVED"
  | "ACCEPTED_PROVISIONAL"
  | "NOT_APPLICABLE";

export type ReviewActionPriority =
  | "SCOPE_OR_QUANTITY"
  | "SUPPLIER_QUOTE"
  | "MISSING_RATE"
  | "LABOR_OR_EQUIPMENT_INPUT"
  | "MANAGEMENT_POLICY"
  | "NONBLOCKING_REVIEW";

export interface ReviewActionTraceability {
  takeoffRecordIds: string[];
  assemblyIds: string[];
  rateKeys: ForgedIronworksRateKey[];
  projectCostLineIds: string[];
  readinessRules: ("READY_TO_PRICE" | "READY_TO_SUBMIT")[];
}

export interface EstimatorReviewAction {
  id: string;
  priority: ReviewActionPriority;
  priorityRank: number;
  severity: "BLOCKER" | "REVIEW";
  status: ReviewActionStatus;
  whatIsMissing: string;
  whyItMatters: string;
  resolutionInput: string;
  affects: ("QUANTITY" | "RATE" | "COST" | "FINAL_SUBMISSION")[];
  draftPricingAllowed: boolean;
  responsibleSourceOrRole: string;
  provisionalAcceptanceAllowed: boolean;
  traceability: ReviewActionTraceability;
}

export interface EstimatorReviewReport {
  projectReadiness: ProjectPricingReadiness;
  supportedDraftTotal: number;
  pricedScopeSummary: {
    materialLineCount: number;
    hardwareLineCount: number;
    allowanceLineCount: number;
    projectCostLineCount: number;
    subtotalByCostCategory: Record<ProjectCostCategory, number>;
    calculatedProjectCostCategories: ProjectLayerCostCategory[];
  };
  unresolvedCostCategories: ProjectLayerCostCategory[];
  groupedReviewItems: ProjectPricingIssue[];
  groupedBlockers: ProjectPricingIssue[];
  requiredEstimatorActions: EstimatorReviewAction[];
  conciseSummary: string;
}

export type ReviewActionStatusOverrides = Readonly<Record<string, ReviewActionStatus>>;

export function createEstimatorReviewReport(
  pricing: ProjectPricingResult,
  statusOverrides: ReviewActionStatusOverrides = {},
): EstimatorReviewReport {
  const normalizedBlockers = normalizeIssues(pricing.groupedBlockers);
  const blockerTakeoffIds = new Set(normalizedBlockers.flatMap((issue) => issue.takeoffRecordIds));
  const reviews = normalizeIssues(pricing.groupedReviewItems).filter(
    (issue) => {
      if (
        issue.code === "TAKEOFF_REVIEW_REQUIRED" &&
        /connection plate dimensions and weight/i.test(issue.cause) &&
        normalizedBlockers.some((blocker) => blocker.code === "CONNECTION_GEOMETRY_UNRESOLVED")
      ) return false;
      return !issue.takeoffRecordIds.length || !issue.takeoffRecordIds.every((id) => blockerTakeoffIds.has(id));
    },
  );
  const actions = [...normalizedBlockers, ...reviews]
    .map((issue) => actionFromIssue(issue, pricing, statusOverrides))
    .sort((a, b) => a.priorityRank - b.priorityRank || a.id.localeCompare(b.id));
  const openBlockers = actions.filter((action) => action.severity === "BLOCKER" && action.status === "OPEN");
  const openReviews = actions.filter((action) => action.severity === "REVIEW" && action.status === "OPEN");
  const readyToPrice = openBlockers.length === 0;
  const readyToSubmit = readyToPrice && openReviews.length === 0;
  const projectReadiness: ProjectPricingReadiness = {
    status: readyToSubmit ? "READY_TO_SUBMIT" : readyToPrice ? "READY_TO_PRICE" : "DRAFT",
    draftPricingAllowed: true,
    readyToPrice,
    readyToSubmit,
  };
  const calculatedCategories = unique(pricing.projectCostLines.map((line) => line.costCategory));
  const conciseSummary = [
    `Supported draft total: $${pricing.supportedDraftTotal.toFixed(2)}.`,
    `${openBlockers.length} open blocker${openBlockers.length === 1 ? "" : "s"}.`,
    `${openReviews.length} open review item${openReviews.length === 1 ? "" : "s"}.`,
    `Readiness: ${projectReadiness.status}.`,
  ].join(" ");

  return {
    projectReadiness,
    supportedDraftTotal: pricing.supportedDraftTotal,
    pricedScopeSummary: {
      materialLineCount: pricing.pricedMaterialLines.length,
      hardwareLineCount: pricing.pricedHardwareLines.length,
      allowanceLineCount: pricing.allowanceLines.length,
      projectCostLineCount: pricing.projectCostLines.length,
      subtotalByCostCategory: pricing.subtotalByCostCategory,
      calculatedProjectCostCategories: calculatedCategories,
    },
    unresolvedCostCategories: [...pricing.unresolvedCostCategories],
    groupedReviewItems: pricing.groupedReviewItems,
    groupedBlockers: pricing.groupedBlockers,
    requiredEstimatorActions: actions,
    conciseSummary,
  };
}

function normalizeIssues(issues: readonly ProjectPricingIssue[]): ProjectPricingIssue[] {
  const hasSpecificGeometry = issues.some((issue) => issue.code === "CONNECTION_GEOMETRY_UNRESOLVED" && issue.assemblyIds?.length);
  const groups = new Map<string, ProjectPricingIssue>();
  for (const issue of issues) {
    if (hasSpecificGeometry && issue.code === "CONNECTION_GEOMETRY_UNRESOLVED" && !issue.assemblyIds?.length) continue;
    const hssLengthIssue = ["HSS_LENGTH_UNRESOLVED", "HSS_COLUMN_LENGTH_UNRESOLVED"].includes(issue.code);
    const key = hssLengthIssue
      ? `${issue.severity}|HSS_LENGTH_UNRESOLVED`
      : `${issue.severity}|${issue.code}|${issue.cause}`;
    const existing = groups.get(key);
    if (existing) {
      existing.quantity += issue.quantity;
      existing.takeoffRecordIds = unique([...existing.takeoffRecordIds, ...issue.takeoffRecordIds]);
      existing.assemblyIds = unique([...(existing.assemblyIds ?? []), ...(issue.assemblyIds ?? [])]);
    } else groups.set(key, {
      ...issue,
      code: hssLengthIssue ? "HSS_LENGTH_UNRESOLVED" : issue.code,
      takeoffRecordIds: [...issue.takeoffRecordIds],
      assemblyIds: [...(issue.assemblyIds ?? [])],
    });
  }
  return [...groups.values()];
}

function actionFromIssue(
  issue: ProjectPricingIssue,
  pricing: ProjectPricingResult,
  overrides: ReviewActionStatusOverrides,
): EstimatorReviewAction {
  const details = actionDetails(issue);
  const id = actionId(issue, details.priority);
  const requested = overrides[id] ?? "OPEN";
  const status = requested === "ACCEPTED_PROVISIONAL" && issue.severity === "BLOCKER"
    ? "OPEN"
    : requested;
  const unresolved = pricing.unresolvedLines.filter((line) => issue.takeoffRecordIds.includes(line.takeoffRecordId));
  const quotes = pricing.quoteRequiredLines.filter((line) => issue.takeoffRecordIds.includes(line.takeoffRecordId));
  const rateKeys = unique([
    ...unresolved.flatMap((line) => line.rateKey ? [line.rateKey] : []),
    ...quotes.map((line) => line.rateKey),
  ]);
  const costCategories = categoryForIssue(issue);
  const costLines = pricing.projectCostLines.filter((line) => costCategories.includes(line.costCategory));

  return {
    id,
    priority: details.priority,
    priorityRank: priorityRank(details.priority),
    severity: issue.severity,
    status,
    whatIsMissing: details.what,
    whyItMatters: details.why,
    resolutionInput: details.input,
    affects: details.affects,
    draftPricingAllowed: true,
    responsibleSourceOrRole: details.role,
    provisionalAcceptanceAllowed: issue.severity === "REVIEW",
    traceability: {
      takeoffRecordIds: unique(issue.takeoffRecordIds),
      assemblyIds: unique(issue.assemblyIds ?? []),
      rateKeys,
      projectCostLineIds: costLines.map((line) => line.id),
      readinessRules: issue.severity === "BLOCKER" ? ["READY_TO_PRICE", "READY_TO_SUBMIT"] : ["READY_TO_SUBMIT"],
    },
  };
}

function actionDetails(issue: ProjectPricingIssue): {
  priority: ReviewActionPriority; what: string; why: string; input: string;
  affects: EstimatorReviewAction["affects"]; role: string;
} {
  const code = issue.code;
  if (code === "SUPPLIER_QUOTE_REQUIRED") return { priority: "SUPPLIER_QUOTE", what: `Supplier quote for ${issue.cause}`, why: "Quote-required scope cannot be priced from a company default.", input: "Attach an applicable supplier quote and approved quote amount.", affects: ["RATE", "COST", "FINAL_SUBMISSION"], role: "Supplier / estimator" };
  if (["APPROVED_RATE_REQUIRED", "HARDWARE_SPECIFICATION_NOT_APPROVED", "UNSUPPORTED_HARDWARE_RATE"].includes(code)) return { priority: "MISSING_RATE", what: issue.cause, why: "Unsupported hardware cannot receive a zero or invented rate.", input: "Provide an approved specification-matched company rate or supplier quote.", affects: ["RATE", "COST", "FINAL_SUBMISSION"], role: "Forged Ironworks management / estimator" };
  if (["FREIGHT_LOAD_COUNT_REQUIRED", "EQUIPMENT_SELECTION_REQUIRED", "EQUIPMENT_QUANTITY_REQUIRED", "ERECTION_INPUTS_REQUIRED"].includes(code)) return { priority: "LABOR_OR_EQUIPMENT_INPUT", what: issue.cause, why: "The applicable project cost layer cannot be calculated without its independent quantity basis.", input: laborEquipmentResolution(code), affects: ["QUANTITY", "COST", "FINAL_SUBMISSION"], role: "Estimator / project operations" };
  if (code.includes("POLICY_PENDING") || code === "TAX_POLICY_PENDING" || code === "SHOP_HOURS_POLICY_PENDING" || code === "MARKUP_POLICY_PENDING") return { priority: "MANAGEMENT_POLICY", what: issue.cause, why: "A pending company policy may not be silently treated as approved.", input: "Record Forged Ironworks management approval or an explicit project decision.", affects: ["RATE", "COST", "FINAL_SUBMISSION"], role: "Forged Ironworks management" };
  if (issue.severity === "REVIEW") return { priority: "NONBLOCKING_REVIEW", what: issue.cause, why: "The supported draft may proceed, but final submission requires disposition.", input: "Review the referenced records and mark the item resolved, accepted provisional, or not applicable.", affects: ["FINAL_SUBMISSION"], role: "Estimator" };
  return { priority: "SCOPE_OR_QUANTITY", what: issue.cause, why: "Missing scope or geometry prevents a supported quantity and cost.", input: scopeResolution(code, issue), affects: ["QUANTITY", "COST", "FINAL_SUBMISSION"], role: "Estimator / structural drawings" };
}

function scopeResolution(code: string, issue: ProjectPricingIssue): string {
  if (code === "HSS_LENGTH_UNRESOLVED") return "Supply drawing-derived lengths and verified weights for C2 and C3 columns.";
  if (code === "CONNECTION_GEOMETRY_UNRESOLVED") return `Supply verified dimensions or a management-approved allowance for ${issue.assemblyIds?.join(", ") || "the connection plates"}.`;
  return "Resolve the referenced takeoff scope with drawing-supported quantities.";
}

function laborEquipmentResolution(code: string): string {
  if (code === "FREIGHT_LOAD_COUNT_REQUIRED") return "Provide an explicit or approved calculated freight load count.";
  if (code.startsWith("EQUIPMENT_")) return "Select required equipment and provide its approved duration or quantity basis.";
  return "Provide erection classification, independent estimated hours, and the erection-hour methodology source.";
}

function categoryForIssue(issue: ProjectPricingIssue): ProjectLayerCostCategory[] {
  if (issue.code.startsWith("FREIGHT_")) return ["FREIGHT"];
  if (issue.code.startsWith("EQUIPMENT_")) return ["EQUIPMENT"];
  if (issue.code.startsWith("ERECTION_")) return ["ERECTION_LABOR"];
  if (issue.code.includes("TAX_")) return ["TAX"];
  return [];
}

function actionId(issue: ProjectPricingIssue, priority: ReviewActionPriority): string {
  const qualifier = issue.code === "CONNECTION_GEOMETRY_UNRESOLVED" && issue.assemblyIds?.length
    ? issue.assemblyIds.join("-")
    : issue.cause;
  return `${priority}:${issue.code}:${slug(qualifier)}`;
}

function priorityRank(priority: ReviewActionPriority): number {
  return ["SCOPE_OR_QUANTITY", "SUPPLIER_QUOTE", "MISSING_RATE", "LABOR_OR_EQUIPMENT_INPUT", "MANAGEMENT_POLICY", "NONBLOCKING_REVIEW"].indexOf(priority) + 1;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}
