import { describe, expect, it } from 'vitest';
import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../domain/2026/matchPlayStatus';

describe('2026 match play status', () => {
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
