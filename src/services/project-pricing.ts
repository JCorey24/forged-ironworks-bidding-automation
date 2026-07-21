import type { GroupedAssemblyException } from "../assemblies/assembly-approval";
import { groupAssemblyExceptions } from "../assemblies/evaluate-project-assemblies";
import type {
  AssemblyApplication,
  AssemblyException,
  EstimatingAllowance,
} from "../assemblies/assembly-types";
import type { TakeoffLine } from "../models/takeoff-line";
import type { ForgedIronworksRateKey } from "../rates/forged-ironworks-rates";
import type { RateSource, StandardRate } from "../rates/rate-source";
import { requireStandardRate } from "../rates/rate-source";
import { validateProjectScope } from "../validation/validate-project-scope";

export type ProjectCostCategory = "MATERIAL" | "HARDWARE" | "ALLOWANCE";

export interface ProjectPricedLine {
  id: string;
  costCategory: ProjectCostCategory;
  description: string;
  takeoffRecordId: string;
  assemblyInstance?: {
    assemblyId: AssemblyApplication["assemblyId"];
    version: number;
    componentId: string;
  };
  rateKey: ForgedIronworksRateKey;
  rateSource: string;
  quantity: number;
  unit: "LB" | "EA";
  rateAmount: number;
  calculationMethod: "WEIGHT_TIMES_RATE" | "QUANTITY_TIMES_RATE";
  extendedCost: number;
}

export interface ProjectAllowanceLine {
  id: string;
  takeoffRecordId: string;
  assemblyId: AssemblyApplication["assemblyId"];
  assemblyVersion: number;
  allowance: EstimatingAllowance;
  extendedCost: number;
  calculationMethod: "APPROVED_FIXED_ALLOWANCE" | "APPROVED_RATE_ALLOWANCE";
}

export interface ProjectUnpricedLine {
  takeoffRecordId: string;
  description: string;
  reasonCode: string;
  reason: string;
  rateKey?: ForgedIronworksRateKey;
}

export interface ProjectQuoteRequiredLine extends ProjectUnpricedLine {
  rateKey: ForgedIronworksRateKey;
}

export interface ProjectPricingIssue {
  severity: "REVIEW" | "BLOCKER";
  code: string;
  cause: string;
  quantity: number;
  takeoffRecordIds: string[];
  message: string;
}

export interface ProjectPricingReadiness {
  status: "DRAFT" | "READY_TO_PRICE" | "READY_TO_SUBMIT";
  draftPricingAllowed: true;
  readyToPrice: boolean;
  readyToSubmit: boolean;
}

export interface ProjectPricingResult {
  pricedMaterialLines: ProjectPricedLine[];
  pricedHardwareLines: ProjectPricedLine[];
  quoteRequiredLines: ProjectQuoteRequiredLine[];
  allowanceLines: ProjectAllowanceLine[];
  unresolvedLines: ProjectUnpricedLine[];
  groupedReviewItems: ProjectPricingIssue[];
  groupedBlockers: ProjectPricingIssue[];
  subtotalByCostCategory: Record<ProjectCostCategory, number>;
  readiness: ProjectPricingReadiness;
}

export interface ProjectPricingInput {
  takeoffLines: readonly TakeoffLine[];
  assemblyApplications?: readonly AssemblyApplication[];
  assemblyExceptions?: readonly AssemblyException[];
  requiredQuoteRateKeys?: readonly ForgedIronworksRateKey[];
}

