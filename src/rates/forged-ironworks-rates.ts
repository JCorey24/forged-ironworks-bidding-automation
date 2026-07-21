import type { RateDefinition, RateSource } from "./rate-source";

export const FORGED_IRONWORKS_RATE_KEYS = [
  "MATERIAL_WF_BEAM",
  "MATERIAL_HSS",
  "MATERIAL_ANGLE",
  "MATERIAL_CHANNEL",
  "MATERIAL_FLAT",
  "MATERIAL_BENT_PLATE",
  "MATERIAL_BURNED_PLATE",
  "MATERIAL_MISC_CHANNEL",
  "HARDWARE_ANCHOR_ROD",
  "HARDWARE_SHEAR_STUD",
  "HARDWARE_FIELD_BOLT",
  "HARDWARE_EPOXY_ANCHOR",
  "BUYOUT_BOLLARD",
  "SERVICE_PAINTING",
  "SERVICE_GALVANIZING",
  "SERVICE_ENGINEERING",
  "SERVICE_DETAILING",
  "SALES_TAX",
  "MARKUP_JOIST_DECK",
  "MARKUP_STANDARD",
  "LABOR_SHOP",
  "LABOR_ERECTION_LOCAL",
  "LABOR_ERECTION_REGIONAL",
  "LABOR_ERECTION_TRAVEL",
  "TRAVEL_PER_DIEM",
  "TRAVEL_HOTEL",
  "FREIGHT_OUTBOUND",
  "EQUIPMENT_CRANE",
  "EQUIPMENT_RAD_CRANE",
  "EQUIPMENT_TELEHANDLER",
  "EQUIPMENT_BOOM_LIFT",
  "EQUIPMENT_SCISSOR_LIFT",
  "EQUIPMENT_WELDER",
  "EQUIPMENT_SCAFFOLD",
  "EQUIPMENT_PERIMETER_CABLE",
  "EQUIPMENT_DELIVERY",
  "BUYOUT_TRASH_GATE",
  "BUYOUT_ROOF_ACCESS_LADDER",
  "BUYOUT_RAILING_TWO_LINE",
  "BUYOUT_REPAIR_RAIL",
  "BUYOUT_CABLE_RAILING",
  "BUYOUT_RAILING_WALL_FIX",
  "STRUCTURAL_LH_JOIST",
  "STRUCTURAL_METAL_DECK",
  "BUYOUT_GRATING",
  "BUYOUT_FALL_PROTECTION_ANCHOR",
  "HARDWARE_JOIST_BEARING",
] as const;

export type ForgedIronworksRateKey =
  (typeof FORGED_IRONWORKS_RATE_KEYS)[number];

const SOURCE = "reference/rates.md";

const RATES: Readonly<
  Record<ForgedIronworksRateKey, RateDefinition>
> = {
  MATERIAL_WF_BEAM: standard(1.2, "PER_LB"),
  MATERIAL_HSS: standard(1.06, "PER_LB"),
  MATERIAL_ANGLE: standard(0.87, "PER_LB"),
  MATERIAL_CHANNEL: standard(0.93, "PER_LB"),
  MATERIAL_FLAT: standard(0.84, "PER_LB"),
  MATERIAL_BENT_PLATE: standard(1.35, "PER_LB"),
  MATERIAL_BURNED_PLATE: standard(1.5, "PER_LB"),
  MATERIAL_MISC_CHANNEL: standard(1.12, "PER_LB"),
  HARDWARE_ANCHOR_ROD: standard(35, "PER_EACH"),
  HARDWARE_SHEAR_STUD: standard(4.5, "PER_EACH"),
  HARDWARE_FIELD_BOLT: standard(75, "PER_EACH"),
  HARDWARE_EPOXY_ANCHOR: standard(75, "PER_EACH"),
  BUYOUT_BOLLARD: standard(195, "PER_EACH"),
  SERVICE_PAINTING: standard(75, "PER_HOUR", "Production rate is unresolved."),
  SERVICE_GALVANIZING: standard(0.55, "PER_LB"),
  SERVICE_ENGINEERING: standard(50, "PER_TON"),
  SERVICE_DETAILING: standard(250, "PER_TON"),
  SALES_TAX: standard(0.07, "PERCENT"),
  MARKUP_JOIST_DECK: standard(0.1, "PERCENT"),
  MARKUP_STANDARD: standard(1.12, "MULTIPLIER"),
  LABOR_SHOP: standard(75, "PER_HOUR"),
  LABOR_ERECTION_LOCAL: standard(75, "PER_HOUR"),
  LABOR_ERECTION_REGIONAL: standard(82, "PER_HOUR"),
  LABOR_ERECTION_TRAVEL: standard(95, "PER_HOUR"),
  TRAVEL_PER_DIEM: standard(65, "PER_DAY"),
  TRAVEL_HOTEL: standard(175, "PER_DAY"),
  FREIGHT_OUTBOUND: standard(1200, "PER_LOAD"),
  EQUIPMENT_CRANE: standard(300, "PER_HOUR"),
  EQUIPMENT_RAD_CRANE: standard(80, "PER_HOUR"),
  EQUIPMENT_TELEHANDLER: standard(1500, "PER_WEEK"),
  EQUIPMENT_BOOM_LIFT: standard(1225, "PER_WEEK"),
  EQUIPMENT_SCISSOR_LIFT: standard(600, "PER_WEEK"),
  EQUIPMENT_WELDER: standard(200, "PER_WEEK"),
  EQUIPMENT_SCAFFOLD: standard(1000, "PER_DAY_PER_FLOOR"),
  EQUIPMENT_PERIMETER_CABLE: standard(25, "PER_DAY_PER_FOOT"),
  EQUIPMENT_DELIVERY: standard(1000, "PER_EACH"),
  BUYOUT_TRASH_GATE: standard(5000, "PER_EACH"),
  BUYOUT_ROOF_ACCESS_LADDER: standard(2103, "PER_EACH"),
  BUYOUT_RAILING_TWO_LINE: standard(200, "PER_LINEAR_FOOT"),
  BUYOUT_REPAIR_RAIL: standard(200, "PER_LINEAR_FOOT"),
  BUYOUT_CABLE_RAILING: standard(650, "PER_LINEAR_FOOT"),
  BUYOUT_RAILING_WALL_FIX: standard(800, "PER_EACH"),
  STRUCTURAL_LH_JOIST: quoteRequired("Supplier quote required per job."),
  STRUCTURAL_METAL_DECK: quoteRequired("Supplier quote required per job."),
  BUYOUT_GRATING: quoteRequired("No company standard rate is set."),
  BUYOUT_FALL_PROTECTION_ANCHOR: quoteRequired("Quote per installation."),
  HARDWARE_JOIST_BEARING: quoteRequired(
    "Rate and quantification method require estimator confirmation.",
  ),
};

export const FORGED_IRONWORKS_RATE_SOURCE: RateSource<ForgedIronworksRateKey> = {
  id: "forged-ironworks-rates-v1",
  get(key) {
    return RATES[key];
  },
};

function standard(
  amount: number,
  unit: Extract<RateDefinition, { status: "STANDARD" }>["unit"],
  notes?: string,
): RateDefinition {
  return { status: "STANDARD", amount, unit, source: SOURCE, notes };
}

function quoteRequired(notes: string): RateDefinition {
  return { status: "QUOTE_REQUIRED", source: SOURCE, notes };
}
