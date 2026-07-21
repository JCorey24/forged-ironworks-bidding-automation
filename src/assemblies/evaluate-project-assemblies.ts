import { FORGED_IRONWORKS_ESTIMATING_PROFILE } from "../config/company-estimating-profile";
import { requireStandardRate } from "../rates/rate-source";
import type {
  AssemblyApprovalPolicy,
  GroupedAssemblyException,
  ProjectAssemblyReadiness,
} from "./assembly-approval";
import type {
  AssemblyApplication,
  AssemblyException,
  AssemblyMemberInput,
} from "./assembly-types";
import { resolveStandardAssemblies } from "./resolve-standard-assemblies";

export interface ProjectAssemblyEvaluation {
  applications: AssemblyApplication[];
  exceptions: GroupedAssemblyException[];
  readiness: ProjectAssemblyReadiness;
}

export function evaluateProjectAssemblies(
  inputs: readonly AssemblyMemberInput[],
  policy: AssemblyApprovalPolicy =
    FORGED_IRONWORKS_ESTIMATING_PROFILE.assemblyApprovalPolicy,
): ProjectAssemblyEvaluation {
  const selectionExceptions: AssemblyException[] = [];
  const applications: AssemblyApplication[] = [];

  for (const input of inputs) {
    const resolution = resolveStandardAssemblies(input);
    selectionExceptions.push(
      ...resolution.exceptions.filter(
        (exception) => exception.assemblyId === "STANDARD_ASSEMBLY_SELECTION",
      ),
    );
    applications.push(
      ...resolution.applications.map((application) =>
        applyApprovalPolicy(application, policy),
      ),
    );
  }

  const exceptions = groupAssemblyExceptions([
    ...selectionExceptions,
    ...applications.flatMap((application) =>
      application.exception ? [application.exception] : [],
    ),
  ]);
  const hasBlocker = exceptions.some((item) => item.severity === "BLOCKER");
  const hasReview = exceptions.some((item) => item.severity === "REVIEW");
  const hasNonFinalAllowance = applications.some(
    (item) => item.allowance && !item.allowance.mayAppearInFinalProposal,
  );

  return {
    applications,
    exceptions,
    readiness: {
      draftPricingAllowed: true,
      readyToPrice: !hasBlocker,
      readyToSubmit: !hasBlocker && !hasReview && !hasNonFinalAllowance,
    },
  };
}

export function groupAssemblyExceptions(
  exceptions: readonly AssemblyException[],
): GroupedAssemblyException[] {
  const groups = new Map<string, GroupedAssemblyException>();

  for (const exception of exceptions) {
    const key = [
      exception.assemblyId,
      exception.severity,
      exception.code,
      exception.cause,
    ].join("|");
    const existing = groups.get(key);

    if (existing) {
      existing.quantity += 1;
      existing.lineItemIds.push(exception.lineItemId);
      existing.message = `${exception.cause} (${existing.quantity} occurrences)`;
      continue;
    }

    groups.set(key, {
      assemblyId: exception.assemblyId,
      severity: exception.severity,
      code: exception.code,
      cause: exception.cause,
      quantity: 1,
      lineItemIds: [exception.lineItemId],
      message: `${exception.cause} (1 occurrence)`,
    });
  }

  return [...groups.values()];
}

function applyApprovalPolicy(
  application: AssemblyApplication,
  policy: AssemblyApprovalPolicy,
): AssemblyApplication {
  const rule = policy.rules[application.assemblyId];
  const hasQuoteRequiredComponent = application.components.some(
    (component) => component.quoteRequired,
  );

  if (hasQuoteRequiredComponent) {
    return { ...application, outcome: "BLOCKED" };
  }

  if (!application.exception) {
    return { ...application, outcome: rule.completeInputOutcome };
  }

  const allowance = rule.allowance;
  if (
    allowance &&
    rule.managementApproval === "APPROVED" &&
    application.exception.cause.includes(allowance.coversCause)
  ) {
    const thresholdExceeded = allowanceExceedsReviewThreshold(allowance);

    return {
      ...application,
      outcome: thresholdExceeded ? "REVIEW_REQUIRED" : "APPLY_ALLOWANCE",
      allowance,
      exception: thresholdExceeded
        ? {
            assemblyId: application.assemblyId,
            lineItemId: application.lineItemId,
            severity: "REVIEW",
            code: "ALLOWANCE_REVIEW_THRESHOLD",
            cause: "approved allowance exceeds its review threshold",
            message: `${application.assemblyId}: approved allowance exceeds its review threshold.`,
          }
        : undefined,
    };
  }

  const outcome = application.exception.severity === "BLOCKER"
    ? "BLOCKED"
    : rule.incompleteInputOutcome;
  return { ...application, outcome };
}

function allowanceExceedsReviewThreshold(
  allowance: NonNullable<AssemblyApprovalPolicy["rules"][keyof AssemblyApprovalPolicy["rules"]]["allowance"]>,
): boolean {
  if (allowance.reviewThreshold.type === "QUANTITY_ABOVE") {
    return allowance.quantityBasis.quantity > allowance.reviewThreshold.value;
  }

  const extendedCost = allowance.pricingBasis.type === "FIXED_AMOUNT"
    ? allowance.pricingBasis.amount * allowance.quantityBasis.quantity
    : requireStandardRate(
        FORGED_IRONWORKS_ESTIMATING_PROFILE.rateSource,
        allowance.pricingBasis.rateKey,
      ).amount *
      allowance.pricingBasis.unitsPerQuantity *
      allowance.quantityBasis.quantity;

  return extendedCost > allowance.reviewThreshold.value;
}
