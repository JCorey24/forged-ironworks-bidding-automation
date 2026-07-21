import type {
  AssemblyOutcome,
  EstimatingAllowance,
  StandardAssemblyId,
} from "./assembly-types";

export interface AssemblyApprovalRule {
  assemblyId: StandardAssemblyId;
  assemblyVersion: number;
  managementApproval: "APPROVED" | "PENDING";
  completeInputOutcome: Extract<AssemblyOutcome, "AUTO_APPLY" | "REVIEW_REQUIRED" | "BLOCKED">;
  incompleteInputOutcome: Extract<AssemblyOutcome, "REVIEW_REQUIRED" | "BLOCKED">;
  allowance?: EstimatingAllowance & { coversCause: string };
}

export interface AssemblyApprovalPolicy {
  id: string;
  version: number;
  rules: Readonly<Record<StandardAssemblyId, AssemblyApprovalRule>>;
}

export interface GroupedAssemblyException {
  assemblyId: StandardAssemblyId | "STANDARD_ASSEMBLY_SELECTION";
  severity: "REVIEW" | "BLOCKER";
  code: string;
  cause: string;
  quantity: number;
  lineItemIds: string[];
  message: string;
}

export interface ProjectAssemblyReadiness {
  draftPricingAllowed: boolean;
  readyToPrice: boolean;
  readyToSubmit: boolean;
}
