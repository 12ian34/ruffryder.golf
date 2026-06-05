import { describe, expect, it } from 'vitest';
import {
  calculateTotals,
  createHoleRange,
  filterFixturesForScoreEntry,
  formatOutcome,
  formatParticipants,
  formatSegmentKind,
  formatSegmentMatchup,
  getErrorMessage,
  parseOptionalPositiveInteger,
} from '../features/tournament2026/viewUtils';
import type {
  FixtureView,
  HoleScoreRow,
  PlayerRow,
  ProfileRow,
} from '../services/tournament2026Queries';

describe('2026 view utilities', () => {
  it('calculates overall, foursomes, and singles totals from saved outcomes', () => {
    expect(calculateTotals([fixture])).toEqual({
      overall: { USA: 1, EUROPE: 1, halved: 1, unplayed: 1 },
      foursomes: { USA: 1, EUROPE: 0, halved: 1, unplayed: 0 },
      singles: { USA: 0, EUROPE: 1, halved: 0, unplayed: 1 },
    });
  });

  it('filters score-entry fixtures to the linked player only', () => {
    expect(
      filterFixturesForScoreEntry([fixture], {
        linked_player_id: 'usa-1',
      } as ProfileRow)
    ).toEqual([fixture]);
    expect(
      filterFixturesForScoreEntry([fixture], {
        linked_player_id: 'missing-player',
      } as ProfileRow)
    ).toEqual([]);
    expect(
      filterFixturesForScoreEntry([fixture], {
        linked_player_id: null,
      } as ProfileRow)
    ).toEqual([]);
  });

  it('formats participants and segment matchups with roster-side context', () => {
    expect(formatParticipants(fixture.participants)).toBe(
      'USA: Ian | EUROPE side: Sam (USA) | EUROPE: Tommy'
    );
    expect(formatSegmentKind('foursomes')).toBe('Front 9 Foursomes');
    expect(formatSegmentKind('singles')).toBe('Singles Match');
    expect(formatSegmentMatchup(fixture.segments[0], players)).toBe('Ian vs Tommy');
    expect(formatSegmentMatchup(fixture.segments[1], players)).toBe('Ian + Side A vs Tommy');
  });

  it('formats compact hole ranges, outcomes, and generic errors for UI copy', () => {
    expect(createHoleRange(3, 5)).toEqual([3, 4, 5]);
    expect(parseOptionalPositiveInteger('')).toBeNull();
    expect(parseOptionalPositiveInteger('12')).toBe(12);
    expect(formatOutcome('USA', { usa: 'Ian', europe: 'Tommy' })).toBe('Ian wins');
    expect(formatOutcome('EUROPE', { usa: 'Ian', europe: 'Tommy' })).toBe('Tommy wins');
    expect(formatOutcome('halved')).toBe('Halved');
    expect(formatOutcome('unplayed')).toBe('Unplayed');
    expect(getErrorMessage(new Error('Nope'))).toBe('Nope');
    expect(getErrorMessage('plain string')).toBe('Something went wrong');
  });
});

const players = [
  { id: 'usa-1', name: 'Ian' },
  { id: 'europe-1', name: 'Tommy' },
] as PlayerRow[];

const fixture = {
  participants: [
    { player_id: 'usa-1', team: 'USA', player: { name: 'Ian', team: 'USA' } },
    { player_id: 'usa-2', team: 'EUROPE', player: { name: 'Sam', team: 'USA' } },
    { player_id: 'europe-1', team: 'EUROPE', player: { name: 'Tommy', team: 'EUROPE' } },
  ],
  segments: [
    {
      kind: 'singles',
      usa_player_id: 'usa-1',
      europe_player_id: 'europe-1',
      holeScores: [
        createScore('EUROPE'),
        createScore('unplayed'),
      ],
    },
    {
      kind: 'foursomes',
      players: [
        { team: 'USA', player: { name: 'Ian' } },
        { team: 'USA', player: null },
        { team: 'EUROPE', player: { name: 'Tommy' } },
      ],
      holeScores: [
        createScore('USA'),
        createScore('halved'),
      ],
    },
  ],
} as unknown as FixtureView;

function createScore(outcome: HoleScoreRow['outcome']): HoleScoreRow {
  return { outcome } as HoleScoreRow;
}
