import type { TakeoffLine } from "../models/takeoff-line";
import type { ValidationIssue } from "../models/validation";
import { validateLineItemScope } from "./validate-line-item-scope";

export interface ProjectScopeValidationResult {
  status: "PASS" | "FAIL";
  issues: ValidationIssue[];
}

export function validateProjectScope(
  lines: readonly TakeoffLine[],
): ProjectScopeValidationResult {
  const issues = lines.flatMap(validateLineItemScope);

  return {
    status: issues.some((issue) => issue.severity === "FAIL")
      ? "FAIL"
      : "PASS",
    issues,
  };
}
