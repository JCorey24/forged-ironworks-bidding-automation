import { groupAssemblyExceptions } from "../assemblies/evaluate-project-assemblies";
import type { AssemblyException } from "../assemblies/assembly-types";
import { calculateRectangularPlateWeightLb } from "../materials/steel-weight";
import type { LineItemScope } from "../models/scope";
import type {
  TakeoffLine,
  TakeoffSourceCategory,
} from "../models/takeoff-line";
import type { ForgedIronworksRateKey } from "../rates/forged-ironworks-rates";
import {
  QuoteRequiredError,
  requireStandardRate,
} from "../rates/rate-source";
import { FORGED_IRONWORKS_ESTIMATING_PROFILE } from "../config/company-estimating-profile";
import { validateProjectScope } from "../validation/validate-project-scope";

const VERIFIED_SOURCE = "Alphabet Academy verified regression quantities";

export interface AlphabetAcademyRegressionFixture {
  id: "ALPHABET_ACADEMY";
  takeoffLines: TakeoffLine[];
  unresolvedAssemblyExceptions: AssemblyException[];
  requiredQuoteRateKeys: ForgedIronworksRateKey[];
}

export const ALPHABET_ACADEMY_FIXTURE: AlphabetAcademyRegressionFixture = {
  id: "ALPHABET_ACADEMY",
  takeoffLines: [
    line({
      id: "aa-hss-c2",
      pricingGroupId: "HSS_COLUMNS",
      memberMark: "C2",
      section: "HSS6x3x1/2",
      description: "C2 HSS columns",
      category: "HSS_COLUMN",
      quantity: 3,
      unit: "EA",
      lengthFt: null,
      source: source("DRAWING_DERIVED", "Structural column schedule", "C2"),
      confidence: "HIGH",
      reviewRequired: true,
      reviewReason: "Column lengths must be supplied from drawing elevations.",
    }),
    line({
      id: "aa-hss-c3",
      pricingGroupId: "HSS_COLUMNS",
      memberMark: "C3",
      section: "HSS7x3x1/2",
      description: "C3 HSS columns",
      category: "HSS_COLUMN",
      quantity: 6,
      unit: "EA",
      lengthFt: null,
      source: source("DRAWING_DERIVED", "Structural column schedule", "C3"),
      confidence: "HIGH",
      reviewRequired: true,
      reviewReason: "Column lengths must be supplied from drawing elevations.",
    }),
    line({
      id: "aa-wf-verified",
      pricingGroupId: "WF_BEAMS",
      memberMark: "WF-VERIFIED-SCOPE",
      section: "MIXED_WF_SECTIONS",
      description: "Verified wide-flange scope aggregate",
      category: "WF_BEAM",
      quantity: 1,
      unit: "LOT",
      lengthFt: null,
      weightLb: 9224,
      source: source("VERIFIED_PROJECT_AGGREGATE", VERIFIED_SOURCE, "WF total"),
      confidence: "MEDIUM",
      reviewRequired: true,
      reviewReason: "Individual WF member mapping is not yet clean enough for regression truth.",
    }),
    line({
      id: "aa-angle-perimeter",
      pricingGroupId: "ANGLES",
      memberMark: "PA-1",
      section: "L4x4x5/16",
      description: "Continuous perimeter angle",
      category: "PERIMETER_ANGLE",
      quantity: 192.9375,
      unit: "LF",
      lengthFt: 192.9375,
      weightLb: 1582.09,
      source: source("CALCULATED_FROM_DRAWING_DIMENSIONS", VERIFIED_SOURCE, "Continuous perimeter"),
      confidence: "HIGH",
      reviewRequired: false,
    }),
    line({
      id: "aa-angle-door-lintels",
      pricingGroupId: "ANGLES",
      memberMark: "LL-DOORS",
      section: "MIXED_LINTEL_ANGLES",
      description: "Verified door lintel aggregate",
      category: "LOOSE_LINTEL",
      quantity: 1,
      unit: "LOT",
      lengthFt: null,
      weightLb: 943.27,
      source: source("VERIFIED_PROJECT_AGGREGATE", VERIFIED_SOURCE, "Door lintels"),
      confidence: "HIGH",
      reviewRequired: false,
    }),
    line({
      id: "aa-angle-bridging",
      pricingGroupId: "ANGLES",
      memberMark: "BR-TERM",
      section: "BRIDGING_TERMINATION_ANGLES",
      description: "Bridging termination angles",
      category: "BRIDGING_TERMINATION",
      quantity: 1,
      unit: "LOT",
      lengthFt: null,
      weightLb: 196,
      source: source("VERIFIED_PROJECT_AGGREGATE", VERIFIED_SOURCE, "Bridging termination angles"),
      confidence: "HIGH",
      reviewRequired: false,
    }),
    plateLine("aa-plate-base", "BP", "12x9x3/4", 9, 12, 9, 0.75, "Base plates"),
    plateLine("aa-plate-joist-bearing", "JBP", "6x8x1/2", 22, 6, 8, 0.5, "Joist-bearing plates"),
    plateLine("aa-plate-washer", "PW", "2x2x1/4", 36, 2, 2, 0.25, "Plate washers"),
    hardwareLine("aa-hw-anchor-rods", "ANCHOR_ROD", "3/4 F1554", 36, "Column anchor rods", "DRAWING_DERIVED"),
    hardwareLine("aa-hw-headed-studs", "HEADED_STUD", "HEADED_STUD", 44, "Headed studs", "DRAWING_DERIVED"),
    hardwareLine("aa-hw-nailer-bolts", "WOOD_NAILER_BOLT", "WOOD_NAILER_BOLT", 114, "Wood-nailer bolts", "APPROVED_COMPANY_QUANTITY_POLICY"),
    hardwareLine("aa-hw-nailer-washers", "WOOD_NAILER_WASHER", "WOOD_NAILER_WASHER", 114, "Wood-nailer washers", "APPROVED_COMPANY_QUANTITY_POLICY"),
    hardwareLine("aa-hw-perimeter-anchors", "EPOXY_ANCHOR", "EPOXY_ANCHOR", 49, "Perimeter-angle epoxy anchors", "APPROVED_COMPANY_QUANTITY_POLICY"),
    hardwareLine("aa-hw-bridging-anchors", "BRIDGING_TERMINATION", "BRIDGING_TERMINATION", 20, "Bridging terminations or anchors", "DRAWING_DERIVED"),
    hardwareLine("aa-hw-heavy-hex-nuts", "HEAVY_HEX_NUT", "HEAVY_HEX_NUT", 72, "Heavy hex nuts at column bases", "DRAWING_DERIVED"),
    hardwareLine("aa-hw-base-washers", "BASE_WASHER", "BASE_WASHER", 36, "Additional base washers", "DRAWING_DERIVED"),
    ...unresolvedPlateLines("LEVELING_PLATE", "Leveling plate", "HSS_COLUMN_BASE"),
    ...unresolvedPlateLines("SHEAR_PLATE", "Shear plate", "WF_BEAM_END"),
    ...unresolvedPlateLines("CAP_PLATE", "Cap plate", "HSS_COLUMN_TOP"),
    quoteScopeLine("aa-quote-joists", "LH_JOISTS", "Long-span joist package"),
    quoteScopeLine("aa-quote-deck", "METAL_DECK", "Metal deck package"),
  ],
  unresolvedAssemblyExceptions: [
    ...repeatedException(
      "STANDARD_ASSEMBLY_SELECTION",
      "HSS_COLUMN_LENGTH_UNRESOLVED",
      "drawing-derived HSS column length is unresolved",
      9,
      "aa-hss-length",
    ),
    ...repeatedException(
      "HSS_COLUMN_BASE",
      "CONNECTION_GEOMETRY_UNRESOLVED",
      "leveling-plate dimensions are not verified",
      9,
      "aa-leveling-plate",
    ),
    ...repeatedException(
      "WF_BEAM_END",
      "CONNECTION_GEOMETRY_UNRESOLVED",
      "shear-plate dimensions are not verified",
      9,
      "aa-shear-plate",
    ),
    ...repeatedException(
      "HSS_COLUMN_TOP",
      "CONNECTION_GEOMETRY_UNRESOLVED",
      "cap-plate dimensions are not verified",
      9,
      "aa-cap-plate",
    ),
  ],
  requiredQuoteRateKeys: ["STRUCTURAL_LH_JOIST", "STRUCTURAL_METAL_DECK"],
};

