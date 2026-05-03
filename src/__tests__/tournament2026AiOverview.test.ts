import { describe, expect, it } from 'vitest';
import {
  AI_NEWSROOM_ARTIFACT_KINDS,
  buildAiNewsroomArtifactContext,
  buildAiPlayerOverviewContext,
  countScoredTournamentHoles,
  missingNewsroomKinds,
  shouldRegenerateNewsroomArtifacts,
  shouldRegenerateTournamentOverview,
} from '../features/tournament2026/aiOverview';
import type { AiRecapSnapshot } from '../features/tournament2026/aiRecap';
import type {
  AiNewsroomArtifactRow,
  AiTournamentOverviewRow,
  FixtureView,
  HoleScoreView,
  PlayerRow,
  PlayerTournamentStatsRow,
} from '../services/tournament2026Queries';

const timestamp = '2026-05-03T12:00:00.000Z';

describe('2026 AI overview helpers', () => {
  it('builds compact player overview context from player history', () => {
    const player = createPlayer('player-1', 'Ian', 'EUROPE');
    const context = buildAiPlayerOverviewContext(player, [
      createStat('stat-2025', 'player-1', 2025, 90),
      createStat('stat-2026', 'player-1', 2026, 84),
      createStat('other', 'player-2', 2026, 72),
    ]);

    expect(context.player).toEqual({
      id: 'player-1',
      name: 'Ian',
      team: 'EUROPE',
      currentCpi: 82,
      customEmoji: null,
    });
    expect(context.history.map((row) => row.year)).toEqual([2026, 2025]);
    expect(context.history[0]).toMatchObject({
      singlesAverage: 4.67,
      holesWon: 4,
      cpiAfter: 84,
    });
  });

  it('counts scored tournament holes across fixtures and segments', () => {
    expect(countScoredTournamentHoles([fixture])).toBe(5);
  });

  it('regenerates tournament overview when five new holes have been saved', () => {
    expect(shouldRegenerateTournamentOverview({ overview: null, scoredHoleCount: 0 })).toBe(true);
    expect(shouldRegenerateTournamentOverview({ overview: null, scoredHoleCount: 1 })).toBe(true);
    expect(
      shouldRegenerateTournamentOverview({
        overview: createTournamentOverview(3),
        scoredHoleCount: 7,
      })
    ).toBe(false);
    expect(
      shouldRegenerateTournamentOverview({
        overview: createTournamentOverview(3),
        scoredHoleCount: 8,
      })
    ).toBe(true);
  });

  it('builds newsroom context for all requested artifact kinds', () => {
    const snapshot = createSnapshot();
    const context = buildAiNewsroomArtifactContext({
      snapshot,
      scoredHoleCount: 5,
    });

    expect(context.snapshot).toBe(snapshot);
    expect(context.scoredHoleCount).toBe(5);
    expect(context.requestedKinds).toEqual([...AI_NEWSROOM_ARTIFACT_KINDS]);
  });

  it('regenerates newsroom artifacts when cards are missing or five new holes are saved', () => {
    const completeArtifacts = AI_NEWSROOM_ARTIFACT_KINDS.map((kind) =>
      createNewsroomArtifact(kind, 5)
    );
    const incompleteArtifacts = completeArtifacts.slice(1);

    expect(missingNewsroomKinds(incompleteArtifacts)).toEqual(['highlights_commentary']);
    expect(
      shouldRegenerateNewsroomArtifacts({
        artifacts: incompleteArtifacts,
        scoredHoleCount: 5,
      })
    ).toBe(true);
    expect(
      shouldRegenerateNewsroomArtifacts({
        artifacts: completeArtifacts,
        scoredHoleCount: 9,
      })
    ).toBe(false);
    expect(
      shouldRegenerateNewsroomArtifacts({
        artifacts: completeArtifacts,
        scoredHoleCount: 10,
      })
    ).toBe(true);
  });
});

