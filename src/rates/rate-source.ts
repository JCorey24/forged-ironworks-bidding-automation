export type RateStatus = "STANDARD" | "QUOTE_REQUIRED";

export type RateUnit =
  | "PER_LB"
  | "PER_EACH"
  | "PER_HOUR"
  | "PER_TON"
  | "PER_LOAD"
  | "PER_WEEK"
  | "PER_DAY"
  | "PER_DAY_PER_FLOOR"
  | "PER_DAY_PER_FOOT"
  | "PER_LINEAR_FOOT"
  | "PERCENT"
  | "MULTIPLIER";

export interface StandardRate {
  status: "STANDARD";
  amount: number;
  unit: RateUnit;
  source: string;
  notes?: string;
}

export interface QuoteRequiredRate {
  status: "QUOTE_REQUIRED";
  unit?: RateUnit;
  source: string;
  notes: string;
}

export type RateDefinition = StandardRate | QuoteRequiredRate;

export interface RateSource<RateKey extends string = string> {
  readonly id: string;
  get(key: RateKey): RateDefinition | undefined;
}

export class MissingRateError extends Error {
  constructor(rateKey: string) {
    super(`Pricing blocked: required rate "${rateKey}" is missing.`);
    this.name = "MissingRateError";
  }
}

export class QuoteRequiredError extends Error {
  constructor(rateKey: string) {
    super(`Pricing blocked: "${rateKey}" requires a supplier quote.`);
    this.name = "QuoteRequiredError";
  }
}

export function requireStandardRate<RateKey extends string>(
  source: RateSource<RateKey>,
  key: RateKey,
): StandardRate {
  const rate = source.get(key);

  if (!rate) {
    throw new MissingRateError(key);
  }

  if (rate.status === "QUOTE_REQUIRED") {
    throw new QuoteRequiredError(key);
  }

  if (!Number.isFinite(rate.amount) || rate.amount <= 0) {
    throw new MissingRateError(key);
  }

  return rate;
}
