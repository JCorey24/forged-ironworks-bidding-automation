import type { TakeoffLine } from "../models/takeoff-line";
import type { ValidationIssue } from "../models/validation";

export function validateTakeoffLine(line: TakeoffLine): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  requireText(issues, line, "memberMark", line.memberMark);
  requireText(issues, line, "section", line.section);
  requireText(issues, line, "source.sheet", line.source.sheet);

  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    issues.push({
      code: "TAKEOFF_QUANTITY_INVALID",
      severity: "FAIL",
      lineItemId: line.id,
      message: `${line.description}: quantity must be a finite number greater than zero.`,
    });
  }

  if (
    line.lengthFt !== null &&
    (!Number.isFinite(line.lengthFt) || line.lengthFt <= 0)
  ) {
    issues.push({
      code: "TAKEOFF_LENGTH_INVALID",
      severity: "FAIL",
      lineItemId: line.id,
      message: `${line.description}: lengthFt must be null or a finite number greater than zero.`,
    });
  }

  if (line.confidence === "LOW" && !line.reviewRequired) {
    issues.push({
      code: "LOW_CONFIDENCE_REVIEW_REQUIRED",
      severity: "FAIL",
      lineItemId: line.id,
      message: `${line.description}: low-confidence takeoff data requires review.`,
    });
  }

  if (line.reviewRequired && !line.reviewReason?.trim()) {
    issues.push({
      code: "REVIEW_REASON_MISSING",
      severity: "FAIL",
      lineItemId: line.id,
      message: `${line.description}: reviewRequired is true but reviewReason is blank.`,
    });
  }

  return issues;
}

function requireText(
  issues: ValidationIssue[],
  line: TakeoffLine,
  field: string,
  value: string,
): void {
  if (!value.trim()) {
    issues.push({
      code: "TAKEOFF_TRACE_MISSING",
      severity: "FAIL",
      lineItemId: line.id,
      message: `${line.description}: ${field} is required for traceability.`,
    });
  }
}
