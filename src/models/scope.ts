export const YES_NO_TBD = ["YES", "NO", "TBD"] as const;
export type YesNoTbd = (typeof YES_NO_TBD)[number];

export const FINISH_TYPES = [
  "NONE",
  "PRIME",
  "PAINT",
  "GALVANIZE",
  "TBD",
] as const;
export type FinishType = (typeof FINISH_TYPES)[number];

export const RESPONSIBLE_PARTIES = [
  "FIW",
  "GC",
  "MASONRY",
  "SUPPLIER",
  "OTHER",
  "TBD",
] as const;
export type ResponsibleParty = (typeof RESPONSIBLE_PARTIES)[number];

export const TAX_TREATMENTS = [
  "TAXABLE",
  "NON_TAXABLE",
  "EXEMPT",
  "TBD",
] as const;
export type TaxTreatment = (typeof TAX_TREATMENTS)[number];

export const RESOLUTION_STATUSES = [
  "RESOLVED",
  "QUOTE_REQUIRED",
  "ESTIMATOR_REVIEW",
  "EXCLUDED",
] as const;
export type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

export const PROJECT_SCOPE_DEFAULTS = [
  "FURNISH_AND_ERECT",
  "ERECT_ONLY",
  "MIXED_SCOPE",
  "TBD",
] as const;
export type ProjectScopeDefault = (typeof PROJECT_SCOPE_DEFAULTS)[number];

export interface LineItemScope {
  furnish: YesNoTbd;
  fabricate: YesNoTbd;
  erect: YesNoTbd;
  finish: FinishType;
  providedBy: ResponsibleParty;
  installedBy: ResponsibleParty;
  taxTreatment: TaxTreatment;
  resolutionStatus: ResolutionStatus;

  /**
   * Human-readable origin of the scope decision.
   * Examples: "Project default", "S-302 detail 4", "Estimator override".
   */
  scopeSource: string;

  /**
   * Optional explanation, assumption, exception, or approval note.
   */
  scopeNotes?: string;
}
