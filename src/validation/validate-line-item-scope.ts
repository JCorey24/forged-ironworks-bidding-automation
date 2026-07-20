import type { TakeoffLine } from "../models/takeoff-line";
import type { ValidationIssue } from "../models/validation";

export function validateLineItemScope(
  line: TakeoffLine,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const scope = line.scope;

  const unresolvedFields: Array<[string, string]> = [
    ["furnish", scope.furnish],
    ["fabricate", scope.fabricate],
    ["erect", scope.erect],
    ["finish", scope.finish],
    ["providedBy", scope.providedBy],
    ["installedBy", scope.installedBy],
    ["taxTreatment", scope.taxTreatment],
  ];

  for (const [field, value] of unresolvedFields) {
    if (value === "TBD") {
      issues.push({
        code: "SCOPE_UNRESOLVED",
        severity: "FAIL",
        lineItemId: line.id,
        message: `${line.description}: ${field} is unresolved.`,
      });
    }
  }

  if (scope.furnish === "NO" && scope.fabricate === "YES") {
    issues.push({
      code: "INVALID_SCOPE_COMBINATION",
      severity: "FAIL",
      lineItemId: line.id,
      message:
        `${line.description}: fabricate is YES while furnish is NO. ` +
        "Document customer-supplied fabrication explicitly before proceeding.",
    });
  }

  if (scope.erect === "YES" && scope.installedBy !== "FIW") {
    issues.push({
      code: "INSTALL_RESPONSIBILITY_CONFLICT",
      severity: "FAIL",
      lineItemId: line.id,
      message:
        `${line.description}: erect is YES, but installedBy is ` +
        `${scope.installedBy}.`,
    });
  }

  if (scope.erect === "NO" && scope.installedBy === "FIW") {
    issues.push({
      code: "INSTALL_RESPONSIBILITY_CONFLICT",
      severity: "FAIL",
      lineItemId: line.id,
      message:
        `${line.description}: erect is NO, but installedBy is FIW.`,
    });
  }

  if (
    scope.resolutionStatus !== "RESOLVED" &&
    scope.resolutionStatus !== "EXCLUDED"
  ) {
    issues.push({
      code: "SCOPE_NOT_RESOLVED",
      severity: "FAIL",
      lineItemId: line.id,
      message:
        `${line.description}: resolution status is ` +
        `${scope.resolutionStatus}.`,
    });
  }

  if (!scope.scopeSource.trim()) {
    issues.push({
      code: "SCOPE_SOURCE_MISSING",
      severity: "FAIL",
      lineItemId: line.id,
      message: `${line.description}: scopeSource is blank.`,
    });
  }

  return issues;
}
