interface ProjectionInterval {
  min: number;
  max: number;
}

/**
 * Projects a polygon onto the specified axis then project it onto a 1D interval
 *
 * Warning: This function expects the user projects the polygon onto the same axis,
 * one should not compare the intervals returned by this function if they are not projected onto the same axis
 * @param polygon The polygon vertexes
 * @param axisStart The start of the axis to project onto
 * @param axisEnd The end of the axis to project onto
 * @returns The projected interval
 */
export function projectPolygonToInterval(
  polygon: DOMPoint[],
  axisStart: DOMPoint,
  axisEnd: DOMPoint,
): ProjectionInterval {
  const axisVectorX = axisEnd.x - axisStart.x;
  const axisVectorY = axisEnd.y - axisStart.y;

  let min = Infinity;
  let max = -Infinity;

  for (const point of polygon) {
    // Dot product
    // Note: This is not a true projection, yet, as SAT only compares relative positions of the projection intervals,
    // the absolute values does not matter as long as they are projected onto the same axis
    const projection = point.x * axisVectorX + point.y * axisVectorY;
    // Directly project it onto a 1D interval (similar to projecting onto x-axis), as points are projected onto the same axis, only relative position is important
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }

  return { min, max };
}

/**
 * Checks if two intervals overlap
 * @param interval1 The first interval
 * @param interval2 The second interval
 * @param epsilon The epsilon value for floating point comparison
 * @returns Whether the intervals overlap
 */
export function isIntervalsOverlap(
  interval1: ProjectionInterval,
  interval2: ProjectionInterval,
  epsilon = 1e-9,
) {
  return (
    interval1.max + epsilon >= interval2.min &&
    interval2.max + epsilon >= interval1.min
  );
}
