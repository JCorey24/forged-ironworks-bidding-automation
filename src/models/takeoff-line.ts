import type { LineItemScope } from "./scope";

export const TAKEOFF_CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type TakeoffConfidence = (typeof TAKEOFF_CONFIDENCE_LEVELS)[number];

export interface DrawingSource {
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
