import { CATEGORY_SCOPE_OVERRIDES } from "./scope-overrides";
import {
  FORGED_IRONWORKS_RATE_SOURCE,
  type ForgedIronworksRateKey,
} from "../rates/forged-ironworks-rates";
import type { RateSource } from "../rates/rate-source";

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
};

function approved(value: number): CompanyDefault<number> {
  return { value, approval: "APPROVED", source: RATES_SOURCE };
}
