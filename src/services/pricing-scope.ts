import type { LineItemScope } from "../models/scope";
import type { RateSource } from "../rates/rate-source";
import { requireStandardRate } from "../rates/rate-source";

export class UnresolvedScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnresolvedScopeError";
  }
}

export function calculateMaterialCost(
  weightLb: number,
  ratePerLb: number,
  scope: LineItemScope,
): number {
  assertNonNegativeFinite(weightLb, "weightLb");
  assertNonNegativeFinite(ratePerLb, "ratePerLb");

  if (scope.resolutionStatus === "EXCLUDED") {
    return 0;
  }

  if (scope.furnish === "TBD") {
    throw new UnresolvedScopeError(
      "Material scope unresolved: furnish is TBD.",
    );
  }

  if (scope.furnish === "NO") {
    return 0;
  }

  return roundCurrency(weightLb * ratePerLb);
}

export function calculateMaterialCostFromRates<RateKey extends string>(
  weightLb: number,
  rateKey: RateKey,
  scope: LineItemScope,
  rateSource: RateSource<RateKey>,
): number {
  const rate = requireStandardRate(rateSource, rateKey);

  if (rate.unit !== "PER_LB") {
    throw new TypeError(
      `Material rate "${rateKey}" must use unit PER_LB, received ${rate.unit}.`,
    );
  }

  return calculateMaterialCost(weightLb, rate.amount, scope);
}

export function calculateShopLaborCost(
  shopHours: number,
  laborRate: number,
  scope: LineItemScope,
): number {
  assertNonNegativeFinite(shopHours, "shopHours");
  assertNonNegativeFinite(laborRate, "laborRate");

  if (scope.resolutionStatus === "EXCLUDED") {
    return 0;
  }

  if (scope.fabricate === "TBD") {
    throw new UnresolvedScopeError(
      "Fabrication scope unresolved: fabricate is TBD.",
    );
  }

  if (scope.fabricate === "NO") {
    return 0;
  }

  return roundCurrency(shopHours * laborRate);
}

export function calculateErectionCost(
  erectionManHours: number,
  laborRate: number,
  scope: LineItemScope,
): number {
  assertNonNegativeFinite(erectionManHours, "erectionManHours");
  assertNonNegativeFinite(laborRate, "laborRate");

  if (scope.resolutionStatus === "EXCLUDED") {
    return 0;
  }

  if (scope.erect === "TBD") {
    throw new UnresolvedScopeError(
      "Erection scope unresolved: erect is TBD.",
    );
  }

  if (scope.erect === "NO") {
    return 0;
  }

  return roundCurrency(erectionManHours * laborRate);
}

function assertNonNegativeFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite number >= 0.`);
  }
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
