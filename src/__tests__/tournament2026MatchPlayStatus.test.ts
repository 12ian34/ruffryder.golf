import { describe, expect, it } from 'vitest';
import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../domain/2026/matchPlayStatus';

describe('2026 match play status', () => {
  it('reports not-started segments before any expected holes are scored', () => {
    expect(
      calculateSegmentMatchPlayStatus({
        hole_start: 10,
        hole_end: 12,
        holeScores: [{ hole_number: 9, outcome: 'USA' }],
      })
    ).toEqual({
      state: 'not_started',
      label: 'Not started',
      leader: null,
      margin: 0,
      holesRemaining: 3,
      completedHoles: 0,
      totalHoles: 3,
    });
  });

  it('reports all-square and final-halved states without inventing a leader', () => {
    expect(
      calculateSegmentMatchPlayStatus({
        hole_start: 10,
        hole_end: 12,
        holeScores: [
          { hole_number: 10, outcome: 'USA' },
          { hole_number: 11, outcome: 'EUROPE' },
        ],
      })
    ).toMatchObject({
      state: 'in_progress',
      label: 'All square',
      leader: null,
      holesRemaining: 1,
      completedHoles: 2,
    });

    expect(
      calculateSegmentMatchPlayStatus({
        hole_start: 10,
        hole_end: 12,
        holeScores: [
          { hole_number: 10, outcome: 'USA' },
          { hole_number: 11, outcome: 'EUROPE' },
          { hole_number: 12, outcome: 'halved' },
        ],
      })
    ).toMatchObject({
      state: 'halved',
      label: 'Match halved',
      leader: null,
      holesRemaining: 0,
      completedHoles: 3,
    });
  });

  it('reports in-progress leads before dormie or match-over thresholds', () => {
    expect(
      calculateSegmentMatchPlayStatus({
        hole_start: 10,
        hole_end: 14,
        holeScores: [
          { hole_number: 10, outcome: 'USA' },
          { hole_number: 11, outcome: 'halved' },
        ],
      })
    ).toMatchObject({
      state: 'in_progress',
      label: 'USA 1 up',
      leader: 'USA',
      margin: 1,
      holesRemaining: 3,
      completedHoles: 2,
    });
  });

  it('detects dormie when the lead equals holes remaining', () => {
    expect(
      calculateSegmentMatchPlayStatus({
        hole_start: 10,
        hole_end: 18,
        holeScores: [
          { hole_number: 10, outcome: 'USA' },
          { hole_number: 11, outcome: 'USA' },
          { hole_number: 12, outcome: 'USA' },
          { hole_number: 13, outcome: 'USA' },
          { hole_number: 14, outcome: 'halved' },
        ],
      })
    ).toMatchObject({
      state: 'dormie',
      label: 'USA dormie 4',
      leader: 'USA',
      margin: 4,
      holesRemaining: 4,
      completedHoles: 5,
    });
  });

  it('detects match-over status when the lead is greater than holes remaining', () => {
    expect(
      calculateSegmentMatchPlayStatus({
        hole_start: 10,
        hole_end: 18,
        holeScores: [
          { hole_number: 10, outcome: 'EUROPE' },
          { hole_number: 11, outcome: 'EUROPE' },
          { hole_number: 12, outcome: 'EUROPE' },
          { hole_number: 13, outcome: 'EUROPE' },
          { hole_number: 14, outcome: 'EUROPE' },
          { hole_number: 15, outcome: 'halved' },
        ],
      })
    ).toMatchObject({
      state: 'won',
      label: 'EUROPE wins 5 & 3',
      leader: 'EUROPE',
      margin: 5,
      holesRemaining: 3,
    });
  });

  it('uses a final winning margin label when no holes remain', () => {
    expect(
      calculateSegmentMatchPlayStatus({
        hole_start: 10,
        hole_end: 12,
        holeScores: [
          { hole_number: 10, outcome: 'EUROPE' },
          { hole_number: 11, outcome: 'EUROPE' },
          { hole_number: 12, outcome: 'halved' },
        ],
      })
    ).toMatchObject({
      state: 'won',
      label: 'EUROPE wins by 2',
      leader: 'EUROPE',
      margin: 2,
      holesRemaining: 0,
      completedHoles: 3,
    });
  });

  it('counts missing rows as unplayed fixture progress', () => {
    expect(
      calculateFixtureProgress([
        {
          hole_start: 1,
          hole_end: 2,
          holeScores: [{ hole_number: 1, outcome: 'USA' }],
        },
        {
          hole_start: 10,
          hole_end: 11,
          holeScores: [{ hole_number: 10, outcome: 'halved' }],
        },
      ])
    ).toEqual({ completedHoles: 2, totalHoles: 4, percent: 50 });
  });
});
