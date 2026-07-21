import type { StandardAssemblyDefinition } from "./assembly-types";

export const STANDARD_ASSEMBLIES: readonly StandardAssemblyDefinition[] = [
  definition({
    id: "HSS_COLUMN_BASE",
    name: "Standard HSS column base",
    applicabilityConditions: ["Standard HSS column condition"],
    drawingDerivedComponents: ["Base-plate dimensions", "Anchor-rod quantity"],
    companyDefaultComponents: ["Plate weight calculation", "Global shop labor coverage"],
    rateKeys: ["MATERIAL_BURNED_PLATE", "HARDWARE_ANCHOR_ROD"],
    reviewTriggers: ["Nonstandard base", "Unclear anchor-rod scope"],
    blockingConditions: ["Missing plate dimensions", "Missing anchor-rod quantity"],
  }),
  definition({
    id: "HSS_COLUMN_TOP",
    name: "Standard HSS column top",
    applicabilityConditions: ["Standard HSS column condition"],
    drawingDerivedComponents: ["Top-plate dimensions"],
    companyDefaultComponents: ["Plate weight calculation", "Global shop labor coverage"],
    rateKeys: ["MATERIAL_BURNED_PLATE"],
    reviewTriggers: ["Moment, knife-plate, or other nonstandard top connection"],
    blockingConditions: ["Missing top-plate dimensions"],
  }),
  definition({
    id: "WF_BEAM_END",
    name: "Standard WF beam end",
    applicabilityConditions: ["Standard WF beam with two ends"],
    drawingDerivedComponents: ["Connection type", "Bolts per end when shown"],
    companyDefaultComponents: ["Two end instances per beam", "Global shop labor coverage"],
    rateKeys: ["HARDWARE_FIELD_BOLT"],
    reviewTriggers: ["Final connection design omitted from permit drawings"],
    blockingConditions: [],
  }),
  definition({
    id: "JOIST_BEARING_PLATE",
    name: "Standard joist bearing plate assembly",
    applicabilityConditions: ["Joist bearing plate is required"],
    drawingDerivedComponents: ["Plate dimensions", "Bearing count"],
    companyDefaultComponents: ["Plate weight calculation", "Global shop labor coverage"],
    rateKeys: ["MATERIAL_BURNED_PLATE", "HARDWARE_JOIST_BEARING"],
    reviewTriggers: ["Final joist supplier detail differs from permit drawings"],
    blockingConditions: ["Missing plate dimensions", "Missing bearing count", "Supplier quote required"],
  }),
  definition({
    id: "WOOD_NAILER_HARDWARE",
    name: "Standard wood-nailer hardware assembly",
    applicabilityConditions: ["WF beam supports a wood nailer or wood truss"],
    drawingDerivedComponents: ["Beam length", "Fastener spacing"],
    companyDefaultComponents: ["Fastener count = ceil(actual run / approved spacing)", "One washer per bolt"],
    rateKeys: ["HARDWARE_WOOD_NAILER"],
    reviewTriggers: ["Different fastener specification or edge condition"],
    blockingConditions: ["Missing beam length", "Missing fastener spacing", "Supplier quote required"],
  }),
  definition({
    id: "PERIMETER_ANGLE_ANCHOR",
    name: "Standard perimeter-angle anchor assembly",
    applicabilityConditions: ["Perimeter angle requires anchors"],
    drawingDerivedComponents: ["Angle run length", "Anchor spacing"],
    companyDefaultComponents: ["Anchor count = ceil(actual run / approved spacing)"],
    rateKeys: ["HARDWARE_EPOXY_ANCHOR"],
    reviewTriggers: ["Corner, splice, substrate, or edge-distance exception"],
    blockingConditions: ["Missing run length", "Missing anchor spacing"],
  }),
  definition({
    id: "BRIDGING_TERMINATION",
    name: "Standard bridging termination assembly",
    applicabilityConditions: ["Joist bridging terminates at supporting steel"],
    drawingDerivedComponents: ["Termination count", "Supplier bridging detail"],
    companyDefaultComponents: ["Global shop labor coverage"],
    rateKeys: ["HARDWARE_BRIDGING_TERMINATION"],
    reviewTriggers: ["Supplier detail unavailable or nonstandard termination"],
    blockingConditions: ["Missing termination count", "Supplier quote required"],
  }),
] as const;

function definition(
  input: Omit<StandardAssemblyDefinition, "version" | "maturity" | "shopLaborCoverage" | "confidence">,
): StandardAssemblyDefinition {
  return {
    ...input,
    version: 1,
    maturity: "PROVISIONAL",
    shopLaborCoverage: "GLOBAL_HOURS_PER_TON",
    confidence: "MEDIUM",
  };
}
