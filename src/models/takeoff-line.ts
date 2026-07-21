import type { LineItemScope } from "./scope";

export const TAKEOFF_CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type TakeoffConfidence = (typeof TAKEOFF_CONFIDENCE_LEVELS)[number];

export const TAKEOFF_SOURCE_CATEGORIES = [
  "DRAWING_DERIVED",
  "CALCULATED_FROM_DRAWING_DIMENSIONS",
  "APPROVED_COMPANY_QUANTITY_POLICY",
  "VERIFIED_PROJECT_AGGREGATE",
  "UNRESOLVED",
] as const;
export type TakeoffSourceCategory =
  (typeof TAKEOFF_SOURCE_CATEGORIES)[number];

export interface DrawingSource {
  category: TakeoffSourceCategory;
  sheet: string;
  detail?: string;
  revision?: string;
}

export interface TakeoffLine {
  id: string;
  pricingGroupId: string;

  memberMark: string;
  section: string;
  description: string;
  category: string;
  shape?: string;

  quantity: number;
  unit: string;
  lengthFt: number | null;
  weightLb?: number;

  source: DrawingSource;
  confidence: TakeoffConfidence;
  reviewRequired: boolean;
  reviewReason?: string;

  scope: LineItemScope;
}
