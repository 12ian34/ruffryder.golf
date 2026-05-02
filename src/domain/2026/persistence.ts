import type { Database } from '../../types/supabase';
import type { CpiInput, HoleScoreInput, ScoredHole, SegmentKind } from './scoring';
import { scoreMatchHole } from './scoring';

type HoleScoreInsert = Database['public']['Tables']['hole_scores']['Insert'];
type DbHoleOutcome = Database['public']['Enums']['hole_outcome'];

export interface ScoreHolePayloadInput {
  segmentId: string;
  segmentKind: SegmentKind;
  hole: HoleScoreInput;
  cpi?: CpiInput;
  updatedBy?: string | null;
}

export interface ScoreHolePayload {
  scoredHole: ScoredHole;
  row: HoleScoreInsert;
}

export function buildHoleScorePayload(input: ScoreHolePayloadInput): ScoreHolePayload {
  const scoredHole = scoreMatchHole(input.segmentKind, input.hole, input.cpi);

  return {
    scoredHole,
    row: {
      segment_id: input.segmentId,
      hole_number: scoredHole.holeNumber,
      stroke_index: input.hole.strokeIndex,
      usa_score: scoredHole.raw.USA,
      europe_score: scoredHole.raw.EUROPE,
      usa_net_score: scoredHole.net.USA,
      europe_net_score: scoredHole.net.EUROPE,
      outcome: toDbHoleOutcome(scoredHole.outcome),
      cpi_applied: scoredHole.cpi.applies,
      cpi_difference: scoredHole.cpi.difference,
      cpi_strokes_usa: scoredHole.cpi.strokes.USA,
      cpi_strokes_europe: scoredHole.cpi.strokes.EUROPE,
      updated_by: input.updatedBy ?? null,
    },
  };
}

function toDbHoleOutcome(outcome: ScoredHole['outcome']): DbHoleOutcome {
  switch (outcome) {
    case 'USA':
      return 'USA';
    case 'EUROPE':
      return 'EUROPE';
    case 'HALVED':
      return 'halved';
    case 'UNPLAYED':
      return 'unplayed';
    default: {
      const exhaustiveCheck: never = outcome;
      return exhaustiveCheck;
    }
  }
}
