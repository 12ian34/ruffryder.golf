export const COURSE_STROKE_INDICES = [
  3, 7, 13, 15, 11, 5, 17, 1, 9, 6, 2, 14, 18, 8, 10, 16, 4, 12,
] as const;

export interface CourseHoleMetadata {
  holeNumber: number;
  strokeIndex: number;
  par: number | null;
  yardage: number | null;
}

export const DEFAULT_COURSE_HOLES: CourseHoleMetadata[] = COURSE_STROKE_INDICES.map(
  (strokeIndex, index) => ({
    holeNumber: index + 1,
    strokeIndex,
    par: null,
    yardage: null,
  })
);

export function getCourseStrokeIndex(holeNumber: number): number {
  const strokeIndex = COURSE_STROKE_INDICES[holeNumber - 1];

  if (!strokeIndex) {
    throw new Error(`Invalid hole number: ${holeNumber}`);
  }

  return strokeIndex;
}

export function getDefaultCourseHole(holeNumber: number): CourseHoleMetadata {
  const metadata = DEFAULT_COURSE_HOLES[holeNumber - 1];

  if (!metadata) {
    throw new Error(`Invalid hole number: ${holeNumber}`);
  }

  return metadata;
}