const fixture: FixtureView = {
  created_at: timestamp,
  id: 'fixture-1',
  name: 'Match 1',
  sort_order: 0,
  status: 'in_progress',
  tournament_id: 'tournament-1',
  updated_at: timestamp,
  participants: [],
  segments: [
    createSegment('segment-1', [
      createScore('score-1', 1, 'USA'),
      createScore('score-2', 2, 'EUROPE'),
      createScore('score-3', 3, 'halved'),
    ]),
    createSegment('segment-2', [
      createScore('score-4', 10, 'USA'),
      createScore('score-5', 11, 'unplayed'),
      createScore('score-6', 12, 'EUROPE'),
    ]),
  ],
};

function createSegment(id: string, holeScores: HoleScoreView[]): FixtureView['segments'][number] {
  return {
    cpi_enabled: true,
    created_at: timestamp,
    europe_player_id: 'europe-1',
    fixture_id: 'fixture-1',
    hole_end: 18,
    hole_start: 1,
    id,
    kind: 'singles',
    name: null,
    sort_order: 0,
    updated_at: timestamp,
    usa_player_id: 'usa-1',
    players: [],
    holeScores,
  };
}

function createScore(id: string, holeNumber: number, outcome: HoleScoreView['outcome']): HoleScoreView {
  return {
    cpi_applied: false,
    cpi_difference: 0,
    cpi_strokes_europe: 0,
    cpi_strokes_usa: 0,
    created_at: timestamp,
    europe_net_score: 5,
    europe_score: 5,
    hole_number: holeNumber,
    id,
    outcome,
    segment_id: 'segment-1',
    stroke_index: 1,
    updated_at: timestamp,
    updated_by: null,
    updatedByProfile: null,
    usa_net_score: 4,
    usa_score: 4,
  };
}

function createPlayer(id: string, name: string, team: PlayerRow['team']): PlayerRow {
  return {
    created_at: timestamp,
    current_cpi: 82,
    custom_emoji: null,
    id,
    legacy_firebase_id: null,
    name,
    team,
    updated_at: timestamp,
  };
}

function createStat(
  id: string,
  playerId: string,
  year: number,
  cpiAfter: number
): PlayerTournamentStatsRow {
  return {
    completed_at: timestamp,
    completion_year: year,
    cpi_after: cpiAfter,
    created_at: timestamp,
    holes_halved: 1,
    holes_won: 4,
    id,
    legacy_payload: {},
    player_id: playerId,
    singles_average: 4.67,
    singles_holes_played: 9,
    singles_strokes: 42,
    source: 'app',
    tournament_id: 'tournament-1',
  };
}

function createTournamentOverview(sourceHoleScoreCount: number): AiTournamentOverviewRow {
  return {
    created_at: timestamp,
    generated_at: timestamp,
    generated_by: 'profile-1',
    id: 'overview-1',
    overview_markdown: '**Reuters understands...**',
    source_hole_score_count: sourceHoleScoreCount,
    source_snapshot: {},
    tournament_id: 'tournament-1',
    updated_at: timestamp,
  };
}

function createSnapshot(): AiRecapSnapshot {
  return {
    version: 1,
    generatedAt: timestamp,
    tournament: {
      name: 'Ruff Ryders Cup',
      year: 2026,
      isComplete: false,
      cpiThreshold: 7,
    },
    totals: {
      overall: { USA: 1, EUROPE: 1, halved: 0, unplayed: 0 },
      foursomes: { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 },
      singles: { USA: 1, EUROPE: 1, halved: 0, unplayed: 0 },
    },
    highlights: ['Ian birdied H10.'],
    recentMovement: [],
    fixtures: [],
  };
}

function createNewsroomArtifact(
  kind: AiNewsroomArtifactRow['kind'],
  sourceHoleScoreCount: number
): AiNewsroomArtifactRow {
  return {
    body_markdown: '**Newsroom copy**',
    created_at: timestamp,
    generated_at: timestamp,
    generated_by: 'profile-1',
    id: `artifact-${kind}`,
    kind,
    source_hash: 'hash',
    source_hole_score_count: sourceHoleScoreCount,
    source_snapshot: {},
    title: kind,
    tournament_id: 'tournament-1',
    updated_at: timestamp,
  };
}
