const SPREAD_PATTERN = [-2.1, -1.1, 0, 1.1, 2.1, 0.7, -0.7];

type ExtentOptions = {
  padRatio?: number;
  minimumPad?: number;
  precision?: number;
};

export function getValueExtent(
  values: number[],
  { padRatio = 0.16, minimumPad = 1, precision = 2 }: ExtentOptions = {},
) {
  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue;
  const pad =
    spread > 0 ? spread * padRatio : Math.max(minimumPad, Math.abs(maxValue) * 0.05 || minimumPad);

  return {
    min: Number((minValue - pad).toFixed(precision)),
    max: Number((maxValue + pad).toFixed(precision)),
  };
}

export function addVisualSpread<T extends { x: number; y: number }>(
  points: T[],
  xAmplitude: number,
  yAmplitude: number,
  precision = 2,
) {
  return points.map((point, index) => {
    const xOffset = SPREAD_PATTERN[index % SPREAD_PATTERN.length] * xAmplitude;
    const yOffset = SPREAD_PATTERN[(index + 3) % SPREAD_PATTERN.length] * yAmplitude;

    return {
      ...point,
      plottedX: Number((point.x + xOffset).toFixed(precision)),
      plottedY: Number((point.y + yOffset).toFixed(precision)),
    };
  });
}

export function pickHighlightedKeys<T extends { key: string; size: number; x: number; y: number }>(
  points: T[],
  count = 5,
) {
  const candidates = [
    ...[...points].sort((left, right) => right.size - left.size),
    ...[...points].sort((left, right) => left.x - right.x),
    ...[...points].sort((left, right) => right.x - left.x),
    ...[...points].sort((left, right) => left.y - right.y),
    ...[...points].sort((left, right) => right.y - left.y),
  ];

  const highlighted = new Set<string>();

  for (const point of candidates) {
    highlighted.add(point.key);
    if (highlighted.size === count) {
      break;
    }
  }

  return highlighted;
}