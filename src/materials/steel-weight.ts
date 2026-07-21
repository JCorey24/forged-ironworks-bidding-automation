// Physical estimating constant; this supplies density only, never geometry.
export const STEEL_DENSITY_LB_PER_CUBIC_INCH = 0.2836;

export interface RectangularPlateDimensions {
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
}

export function calculateRectangularPlateWeightLb(
  plate: RectangularPlateDimensions,
): number {
  return roundWeight(
    plate.lengthIn *
      plate.widthIn *
      plate.thicknessIn *
      STEEL_DENSITY_LB_PER_CUBIC_INCH,
  );
}

function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}
