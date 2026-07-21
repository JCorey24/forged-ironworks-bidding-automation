import { FORGED_IRONWORKS_ESTIMATING_PROFILE } from "../config/company-estimating-profile";
import { requireStandardRate } from "../rates/rate-source";
import { STANDARD_ASSEMBLIES } from "./standard-assemblies";
import type {
  AssemblyApplication,
  AssemblyComponent,
  AssemblyException,
  AssemblyMemberInput,
  AssemblyResolution,
  PlateDimensions,
  StandardAssemblyId,
} from "./assembly-types";

// Physical estimating constant; this supplies density only, never plate geometry.
const STEEL_DENSITY_LB_PER_CUBIC_INCH = 0.2836;

export function resolveStandardAssemblies(
  input: AssemblyMemberInput,
): AssemblyResolution {
  if (input.condition !== "STANDARD") {
    const exception: AssemblyException = {
      assemblyId: "STANDARD_ASSEMBLY_SELECTION",
      lineItemId: input.lineItemId,
      severity: input.condition === "NONSTANDARD" ? "REVIEW" : "BLOCKER",
      code: input.condition === "NONSTANDARD" ? "NONSTANDARD_CONDITION" : "CONDITION_UNKNOWN",
      cause: `member condition is ${input.condition.toLowerCase()}`,
      message: `${input.memberMark}: standard assemblies were not applied because the condition is ${input.condition.toLowerCase()}.`,
    };
    return { applications: [], exceptions: [exception] };
  }

  const applications = applicableAssemblyIds(input).map((id) => apply(id, input));
  return {
    applications,
    exceptions: applications.flatMap((application) =>
      application.exception ? [application.exception] : [],
    ),
  };
}

function applicableAssemblyIds(input: AssemblyMemberInput): StandardAssemblyId[] {
  switch (input.memberType) {
    case "HSS_COLUMN":
      return ["HSS_COLUMN_BASE", "HSS_COLUMN_TOP"];
    case "WF_BEAM": {
      const ids: StandardAssemblyId[] = ["WF_BEAM_END"];
      if (input.joistBearing?.required) ids.push("JOIST_BEARING_PLATE");
      if (input.woodNailer?.required) ids.push("WOOD_NAILER_HARDWARE");
      return ids;
    }
    case "PERIMETER_ANGLE":
      return input.perimeterAnchors?.required ? ["PERIMETER_ANGLE_ANCHOR"] : [];
    case "JOIST":
      return input.bridgingTermination?.required ? ["BRIDGING_TERMINATION"] : [];
  }
}

function apply(id: StandardAssemblyId, input: AssemblyMemberInput): AssemblyApplication {
  switch (id) {
    case "HSS_COLUMN_BASE":
      return plateAssembly(id, input, input.basePlate, input.anchorRodCount);
    case "HSS_COLUMN_TOP":
      return plateAssembly(id, input, input.topPlate);
    case "WF_BEAM_END":
      return beamEnds(input);
    case "JOIST_BEARING_PLATE":
      return joistBearing(input);
    case "WOOD_NAILER_HARDWARE":
      return woodNailer(input);
    case "PERIMETER_ANGLE_ANCHOR":
      return perimeterAnchors(input);
    case "BRIDGING_TERMINATION":
      return bridgingTermination(input);
  }
}

function plateAssembly(
  id: "HSS_COLUMN_BASE" | "HSS_COLUMN_TOP",
  input: AssemblyMemberInput,
  dimensions?: PlateDimensions,
  anchorRodCount?: number,
): AssemblyApplication {
  const missing = [
    !validPlate(dimensions) ? "drawing-derived plate dimensions" : undefined,
    id === "HSS_COLUMN_BASE" && !positiveInteger(anchorRodCount)
      ? "anchor-rod quantity"
      : undefined,
  ].filter(Boolean) as string[];

  const components: AssemblyComponent[] = [];
  if (validPlate(dimensions)) {
    components.push(component("plate", plateWeight(dimensions), "LB", "CALCULATED", "MATERIAL_BURNED_PLATE"));
  }
  if (id === "HSS_COLUMN_BASE" && positiveInteger(anchorRodCount)) {
    components.push(component("anchor-rods", anchorRodCount, "EA", "DRAWING", "HARDWARE_ANCHOR_ROD"));
  }

  return result(id, input, 1, components, missing, false);
}