export function priceProject(
  input: ProjectPricingInput,
  rateSource: RateSource<ForgedIronworksRateKey>,
): ProjectPricingResult {
  const material: ProjectPricedLine[] = [];
  const hardware: ProjectPricedLine[] = [];
  const quotes: ProjectQuoteRequiredLine[] = [];
  const allowances: ProjectAllowanceLine[] = [];
  const unresolved: ProjectUnpricedLine[] = [];
  const issues: ProjectPricingIssue[] = [];
  const pricedAssemblyComponents = new Set<string>();
  const pricedTakeoffRates = new Set<string>();
  const validation = validateProjectScope(input.takeoffLines);
  const invalidTakeoffIds = new Set(
    validation.issues
      .filter((issue) => issue.severity === "FAIL")
      .map((issue) => issue.lineItemId),
  );
  for (const issue of validation.issues) {
    addIssue(
      issues,
      issue.severity === "FAIL" ? "BLOCKER" : "REVIEW",
      issue.code,
      issue.message,
      issue.lineItemId,
    );
  }
  const authoritativeAggregateCategories = new Set(
    input.takeoffLines
      .filter((line) => line.source.category === "VERIFIED_PROJECT_AGGREGATE")
      .map((line) => line.category),
  );

  for (const line of input.takeoffLines) {
    if (invalidTakeoffIds.has(line.id)) {
      unresolved.push({
        takeoffRecordId: line.id,
        description: line.description,
        reasonCode: "TAKEOFF_VALIDATION_FAILED",
        reason: "Takeoff validation failed; this line was not priced.",
      });
      continue;
    }
    if (
      authoritativeAggregateCategories.has(line.category) &&
      line.source.category !== "VERIFIED_PROJECT_AGGREGATE"
    ) {
      addUnresolved(unresolved, issues, line, "DUPLICATE_OF_VERIFIED_AGGREGATE", "An authoritative verified aggregate already covers this category.");
      continue;
    }

    const mapping = directRateMapping(line);
    if (mapping) {
      if (line.category === "HSS_COLUMN" && (!validPositive(line.lengthFt) || !validPositive(line.weightLb))) {
        addUnresolved(unresolved, issues, line, "HSS_LENGTH_UNRESOLVED", "HSS material requires a valid drawing-derived length and weight.");
        continue;
      }
      if (!validPositive(line.weightLb) && mapping.unit === "LB") {
        addUnresolved(unresolved, issues, line, "MISSING_VERIFIED_WEIGHT", "A positive verified or calculated weight is required.");
        continue;
      }
      const quantity = mapping.unit === "LB" ? line.weightLb! : line.quantity;
      const priced = makePricedLine(line, mapping.rateKey, quantity, mapping.unit, mapping.costCategory, rateSource);
      pricedTakeoffRates.add(`${line.id}|${mapping.rateKey}`);
      (mapping.costCategory === "MATERIAL" ? material : hardware).push(priced);
      continue;
    }

    const quoteKey = quoteRateKey(line);
    if (quoteKey) {
      quotes.push({ takeoffRecordId: line.id, description: line.description, reasonCode: "SUPPLIER_QUOTE_REQUIRED", reason: `Supplier quote required for ${quoteKey}.`, rateKey: quoteKey });
      addIssue(issues, "BLOCKER", "SUPPLIER_QUOTE_REQUIRED", quoteKey, line.id);
      continue;
    }

    const unsupported = unsupportedReason(line);
    if (unsupported) {
      addUnresolved(unresolved, issues, line, unsupported.code, unsupported.reason, unsupported.rateKey);
    }
  }

  for (const application of input.assemblyApplications ?? []) {
    const takeoff = input.takeoffLines.find((line) => line.id === application.lineItemId);
    if (!takeoff || !["AUTO_APPLY", "APPLY_ALLOWANCE"].includes(application.outcome)) continue;

    if (application.allowance) {
      allowances.push(priceAllowance(application, application.allowance, rateSource));
    }
    for (const component of application.components) {
      const identity = `${application.lineItemId}|${application.assemblyId}|${application.assemblyVersion}|${component.id}`;
      if (pricedAssemblyComponents.has(identity)) continue;
      pricedAssemblyComponents.add(identity);
      if (!validPositive(component.quantity) || component.quoteRequired) continue;
      if (pricedTakeoffRates.has(`${takeoff.id}|${component.rateKey}`)) continue;
      const costCategory = component.rateKey.startsWith("MATERIAL_") ? "MATERIAL" : "HARDWARE";
      const priced = makePricedLine(takeoff, component.rateKey, component.quantity, component.unit, costCategory, rateSource, application, component.id);
      pricedTakeoffRates.add(`${takeoff.id}|${component.rateKey}`);
      (costCategory === "MATERIAL" ? material : hardware).push(priced);
    }
  }

  for (const exception of groupAssemblyExceptions(input.assemblyExceptions ?? [])) {
    issues.push(fromAssemblyException(exception));
  }
  for (const rateKey of input.requiredQuoteRateKeys ?? []) {
    if (!quotes.some((line) => line.rateKey === rateKey)) {
      addIssue(issues, "BLOCKER", "SUPPLIER_QUOTE_REQUIRED", rateKey, `quote:${rateKey}`);
    }
  }
  for (const line of input.takeoffLines.filter((item) => item.reviewRequired)) {
    addIssue(issues, "REVIEW", "TAKEOFF_REVIEW_REQUIRED", line.reviewReason ?? "Takeoff record requires estimator review.", line.id);
  }

  const grouped = groupIssues(issues);
  const groupedBlockers = grouped.filter((item) => item.severity === "BLOCKER");
  const groupedReviewItems = grouped.filter((item) => item.severity === "REVIEW");
  const subtotalByCostCategory = {
    MATERIAL: sumCost(material),
    HARDWARE: sumCost(hardware),
    ALLOWANCE: roundCurrency(allowances.reduce((sum, line) => sum + line.extendedCost, 0)),
  };
  const readyToPrice = groupedBlockers.length === 0;
  const readyToSubmit = readyToPrice && groupedReviewItems.length === 0;

  return {
    pricedMaterialLines: material,
    pricedHardwareLines: hardware,
    quoteRequiredLines: quotes,
    allowanceLines: allowances,
    unresolvedLines: unresolved,
    groupedReviewItems,
    groupedBlockers,
    subtotalByCostCategory,
    readiness: {
      status: readyToSubmit ? "READY_TO_SUBMIT" : readyToPrice ? "READY_TO_PRICE" : "DRAFT",
      draftPricingAllowed: true,
      readyToPrice,
      readyToSubmit,
    },
  };
}

