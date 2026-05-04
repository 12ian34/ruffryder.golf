import { describe, expect, it } from 'vitest';
import { buildTournamentActivityTimeline } from '../features/tournament2026/activity';
import type {
  FixtureView,
  HoleScoreView,
  SegmentView,
  TournamentActivityRow,
} from '../services/tournament2026Queries';

describe('2026 tournament activity timeline', () => {
  it('formats sanitized audit rows by category and newest-first order', () => {
    const timeline = buildTournamentActivityTimeline({
      activity: [
        createActivityRow({
          id: '1',
          table_name: 'hole_scores',
          action: 'update',
          occurred_at: '2026-05-04T10:00:00.000Z',
          actor_display_name: 'Ian',
          fixture_name: 'Match 1',
          segment_kind: 'singles',
          hole_number: 10,
          usa_score: 4,
          europe_score: 5,
          outcome: 'EUROPE',
        }),
        createActivityRow({
          id: '2',
          table_name: 'tournaments',
          action: 'update',
          occurred_at: '2026-05-04T11:00:00.000Z',
          changed_fields: ['is_complete', 'completed_at'],
          tournament_is_complete: true,
        }),
        createActivityRow({
          id: '3',
          table_name: 'tournament_progress',
          action: 'update',
          occurred_at: '2026-05-04T12:00:00.000Z',
        }),
      ],
      fixtures: [],
    });

    expect(timeline).toEqual([
      expect.objectContaining({
        id: 'audit-2',
        title: 'Tournament finalized',
        detail: 'Changed is complete, completed at',
        category: 'finalization',
      }),
      expect.objectContaining({
        id: 'audit-1',
        title: 'Score corrected',
        detail: 'Match 1 - Singles - H10 - USA 4, EUR 5 - Europe won the hole',
        category: 'score',
        actorLabel: 'Ian',
      }),
    ]);
  });

  it('adds inferred match started and finished milestones from saved scores', () => {
    const fixture = {
      name: 'Group Alpha',
      sort_order: 0,
      segments: [
        {
          id: 'segment-1',
          name: 'Singles A',
          kind: 'singles',
          sort_order: 0,
          hole_start: 1,
          hole_end: 3,
          holeScores: [
            createHoleScore({
              id: 'score-2',
              hole_number: 2,
              outcome: 'USA',
              created_at: '2026-05-04T10:05:00.000Z',
              updated_at: '2026-05-04T10:06:00.000Z',
            }),
            createHoleScore({
              id: 'score-1',
              hole_number: 1,
              outcome: 'USA',
              created_at: '2026-05-04T10:00:00.000Z',
              updated_at: '2026-05-04T10:01:00.000Z',
              updatedByProfile: { id: 'profile-1', display_name: 'Ian' },
            }),
          ],
        } as SegmentView,
      ],
    } as FixtureView;

    const timeline = buildTournamentActivityTimeline({ activity: [], fixtures: [fixture] });

    expect(timeline).toEqual([
      expect.objectContaining({
        id: 'match-finished-segment-1',
        title: 'Singles A finished',
        detail: 'Group Alpha - USA wins 2 & 1',
        occurredAt: '2026-05-04T10:06:00.000Z',
        category: 'match',
      }),
      expect.objectContaining({
        id: 'match-started-segment-1',
        title: 'Singles A started',
        detail: 'Group Alpha - first saved score H1',
        occurredAt: '2026-05-04T10:00:00.000Z',
        actorLabel: 'Ian',
      }),
    ]);
  });

  it('falls back to useful labels for sparse setup activity', () => {
    const timeline = buildTournamentActivityTimeline({
      activity: [
        createActivityRow({
          id: '4',
          table_name: 'profiles',
          action: 'update',
          occurred_at: '2026-05-04T09:00:00.000Z',
          changed_fields: null,
        }),
        createActivityRow({
          id: '5',
          table_name: 'course_holes',
          action: 'insert',
          occurred_at: '2026-05-04T09:01:00.000Z',
          changed_fields: ['stroke_index', 'yardage', 'par', 'updated_at', 'created_at'],
          hole_number: 3,
        }),
      ],
      fixtures: [],
    });

    expect(timeline).toEqual([
      expect.objectContaining({
        title: 'Created course hole',
        detail: 'H3 - Changed stroke index, yardage, par, updated at +1 more',
        category: 'course',
      }),
      expect.objectContaining({
        title: 'Updated profile',
        detail: 'Profile details changed',
        category: 'profile',
      }),
    ]);
  });
});

function createActivityRow(overrides: Partial<TournamentActivityRow>): TournamentActivityRow {
  return {
    id: '0',
    table_name: 'fixtures',
    action: 'insert',
    occurred_at: '2026-05-04T00:00:00.000Z',
    actor_display_name: null,
    changed_fields: null,
    cpi_enabled: null,
    europe_score: null,
    fixture_name: null,
    hole_number: null,
    outcome: null,
    player_name: null,
    segment_kind: null,
    segment_name: null,
    tournament_is_complete: null,
    usa_score: null,
    ...overrides,
  } as TournamentActivityRow;
}

function createHoleScore(overrides: Partial<HoleScoreView>): HoleScoreView {
  return {
    cpi_applied: false,
    cpi_difference: 0,
    cpi_strokes_europe: 0,
    cpi_strokes_usa: 0,
    created_at: '2026-05-04T00:00:00.000Z',
    europe_net_score: null,
    europe_score: null,
    hole_number: 1,
    id: 'score-1',
    outcome: 'unplayed',
    segment_id: 'segment-1',
    stroke_index: 1,
    updated_at: '2026-05-04T00:00:00.000Z',
    updated_by: null,
    updatedByProfile: null,
    usa_net_score: null,
    usa_score: null,
    ...overrides,
  };
}
