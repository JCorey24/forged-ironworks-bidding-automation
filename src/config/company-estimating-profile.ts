import { CATEGORY_SCOPE_OVERRIDES } from "./scope-overrides";
import {
  FORGED_IRONWORKS_RATE_SOURCE,
  type ForgedIronworksRateKey,
} from "../rates/forged-ironworks-rates";
import type { RateSource } from "../rates/rate-source";
import type { AssemblyApprovalPolicy } from "../assemblies/assembly-approval";

export type ApprovalStatus = "APPROVED" | "PENDING_CONFIRMATION";

export interface CompanyDefault<T> {
  value: T;
  approval: ApprovalStatus;
  source: string;
}

export interface CompanyEstimatingProfile {
  id: string;
  rateSource: RateSource<ForgedIronworksRateKey>;
  labor: {
    shopRate: ForgedIronworksRateKey;
    erectionRateByDistance: Readonly<Record<"LOCAL" | "REGIONAL" | "TRAVEL", ForgedIronworksRateKey>>;
    shopHoursPerTon: CompanyDefault<number>;
  };
  markup: {
    standardMultiplier: ForgedIronworksRateKey;
    joistAndDeckRate: ForgedIronworksRateKey;
  };
  production: {
    columnsPerDay: CompanyDefault<number>;
    beamsPerDay: CompanyDefault<number>;
    joistsPerDay: CompanyDefault<number>;
    perimeterAngleFeetPerHour: CompanyDefault<number>;
    metalDeckSquaresPerDay: CompanyDefault<number>;
    craneHoursDivisor: CompanyDefault<number>;
    paintingPoundsPerHour: CompanyDefault<number | null>;
  };
  waste: {
    passMaximum: CompanyDefault<number>;
    hardFailAbove: CompanyDefault<number>;
  };
  freight: {
    outboundRate: ForgedIronworksRateKey;
    defaultLoadCount: CompanyDefault<number>;
  };
  scope: {
    categoryOverrides: typeof CATEGORY_SCOPE_OVERRIDES;
  };
  validation: {
    missingRateBlocksPricing: true;
    quoteRequiredBlocksPricing: true;
    unexplainedZeroBlocksSubmission: true;
  };
  assemblyApprovalPolicy: AssemblyApprovalPolicy;
}

const RATES_SOURCE = "reference/rates.md";
const RULES_SOURCE = "reference/scope-rules.md";

export const FORGED_IRONWORKS_ESTIMATING_PROFILE: CompanyEstimatingProfile = {
  id: "forged-ironworks-estimating-v1",
  rateSource: FORGED_IRONWORKS_RATE_SOURCE,
  labor: {
    shopRate: "LABOR_SHOP",
    erectionRateByDistance: {
      LOCAL: "LABOR_ERECTION_LOCAL",
      REGIONAL: "LABOR_ERECTION_REGIONAL",
      TRAVEL: "LABOR_ERECTION_TRAVEL",
    },
    shopHoursPerTon: {
      value: 10,
      approval: "APPROVED",
      source: RATES_SOURCE,
    },
  },
  markup: {
    standardMultiplier: "MARKUP_STANDARD",
    joistAndDeckRate: "MARKUP_JOIST_DECK",
  },
  production: {
    columnsPerDay: approved(9),
    beamsPerDay: approved(9),
    joistsPerDay: approved(192),
    perimeterAngleFeetPerHour: approved(38.4),
    metalDeckSquaresPerDay: approved(45),
    craneHoursDivisor: approved(9.75),
    paintingPoundsPerHour: {
      value: null,
      approval: "PENDING_CONFIRMATION",
      source: RATES_SOURCE,
    },
  },
  waste: {
    passMaximum: {
      value: 0.2,
      approval: "PENDING_CONFIRMATION",
      source: RULES_SOURCE,
    },
    hardFailAbove: {
      value: 0.3,
      approval: "PENDING_CONFIRMATION",
      source: RULES_SOURCE,
    },
  },
  freight: {
    outboundRate: "FREIGHT_OUTBOUND",
    defaultLoadCount: {
      value: 1,
      approval: "PENDING_CONFIRMATION",
      source: RATES_SOURCE,
    },
  },
  scope: {
    categoryOverrides: CATEGORY_SCOPE_OVERRIDES,
  },
  validation: {
    missingRateBlocksPricing: true,
    quoteRequiredBlocksPricing: true,
    unexplainedZeroBlocksSubmission: true,
  },
  assemblyApprovalPolicy: {
    id: "forged-ironworks-assembly-approval-v1",
    version: 1,
    rules: {
      HSS_COLUMN_BASE: pendingRule("HSS_COLUMN_BASE", "AUTO_APPLY", "BLOCKED"),
      HSS_COLUMN_TOP: pendingRule("HSS_COLUMN_TOP", "AUTO_APPLY", "BLOCKED"),
      WF_BEAM_END: pendingRule("WF_BEAM_END", "AUTO_APPLY", "REVIEW_REQUIRED"),
      JOIST_BEARING_PLATE: pendingRule("JOIST_BEARING_PLATE", "BLOCKED", "BLOCKED"),
      WOOD_NAILER_HARDWARE: pendingRule("WOOD_NAILER_HARDWARE", "BLOCKED", "BLOCKED"),
      PERIMETER_ANGLE_ANCHOR: pendingRule("PERIMETER_ANGLE_ANCHOR", "AUTO_APPLY", "BLOCKED"),
      BRIDGING_TERMINATION: pendingRule("BRIDGING_TERMINATION", "BLOCKED", "BLOCKED"),
    },
  },
};

function approved(value: number): CompanyDefault<number> {
  return { value, approval: "APPROVED", source: RATES_SOURCE };
}

function pendingRule(
  assemblyId: keyof AssemblyApprovalPolicy["rules"],
  completeInputOutcome: "AUTO_APPLY" | "REVIEW_REQUIRED" | "BLOCKED",
  incompleteInputOutcome: "REVIEW_REQUIRED" | "BLOCKED",
): AssemblyApprovalPolicy["rules"][typeof assemblyId] {
  return {
    assemblyId,
    assemblyVersion: 1,
    managementApproval: "PENDING",
    completeInputOutcome,
    incompleteInputOutcome,
  };
}