function directRateMapping(line: TakeoffLine): { rateKey: ForgedIronworksRateKey; unit: "LB" | "EA"; costCategory: "MATERIAL" | "HARDWARE" } | undefined {
  if (line.category === "WF_BEAM") return { rateKey: "MATERIAL_WF_BEAM", unit: "LB", costCategory: "MATERIAL" };
  if (line.category === "HSS_COLUMN") return { rateKey: "MATERIAL_HSS", unit: "LB", costCategory: "MATERIAL" };
  if (["PERIMETER_ANGLE", "LOOSE_LINTEL", "BRIDGING_TERMINATION"].includes(line.category) && validPositive(line.weightLb)) return { rateKey: "MATERIAL_ANGLE", unit: "LB", costCategory: "MATERIAL" };
  if (line.category === "PLATE") return { rateKey: "MATERIAL_BURNED_PLATE", unit: "LB", costCategory: "MATERIAL" };
  if (line.memberMark === "HEADED_STUD") return { rateKey: "HARDWARE_SHEAR_STUD", unit: "EA", costCategory: "HARDWARE" };
  if (line.memberMark === "EPOXY_ANCHOR" && line.section === "EPOXY_ANCHOR") return { rateKey: "HARDWARE_EPOXY_ANCHOR", unit: "EA", costCategory: "HARDWARE" };
}

function quoteRateKey(line: TakeoffLine): ForgedIronworksRateKey | undefined {
  if (line.memberMark === "LH_JOISTS") return "STRUCTURAL_LH_JOIST";
  if (line.memberMark === "METAL_DECK") return "STRUCTURAL_METAL_DECK";
}

function unsupportedReason(line: TakeoffLine): { code: string; reason: string; rateKey?: ForgedIronworksRateKey } | undefined {
  if (["LEVELING_PLATE", "SHEAR_PLATE", "CAP_PLATE"].includes(line.category)) return { code: "CONNECTION_GEOMETRY_UNRESOLVED", reason: "Connection plate geometry is unresolved; no weight or allowance may be invented." };
  if (["WOOD_NAILER_BOLT", "WOOD_NAILER_WASHER"].includes(line.memberMark)) return { code: "APPROVED_RATE_REQUIRED", reason: "Wood-nailer hardware has no approved standard rate.", rateKey: line.memberMark === "WOOD_NAILER_BOLT" ? "HARDWARE_WOOD_NAILER" : "HARDWARE_WOOD_NAILER_WASHER" };
  if (line.memberMark === "BRIDGING_TERMINATION") return { code: "APPROVED_RATE_REQUIRED", reason: "Bridging hardware has no approved standard rate.", rateKey: "HARDWARE_BRIDGING_TERMINATION" };
  if (line.memberMark === "ANCHOR_ROD") return { code: "HARDWARE_SPECIFICATION_NOT_APPROVED", reason: "The company anchor-bolt rate is not documented as applicable to this actual specification.", rateKey: "HARDWARE_ANCHOR_ROD" };
  if (line.category === "HARDWARE") return { code: "UNSUPPORTED_HARDWARE_RATE", reason: "No approved pricing mapping exists for this hardware specification." };
}