function beamEnds(input: AssemblyMemberInput): AssemblyApplication {
  const endCount =
    FORGED_IRONWORKS_ESTIMATING_PROFILE.assemblyQuantities
      .wfBeamEndsPerMember.value;
  const hasBoltCount = positiveInteger(input.boltsPerBeamEnd);
  const components = [
    component(
      "beam-end-connection-scope",
      null,
      "EA",
      "COMPANY_DEFAULT",
      "HARDWARE_FIELD_BOLT",
    ),
  ];
  if (hasBoltCount) {
    components.push(component(
      "field-bolts",
      input.boltsPerBeamEnd! * endCount,
      "EA",
      "DRAWING",
      "HARDWARE_FIELD_BOLT",
    ));
  }
  return result(
    "WF_BEAM_END",
    input,
    endCount,
    components,
    hasBoltCount ? [] : ["final connection bolt quantity"],
    false,
    "REVIEW",
  );
}

function joistBearing(input: AssemblyMemberInput): AssemblyApplication {
  const bearing = input.joistBearing;
  const missing = [
    !positiveInteger(bearing?.count) ? "bearing count" : undefined,
    !validPlate(bearing?.plate) ? "drawing-derived bearing-plate dimensions" : undefined,
  ].filter(Boolean) as string[];
  const components: AssemblyComponent[] = [];
  if (positiveInteger(bearing?.count) && validPlate(bearing?.plate)) {
    components.push(
      component(
        "bearing-plates",
        plateWeight(bearing!.plate!) * bearing!.count!,
        "LB",
        "CALCULATED",
        "MATERIAL_BURNED_PLATE",
      ),
    );
  }
  components.push(component("joist-bearing-hardware", bearing?.count ?? null, "EA", "ALLOWANCE", "HARDWARE_JOIST_BEARING", true));
  return result("JOIST_BEARING_PLATE", input, bearing?.count ?? 0, components, missing, true);
}

function woodNailer(input: AssemblyMemberInput): AssemblyApplication {
  const policy =
    FORGED_IRONWORKS_ESTIMATING_PROFILE.assemblyQuantities.woodNailer;
  const spacing = input.woodNailer?.fastenerSpacingIn ?? policy.spacingIn.value;
  const nonstandardSpacing = spacing !== policy.spacingIn.value;
  const missing = [
    !positive(input.lengthFt) ? "beam length" : undefined,
    !positive(spacing) ? "fastener spacing" : undefined,
    nonstandardSpacing ? "fastener spacing differs from approved company spacing" : undefined,
  ].filter(Boolean) as string[];
  const quantity = missing.length === 0
    ? Math.ceil((input.lengthFt! * 12) / spacing!)
    : null;
  const components = [
    component(
      "wood-nailer-bolts",
      quantity,
      "EA",
      "CALCULATED",
      "HARDWARE_WOOD_NAILER",
      true,
    ),
    component(
      "wood-nailer-washers",
      quantity === null ? null : quantity * policy.washerPerBolt.value,
      "EA",
      "CALCULATED",
      "HARDWARE_WOOD_NAILER_WASHER",
      true,
    ),
  ];
  return result("WOOD_NAILER_HARDWARE", input, 1, components, missing, true);
}

