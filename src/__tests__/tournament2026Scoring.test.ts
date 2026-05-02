import { describe, expect, it } from 'vitest';
import {
  calculateCpiStrokesForHole,
  isPlayerHistoryEligibleSegment,
  scoreFoursomesHole,
  scoreSinglesHole,
  summarizeFixtureHoles,
} from '../domain/2026/scoring';
import { getCourseStrokeIndex } from '../domain/2026/course';

describe('2026 tournament scoring', () => {
  describe('CPI threshold', () => {
    it('uses the configured course stroke indices for back-nine holes', () => {
      expect(getCourseStrokeIndex(10)).toBe(6);
      expect(getCourseStrokeIndex(11)).toBe(2);
      expect(getCourseStrokeIndex(18)).toBe(12);
    });

    it('does not apply CPI below the default 7-stroke threshold', () => {
      const result = calculateCpiStrokesForHole(
        { usaCpi: 86, europeCpi: 80 },
        1
      );

      expect(result.applies).toBe(false);
      expect(result.difference).toBe(6);
      expect(result.strokes).toEqual({ USA: 0, EUROPE: 0 });
    });

    it('applies CPI at the default 7-stroke threshold', () => {
      const result = calculateCpiStrokesForHole(
        { usaCpi: 87, europeCpi: 80 },
        1
      );

      expect(result.applies).toBe(true);
      expect(result.difference).toBe(7);
      expect(result.higherCpiTeam).toBe('USA');
      expect(result.strokes).toEqual({ USA: 1, EUROPE: 0 });
    });

    it('subtracts CPI strokes from the higher-CPI singles player net score', () => {
      const result = scoreSinglesHole(
        { holeNumber: 10, strokeIndex: 1, usaScore: 5, europeScore: 4 },
        { usaCpi: 95, europeCpi: 80 }
      );

      expect(result.cpi.applies).toBe(true);
      expect(result.net).toEqual({ USA: 4, EUROPE: 4 });
      expect(result.outcome).toBe('HALVED');
    });

    it('subtracts CPI strokes from the higher-CPI Europe player net score', () => {
      const result = scoreSinglesHole(
        { holeNumber: 11, strokeIndex: 1, usaScore: 4, europeScore: 5 },
        { usaCpi: 80, europeCpi: 95 }
      );

      expect(result.cpi.applies).toBe(true);
      expect(result.cpi.higherCpiTeam).toBe('EUROPE');
      expect(result.net).toEqual({ USA: 4, EUROPE: 4 });
      expect(result.outcome).toBe('HALVED');
    });
  });

  describe('foursomes scoring', () => {
    it('awards the hole to the lower combined team score', () => {
      const result = scoreFoursomesHole({
        holeNumber: 1,
        strokeIndex: 4,
        usaScore: 4,
        europeScore: 5,
      });

      expect(result.raw).toEqual({ USA: 4, EUROPE: 5 });
      expect(result.outcome).toBe('USA');
    });

    it('never applies CPI to front-nine foursomes', () => {
      const result = scoreFoursomesHole({
        holeNumber: 1,
        strokeIndex: 1,
        usaScore: 5,
        europeScore: 4,
      });

      expect(result.segmentKind).toBe('foursomes');
      expect(result.cpi.applies).toBe(false);
      expect(result.net).toEqual({ USA: 5, EUROPE: 4 });
      expect(result.outcome).toBe('EUROPE');
    });

    it('shows tied holes as halved', () => {
      const result = scoreFoursomesHole({
        holeNumber: 2,
        strokeIndex: 8,
        usaScore: 4,
        europeScore: 4,
      });

      expect(result.outcome).toBe('HALVED');
    });
  });

  describe('fixture summary', () => {
    it('counts halved holes without awarding holes won to either team', () => {
      const holes = [
        scoreFoursomesHole({ holeNumber: 1, strokeIndex: 1, usaScore: 4, europeScore: 5 }),
        scoreFoursomesHole({ holeNumber: 2, strokeIndex: 2, usaScore: 5, europeScore: 4 }),
        scoreFoursomesHole({ holeNumber: 3, strokeIndex: 3, usaScore: 4, europeScore: 4 }),
        scoreFoursomesHole({ holeNumber: 4, strokeIndex: 4, usaScore: null, europeScore: null }),
      ];

      expect(summarizeFixtureHoles(holes)).toEqual({
        USA: 1,
        EUROPE: 1,
        halved: 1,
        unplayed: 1,
        completed: 3,
      });
    });
  });

  describe('player history eligibility', () => {
    it('uses only back-nine singles for player history and CPI updates', () => {
      expect(isPlayerHistoryEligibleSegment('foursomes')).toBe(false);
      expect(isPlayerHistoryEligibleSegment('singles')).toBe(true);
    });
  });
});
