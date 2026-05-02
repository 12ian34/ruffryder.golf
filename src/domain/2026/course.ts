export const COURSE_STROKE_INDICES = [
  3, 7, 13, 15, 11, 5, 17, 1, 9, 6, 2, 14, 18, 8, 10, 16, 4, 12,
] as const;

export function getCourseStrokeIndex(holeNumber: number): number {
  const strokeIndex = COURSE_STROKE_INDICES[holeNumber - 1];

  if (!strokeIndex) {
    throw new Error(`Invalid hole number: ${holeNumber}`);
  }

  return strokeIndex;
}