export function evaluateAlphabetAcademyRegression() {
  const takeoffValidation = validateProjectScope(
    ALPHABET_ACADEMY_FIXTURE.takeoffLines,
  );
  const groupedExceptions = groupAssemblyExceptions(
    ALPHABET_ACADEMY_FIXTURE.unresolvedAssemblyExceptions,
  );
  const quoteBlockers = ALPHABET_ACADEMY_FIXTURE.requiredQuoteRateKeys.map(
    (rateKey) => {
      try {
        requireStandardRate(
          FORGED_IRONWORKS_ESTIMATING_PROFILE.rateSource,
          rateKey,
        );
        return null;
      } catch (error) {
        if (error instanceof QuoteRequiredError) {
          return { rateKey, message: error.message };
        }
        throw error;
      }
    },
  ).filter((item): item is NonNullable<typeof item> => item !== null);
  const hasBlocker =
    groupedExceptions.some((item) => item.severity === "BLOCKER") ||
    quoteBlockers.length > 0 ||
    takeoffValidation.status === "FAIL";

  return {
    takeoffValidation,
    groupedExceptions,
    quoteBlockers,
    readiness: {
      draftPricingAllowed: true,
      readyToPrice: !hasBlocker,
      readyToSubmit: !hasBlocker,
    },
  };
}