function makePricedLine(line: TakeoffLine, rateKey: ForgedIronworksRateKey, quantity: number, unit: "LB" | "EA", costCategory: "MATERIAL" | "HARDWARE", source: RateSource<ForgedIronworksRateKey>, application?: AssemblyApplication, componentId?: string): ProjectPricedLine {
  const rate = requireStandardRate(source, rateKey);
  assertCompatibleRate(rate, unit, rateKey);
  const extendedCost = roundCurrency(quantity * rate.amount);
  if (!validPositive(extendedCost)) throw new Error(`Pricing blocked: ${rateKey} produced a zero or invalid cost.`);
  return {
    id: application ? `${line.id}:${application.assemblyId}:v${application.assemblyVersion}:${componentId}` : `${line.id}:${rateKey}`,
    costCategory,
    description: line.description,
    takeoffRecordId: line.id,
    assemblyInstance: application ? { assemblyId: application.assemblyId, version: application.assemblyVersion, componentId: componentId! } : undefined,
    rateKey,
    rateSource: `${source.id}:${rate.source}`,
    quantity,
    unit,
    rateAmount: rate.amount,
    calculationMethod: unit === "LB" ? "WEIGHT_TIMES_RATE" : "QUANTITY_TIMES_RATE",
    extendedCost,
  };
}

function priceAllowance(application: AssemblyApplication, allowance: EstimatingAllowance, source: RateSource<ForgedIronworksRateKey>): ProjectAllowanceLine {
  const basis = allowance.pricingBasis;
  const extendedCost = basis.type === "FIXED_AMOUNT"
    ? basis.amount
    : allowance.quantityBasis.quantity * basis.unitsPerQuantity * requireStandardRate(source, basis.rateKey).amount;
  if (!validPositive(extendedCost)) throw new Error(`Pricing blocked: allowance ${allowance.id} produced a zero or invalid cost.`);
  return { id: allowance.id, takeoffRecordId: application.lineItemId, assemblyId: application.assemblyId, assemblyVersion: application.assemblyVersion, allowance, extendedCost: roundCurrency(extendedCost), calculationMethod: basis.type === "FIXED_AMOUNT" ? "APPROVED_FIXED_ALLOWANCE" : "APPROVED_RATE_ALLOWANCE" };
}

function assertCompatibleRate(rate: StandardRate, unit: "LB" | "EA", key: string): void {
  const expected = unit === "LB" ? "PER_LB" : "PER_EACH";
  if (rate.unit !== expected) throw new TypeError(`${key} must use ${expected}, received ${rate.unit}.`);
}

function addUnresolved(lines: ProjectUnpricedLine[], issues: ProjectPricingIssue[], line: TakeoffLine, code: string, reason: string, rateKey?: ForgedIronworksRateKey): void {
  lines.push({ takeoffRecordId: line.id, description: line.description, reasonCode: code, reason, rateKey });
  addIssue(issues, "BLOCKER", code, reason, line.id);
}

function addIssue(issues: ProjectPricingIssue[], severity: "REVIEW" | "BLOCKER", code: string, cause: string, id: string): void {
  issues.push({ severity, code, cause, quantity: 1, takeoffRecordIds: [id], message: cause });
}

function fromAssemblyException(exception: GroupedAssemblyException): ProjectPricingIssue {
  return { severity: exception.severity, code: exception.code, cause: exception.cause, quantity: exception.quantity, takeoffRecordIds: exception.lineItemIds, message: exception.message };
}

function groupIssues(issues: readonly ProjectPricingIssue[]): ProjectPricingIssue[] {
  const grouped = new Map<string, ProjectPricingIssue>();
  for (const issue of issues) {
    const key = `${issue.severity}|${issue.code}|${issue.cause}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += issue.quantity;
      existing.takeoffRecordIds.push(...issue.takeoffRecordIds);
      existing.message = `${issue.cause} (${existing.quantity} occurrences)`;
    } else grouped.set(key, { ...issue, takeoffRecordIds: [...issue.takeoffRecordIds], message: `${issue.cause} (${issue.quantity} occurrence${issue.quantity === 1 ? "" : "s"})` });
  }
  return [...grouped.values()];
}

function validPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function sumCost(lines: readonly ProjectPricedLine[]): number {
  return roundCurrency(lines.reduce((sum, line) => sum + line.extendedCost, 0));
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