function perimeterAnchors(input: AssemblyMemberInput): AssemblyApplication {
  const policy = FORGED_IRONWORKS_ESTIMATING_PROFILE.assemblyQuantities
    .perimeterAngleAnchors;
  const conditions = input.perimeterAnchors;
  const spacing = conditions?.spacingIn ?? policy.spacingIn.value;
  if (!positive(input.lengthFt) || !positive(spacing)) {
    return result(
      "PERIMETER_ANGLE_ANCHOR",
      input,
      1,
      [],
      [!positive(input.lengthFt) ? "angle run length" : "anchor spacing"],
      false,
    );
  }

  const specification = conditions?.specification ?? "UNKNOWN";
  const reviewReasons = [
    spacing !== policy.spacingIn.value
      ? "anchor spacing differs from approved company spacing"
      : undefined,
    specification !== policy.approvedSpecification
      ? "anchor specification does not match approved epoxy-anchor scope"
      : undefined,
    conditions?.substrateException ? "substrate exception" : undefined,
    conditions?.cornerException ? "corner exception" : undefined,
    conditions?.spliceException ? "splice exception" : undefined,
    conditions?.edgeDistanceException ? "edge-distance exception" : undefined,
  ].filter(Boolean) as string[];
  const quantity = Math.ceil((input.lengthFt * 12) / spacing);
  const components = specification === policy.approvedSpecification
    ? [component(
        "epoxy-anchors",
        quantity,
        "EA",
        "CALCULATED",
        "HARDWARE_EPOXY_ANCHOR",
      )]
    : [];
  return result(
    "PERIMETER_ANGLE_ANCHOR",
    input,
    1,
    components,
    reviewReasons,
    false,
    "REVIEW",
  );
}

function bridgingTermination(input: AssemblyMemberInput): AssemblyApplication {
  const count = input.bridgingTermination?.count;
  const missing = positiveInteger(count) ? [] : ["bridging termination count"];
  return result(
    "BRIDGING_TERMINATION",
    input,
    count ?? 0,
    [component("bridging-termination-hardware", count ?? null, "EA", "ALLOWANCE", "HARDWARE_BRIDGING_TERMINATION", true)],
    missing,
    true,
  );
}

function result(
  id: StandardAssemblyId,
  input: AssemblyMemberInput,
  instanceCount: number,
  components: AssemblyComponent[],
  missing: string[],
  quoteRequired: boolean,
  missingSeverity: "BLOCKER" | "REVIEW" = "BLOCKER",
): AssemblyApplication {
  const definition = STANDARD_ASSEMBLIES.find((item) => item.id === id)!;
  const laborMissing = !input.globalShopHoursPerTonEnabled;
  const reasons = [
    ...missing,
    ...(quoteRequired ? ["supplier quote required"] : []),
    ...(laborMissing ? ["global shop-hours-per-ton method is disabled"] : []),
  ];
  const severity = quoteRequired || laborMissing ? "BLOCKER" : missingSeverity;
  const exception = reasons.length
    ? {
        assemblyId: id,
        lineItemId: input.lineItemId,
        severity,
        code: severity === "BLOCKER" ? "ASSEMBLY_INPUT_BLOCKED" : "ASSEMBLY_REVIEW_REQUIRED",
        cause: reasons.join(", "),
        message: `${input.memberMark} ${definition.name}: ${reasons.join(", ")}.`,
      } satisfies AssemblyException
    : undefined;

  for (const item of components) {
    if (!item.quoteRequired && item.quantity !== null) {
      requireStandardRate(FORGED_IRONWORKS_ESTIMATING_PROFILE.rateSource, item.rateKey);
    }
  }

  return {
    assemblyId: id,
    assemblyVersion: definition.version,
    lineItemId: input.lineItemId,
    instanceCount,
    outcome: exception ? (severity === "BLOCKER" ? "BLOCKED" : "REVIEW_REQUIRED") : "AUTO_APPLY",
    confidence: definition.confidence,
    components,
    additionalShopHours: 0,
    exception,
  };
}

function component(
  id: string,
  quantity: number | null,
  unit: "EA" | "LB",
  source: AssemblyComponent["source"],
  rateKey: AssemblyComponent["rateKey"],
  quoteRequired = false,
): AssemblyComponent {
  return { id, description: id.replaceAll("-", " "), quantity, unit, source, rateKey, quoteRequired };
}

function validPlate(value: PlateDimensions | undefined): value is PlateDimensions {
  return !!value && positive(value.lengthIn) && positive(value.widthIn) && positive(value.thicknessIn);
}

function plateWeight(plate: PlateDimensions): number {
  return roundWeight(plate.lengthIn * plate.widthIn * plate.thicknessIn * STEEL_DENSITY_LB_PER_CUBIC_INCH);
}

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function positiveInteger(value: number | undefined): value is number {
  return positive(value) && Number.isInteger(value);
}

function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}