function line(
  input: Omit<TakeoffLine, "scope">,
): TakeoffLine {
  return { ...input, scope: materialScope(input.category) };
}

function plateLine(
  id: string,
  memberMark: string,
  section: string,
  quantity: number,
  lengthIn: number,
  widthIn: number,
  thicknessIn: number,
  description: string,
): TakeoffLine {
  return line({
    id,
    pricingGroupId: "PLATES",
    memberMark,
    section,
    description,
    category: "PLATE",
    quantity,
    unit: "EA",
    lengthFt: null,
    weightLb:
      calculateRectangularPlateWeightLb({
        lengthIn: lengthIn * quantity,
        widthIn,
        thicknessIn,
      }),
    source: source(
      "CALCULATED_FROM_DRAWING_DIMENSIONS",
      "Structural connection details",
      `${quantity} at ${section}`,
    ),
    confidence: "HIGH",
    reviewRequired: false,
  });
}

function hardwareLine(
  id: string,
  memberMark: string,
  section: string,
  quantity: number,
  description: string,
  category: TakeoffSourceCategory,
): TakeoffLine {
  return {
    ...line({
      id,
      pricingGroupId: "HARDWARE",
      memberMark,
      section,
      description,
      category: "HARDWARE",
      quantity,
      unit: "EA",
      lengthFt: null,
      source: source(category, VERIFIED_SOURCE, description),
      confidence: "HIGH",
      reviewRequired: false,
    }),
    scope: hardwareScope(),
  };
}

function unresolvedPlateLines(
  category: string,
  description: string,
  assemblyId: "HSS_COLUMN_BASE" | "WF_BEAM_END" | "HSS_COLUMN_TOP",
): TakeoffLine[] {
  return Array.from({ length: 9 }, (_, index) =>
    line({
      id: `aa-${category.toLowerCase()}-${index + 1}`,
      pricingGroupId: "UNRESOLVED_CONNECTION_PLATES",
      memberMark: `${assemblyId}-${index + 1}`,
      section: "DIMENSIONS_UNRESOLVED",
      description,
      category,
      quantity: 1,
      unit: "EA",
      lengthFt: null,
      source: source("UNRESOLVED", VERIFIED_SOURCE, description),
      confidence: "LOW",
      reviewRequired: true,
      reviewReason: "Connection plate dimensions and weight are not verified.",
    }),
  );
}

function quoteScopeLine(
  id: string,
  memberMark: string,
  description: string,
): TakeoffLine {
  return line({
    id,
    pricingGroupId: "QUOTE_REQUIRED",
    memberMark,
    section: "SUPPLIER_DESIGNED",
    description,
    category: memberMark,
    quantity: 1,
    unit: "LOT",
    lengthFt: null,
    source: source("DRAWING_DERIVED", "Structural framing drawings", description),
    confidence: "MEDIUM",
    reviewRequired: true,
    reviewReason: "Required supplier quote is absent.",
  });
}

function source(
  category: TakeoffSourceCategory,
  sheet: string,
  detail: string,
) {
  return { category, sheet, detail } as const;
}

function materialScope(category: string): LineItemScope {
  return {
    furnish: "YES",
    fabricate: "YES",
    erect: category === "LOOSE_LINTEL" ? "NO" : "YES",
    finish: "PRIME",
    providedBy: "FIW",
    installedBy: category === "LOOSE_LINTEL" ? "MASONRY" : "FIW",
    taxTreatment: "TAXABLE",
    resolutionStatus: "RESOLVED",
    scopeSource: VERIFIED_SOURCE,
  };
}

function hardwareScope(): LineItemScope {
  return {
    furnish: "YES",
    fabricate: "NO",
    erect: "NO",
    finish: "NONE",
    providedBy: "FIW",
    installedBy: "GC",
    taxTreatment: "TAXABLE",
    resolutionStatus: "RESOLVED",
    scopeSource: VERIFIED_SOURCE,
  };
}

function repeatedException(
  assemblyId: AssemblyException["assemblyId"],
  code: string,
  cause: string,
  quantity: number,
  idPrefix: string,
): AssemblyException[] {
  return Array.from({ length: quantity }, (_, index) => ({
    assemblyId,
    lineItemId: `${idPrefix}-${index + 1}`,
    severity: "BLOCKER",
    code,
    cause,
    message: cause,
  }));
}
