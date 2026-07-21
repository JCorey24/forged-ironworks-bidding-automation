import { describe, expect, it } from "vitest";
import {
  ALPHABET_ACADEMY_FIXTURE,
  evaluateAlphabetAcademyRegression,
} from "../src";

const lines = ALPHABET_ACADEMY_FIXTURE.takeoffLines;

function weightForCategory(category: string): number {
  return lines
    .filter((line) => line.category === category)
    .reduce((total, line) => total + (line.weightLb ?? 0), 0);
}

function quantityForMark(memberMark: string): number {
  return lines.find((line) => line.memberMark === memberMark)?.quantity ?? 0;
}

describe("Alphabet Academy regression fixture", () => {
  it("preserves verified C2 and C3 sections and quantities", () => {
    const c2 = lines.find((line) => line.memberMark === "C2");
    const c3 = lines.find((line) => line.memberMark === "C3");

    expect(c2).toMatchObject({ section: "HSS6x3x1/2", quantity: 3 });
    expect(c3).toMatchObject({ section: "HSS7x3x1/2", quantity: 6 });
  });

  it("does not introduce a blanket HSS column length", () => {
    const columns = lines.filter((line) => line.category === "HSS_COLUMN");

    expect(columns).toHaveLength(2);
    expect(columns.every((line) => line.lengthFt === null)).toBe(true);
    expect(JSON.stringify(columns)).not.toMatch(/14[- ]?foot|14'-0|lengthFt":14/i);
  });

  it("keeps verified WF weight near 9,224 lb without a residual beam", () => {
    expect(weightForCategory("WF_BEAM")).toBeCloseTo(9224, 0);
    expect(lines.some((line) => /residual|adjustment/i.test(line.description))).toBe(false);
  });

  it("keeps verified angle weight within tolerance", () => {
    const angleWeight = [
      "PERIMETER_ANGLE",
      "LOOSE_LINTEL",
      "BRIDGING_TERMINATION",
    ].reduce((total, category) => total + weightForCategory(category), 0);

    expect(Math.abs(angleWeight - 2721.35)).toBeLessThanOrEqual(0.05);
  });

  it("calculates verified plate weight from drawing dimensions within tolerance", () => {
    expect(Math.abs(weightForCategory("PLATE") - 366.69)).toBeLessThanOrEqual(0.05);
  });

  it("preserves all verified hardware quantities", () => {
    expect({
      anchorRods: quantityForMark("ANCHOR_ROD"),
      headedStuds: quantityForMark("HEADED_STUD"),
      nailerBolts: quantityForMark("WOOD_NAILER_BOLT"),
      nailerWashers: quantityForMark("WOOD_NAILER_WASHER"),
      perimeterAnchors: quantityForMark("EPOXY_ANCHOR"),
      bridgingTerminations: quantityForMark("BRIDGING_TERMINATION"),
      heavyHexNuts: quantityForMark("HEAVY_HEX_NUT"),
      baseWashers: quantityForMark("BASE_WASHER"),
    }).toEqual({
      anchorRods: 36,
      headedStuds: 44,
      nailerBolts: 114,
      nailerWashers: 114,
      perimeterAnchors: 49,
      bridgingTerminations: 20,
      heavyHexNuts: 72,
      baseWashers: 36,
    });
  });

  it("groups unresolved connection plates without inventing weight", () => {
    const unresolved = lines.filter((line) =>
      ["LEVELING_PLATE", "SHEAR_PLATE", "CAP_PLATE"].includes(line.category),
    );
    const evaluation = evaluateAlphabetAcademyRegression();
    const geometryGroups = evaluation.groupedExceptions.filter(
      (item) => item.code === "CONNECTION_GEOMETRY_UNRESOLVED",
    );

    expect(unresolved).toHaveLength(27);
    expect(unresolved.every((line) => line.weightLb === undefined)).toBe(true);
    expect(geometryGroups).toHaveLength(3);
    expect(geometryGroups.every((item) => item.quantity === 9)).toBe(true);
  });

  it("keeps missing joist and deck quotes as final-submission blockers", () => {
    const evaluation = evaluateAlphabetAcademyRegression();

    expect(evaluation.quoteBlockers.map((item) => item.rateKey)).toEqual([
      "STRUCTURAL_LH_JOIST",
      "STRUCTURAL_METAL_DECK",
    ]);
    expect(evaluation.readiness.readyToPrice).toBe(false);
    expect(evaluation.readiness.readyToSubmit).toBe(false);
  });

  it("contains no historical proposal total or unclassified weight adjustment", () => {
    const serialized = JSON.stringify(ALPHABET_ACADEMY_FIXTURE);

    expect(serialized).not.toMatch(/10790|historical (bid|proposal) total|flat adjustment|unclassified residual/i);
  });
});
