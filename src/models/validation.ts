export type ValidationSeverity = "FAIL" | "WARNING";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  lineItemId: string;
  message: string;
}
