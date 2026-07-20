import type { LineItemScope } from "./scope";

export interface TakeoffLine {
  id: string;
  pricingGroupId: string;

  description: string;
  category: string;
  shape?: string;
  size?: string;

  quantity: number;
  unit: string;
  lengthFt?: number;
  weightLb?: number;

  drawingSheet: string;
  drawingDetail?: string;
  drawingRevision?: string;

  scope: LineItemScope;
}
