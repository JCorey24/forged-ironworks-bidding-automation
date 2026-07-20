import type {
  LineItemScope,
  ProjectScopeDefault,
} from "../models/scope";
import { CATEGORY_SCOPE_OVERRIDES } from "../config/scope-overrides";

export function createDefaultLineItemScope(
  projectScope: ProjectScopeDefault,
): LineItemScope {
  switch (projectScope) {
    case "FURNISH_AND_ERECT":
      return {
        furnish: "YES",
        fabricate: "YES",
        erect: "YES",
        finish: "TBD",
        providedBy: "FIW",
        installedBy: "FIW",
        taxTreatment: "TBD",
        resolutionStatus: "ESTIMATOR_REVIEW",
        scopeSource: "Project scope default",
      };

    case "ERECT_ONLY":
      return {
        furnish: "NO",
        fabricate: "NO",
        erect: "YES",
        finish: "NONE",
        providedBy: "GC",
        installedBy: "FIW",
        taxTreatment: "NON_TAXABLE",
        resolutionStatus: "ESTIMATOR_REVIEW",
        scopeSource: "Project scope default",
      };

    case "MIXED_SCOPE":
    case "TBD":
      return {
        furnish: "TBD",
        fabricate: "TBD",
        erect: "TBD",
        finish: "TBD",
        providedBy: "TBD",
        installedBy: "TBD",
        taxTreatment: "TBD",
        resolutionStatus: "ESTIMATOR_REVIEW",
        scopeSource: "No safe project-level default",
      };

    default: {
      const exhaustiveCheck: never = projectScope;
      throw new Error(`Unsupported project scope: ${String(exhaustiveCheck)}`);
    }
  }
}

/**
 * Resolution priority:
 * 1. Project-level default
 * 2. Standard category override
 * 3. Estimator/project-specific explicit scope
 *
 * The explicit scope always wins.
 */
export function resolveLineItemScope(
  projectScope: ProjectScopeDefault,
  category: string,
  explicitScope?: Partial<LineItemScope>,
): LineItemScope {
  const projectDefault = createDefaultLineItemScope(projectScope);
  const categoryOverride = CATEGORY_SCOPE_OVERRIDES[category] ?? {};

  return {
    ...projectDefault,
    ...categoryOverride,
    ...explicitScope,
  };
}
