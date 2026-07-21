import type { ForgedIronworksRateKey } from "../rates/forged-ironworks-rates";

export const STANDARD_ASSEMBLY_IDS = [
  "HSS_COLUMN_BASE",
  "HSS_COLUMN_TOP",
  "WF_BEAM_END",
  "JOIST_BEARING_PLATE",
  "WOOD_NAILER_HARDWARE",
  "PERIMETER_ANGLE_ANCHOR",
  "BRIDGING_TERMINATION",
] as const;

export type StandardAssemblyId = (typeof STANDARD_ASSEMBLY_IDS)[number];
export type AssemblyConfidence = "HIGH" | "MEDIUM" | "LOW";
export type AssemblyMaturity = "PRODUCTION_READY" | "PROVISIONAL";
export type AssemblyOutcome =
  | "AUTO_APPLY"
  | "APPLY_ALLOWANCE"
  | "REVIEW_REQUIRED"
  | "BLOCKED";

export interface StandardAssemblyDefinition {
  id: StandardAssemblyId;
  version: number;
  name: string;
  maturity: AssemblyMaturity;
  applicabilityConditions: readonly string[];
  drawingDerivedComponents: readonly string[];
  companyDefaultComponents: readonly string[];
  rateKeys: readonly ForgedIronworksRateKey[];
  shopLaborCoverage: "GLOBAL_HOURS_PER_TON";
  confidence: AssemblyConfidence;
  reviewTriggers: readonly string[];
  blockingConditions: readonly string[];
}

export interface PlateDimensions {
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
}

export interface AssemblyMemberInput {
  lineItemId: string;
  memberMark: string;
  memberType: "HSS_COLUMN" | "WF_BEAM" | "JOIST" | "PERIMETER_ANGLE";
  section: string;
  lengthFt: number | null;
  condition: "STANDARD" | "NONSTANDARD" | "UNKNOWN";
  globalShopHoursPerTonEnabled: boolean;
  basePlate?: PlateDimensions;
  topPlate?: PlateDimensions;
  anchorRodCount?: number;
  boltsPerBeamEnd?: number;
  joistBearing?: {
    required: boolean;
    count?: number;
    plate?: PlateDimensions;
  };
  woodNailer?: {
    required: boolean;
    fastenerSpacingIn?: number;
  };
  perimeterAnchors?: {
    required: boolean;
    spacingIn?: number;
    specification?: "EPOXY_ANCHOR" | "OTHER" | "UNKNOWN";
    substrateException?: boolean;
    cornerException?: boolean;
    spliceException?: boolean;
    edgeDistanceException?: boolean;
  };
  bridgingTermination?: {
    required: boolean;
    count?: number;
  };
}

export interface AssemblyComponent {
  id: string;
  description: string;
  quantity: number | null;
  unit: "EA" | "LB";
  source: "DRAWING" | "COMPANY_DEFAULT" | "CALCULATED" | "ALLOWANCE";
  rateKey: ForgedIronworksRateKey;
  quoteRequired: boolean;
}

export interface AssemblyException {
  assemblyId: StandardAssemblyId | "STANDARD_ASSEMBLY_SELECTION";
  lineItemId: string;
  severity: "REVIEW" | "BLOCKER";
  code: string;
  cause: string;
  message: string;
}

export interface AssemblyApplication {
  assemblyId: StandardAssemblyId;
  assemblyVersion: number;
  lineItemId: string;
  instanceCount: number;
  outcome: AssemblyOutcome;
  confidence: AssemblyConfidence;
  components: AssemblyComponent[];
  additionalShopHours: number;
  allowance?: EstimatingAllowance;
  exception?: AssemblyException;
}

export interface AllowanceQuantityBasis {
  type: "PER_MEMBER" | "PER_END" | "FIXED_QUANTITY";
  quantity: number;
  description: string;
}

export type AllowancePricingBasis =
  | {
      type: "RATE_KEY";
      rateKey: ForgedIronworksRateKey;
      unitsPerQuantity: number;
    }
  | {
      type: "FIXED_AMOUNT";
      amount: number;
      currency: "USD";
    };

export interface EstimatingAllowance {
  id: string;
  assemblyId: StandardAssemblyId;
  assemblyVersion: number;
  quantityBasis: AllowanceQuantityBasis;
  pricingBasis: AllowancePricingBasis;
  approvalSource: string;
  confidence: AssemblyConfidence;
  reviewThreshold: {
    type: "QUANTITY_ABOVE" | "EXTENDED_COST_ABOVE";
    value: number;
  };
  mayAppearInFinalProposal: boolean;
}

export interface AssemblyResolution {
  applications: AssemblyApplication[];
  exceptions: AssemblyException[];
}
