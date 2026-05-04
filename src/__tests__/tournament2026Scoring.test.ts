import { describe, expect, it } from 'vitest';
import {
  calculateCpiStrokesForHole,
  isPlayerHistoryEligibleSegment,
  scoreFoursomesHole,
  scoreMatchHole,
  scoreSinglesHole,
  summarizeFixtureHoles,
} from '../domain/2026/scoring';
import {
  DEFAULT_COURSE_HOLES,
  getCourseStrokeIndex,
  getDefaultCourseHole,
} from '../domain/2026/course';

describe('2026 tournament scoring', () => {
  describe('CPI threshold', () => {
    it('uses the configured course stroke indices for back-nine holes', () => {
      expect(getCourseStrokeIndex(10)).toBe(6);
      expect(getCourseStrokeIndex(11)).toBe(2);
      expect(getCourseStrokeIndex(18)).toBe(12);
    });

    it('keeps default course metadata aligned with the 18 configured stroke indices', () => {
      expect(DEFAULT_COURSE_HOLES).toHaveLength(18);
      expect(getDefaultCourseHole(1)).toEqual({
        holeNumber: 1,
        strokeIndex: 3,
        par: 3,
        yardage: null,
      });
      expect(getDefaultCourseHole(18)).toEqual({
        holeNumber: 18,
        strokeIndex: 12,
        par: 3,
        yardage: null,
      });
    });

    it('rejects hole numbers outside the course metadata range', () => {
      for (const holeNumber of [0, 19]) {
        expect(() => getCourseStrokeIndex(holeNumber)).toThrow(`Invalid hole number: ${holeNumber}`);
        expect(() => getDefaultCourseHole(holeNumber)).toThrow(`Invalid hole number: ${holeNumber}`);
      }
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

    it('does not apply CPI unless both players have a numeric CPI', () => {
      const missingCpiInputs = [
        { usaCpi: null, europeCpi: 80 },
        { usaCpi: 95, europeCpi: null },
        { usaCpi: undefined, europeCpi: 80 },
        { usaCpi: 95, europeCpi: undefined },
      ];

      for (const cpi of missingCpiInputs) {
        expect(calculateCpiStrokesForHole(cpi, 1)).toMatchObject({
          applies: false,
          difference: 0,
          higherCpiTeam: null,
          strokes: { USA: 0, EUROPE: 0 },
        });
      }
    });

    it('does not apply CPI when both players have the same CPI', () => {
      expect(calculateCpiStrokesForHole({ usaCpi: 82, europeCpi: 82 }, 1)).toMatchObject({
        applies: false,
        difference: 0,
        higherCpiTeam: null,
        strokes: { USA: 0, EUROPE: 0 },
      });
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

    it('honors a custom CPI threshold', () => {
      expect(calculateCpiStrokesForHole({ usaCpi: 85, europeCpi: 80 }, 1)).toMatchObject({
        applies: false,
        threshold: 7,
      });
      expect(
        calculateCpiStrokesForHole({ usaCpi: 85, europeCpi: 80, threshold: 5 }, 1)
      ).toMatchObject({
        applies: true,
        threshold: 5,
        difference: 5,
        strokes: { USA: 1, EUROPE: 0 },
      });
    });

    it('distributes CPI strokes by stroke index with full cycles and remainder strokes', () => {
      const cpi = { usaCpi: 105, europeCpi: 80 };

      expect(calculateCpiStrokesForHole(cpi, 1).strokes).toEqual({ USA: 2, EUROPE: 0 });
      expect(calculateCpiStrokesForHole(cpi, 7).strokes).toEqual({ USA: 2, EUROPE: 0 });
      expect(calculateCpiStrokesForHole(cpi, 8).strokes).toEqual({ USA: 1, EUROPE: 0 });
      expect(calculateCpiStrokesForHole(cpi, 18).strokes).toEqual({ USA: 1, EUROPE: 0 });
    });

    it('can apply CPI to a matchup while awarding no stroke on easier holes', () => {
      const result = scoreSinglesHole(
        { holeNumber: 18, strokeIndex: 12, usaScore: 5, europeScore: 4 },
        { usaCpi: 87, europeCpi: 80 }
      );

      expect(result.cpi).toMatchObject({
        applies: true,
        difference: 7,
        higherCpiTeam: 'USA',
        strokes: { USA: 0, EUROPE: 0 },
      });
      expect(result.net).toEqual({ USA: 5, EUROPE: 4 });
      expect(result.outcome).toBe('EUROPE');
    });

    it('gives multiple CPI strokes on a hole when the CPI gap exceeds 18', () => {
      const result = scoreSinglesHole(
        { holeNumber: 10, strokeIndex: 1, usaScore: 6, europeScore: 4 },
        { usaCpi: 116, europeCpi: 80 }
      );

      expect(result.cpi.strokes).toEqual({ USA: 2, EUROPE: 0 });
      expect(result.net).toEqual({ USA: 4, EUROPE: 4 });
      expect(result.outcome).toBe('HALVED');
    });

    it('rejects invalid stroke indices before applying CPI', () => {
      for (const strokeIndex of [0, 19, 1.5]) {
        expect(() =>
          calculateCpiStrokesForHole({ usaCpi: 95, europeCpi: 80 }, strokeIndex)
        ).toThrow(`Invalid stroke index: ${strokeIndex}`);
      }
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

    it('keeps a partially entered singles hole unplayed while preserving net score metadata', () => {
      const result = scoreSinglesHole(
        { holeNumber: 10, strokeIndex: 1, usaScore: 5, europeScore: null },
        { usaCpi: 95, europeCpi: 80 }
      );

      expect(result.raw).toEqual({ USA: 5, EUROPE: null });
      expect(result.net).toEqual({ USA: 4, EUROPE: null });
      expect(result.outcome).toBe('UNPLAYED');
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

    it('ignores CPI input when dispatching a foursomes hole through scoreMatchHole', () => {
      const result = scoreMatchHole(
        'foursomes',
        { holeNumber: 1, strokeIndex: 1, usaScore: 5, europeScore: 4 },
        { usaCpi: 95, europeCpi: 80 }
      );

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

  describe('singles scoring', () => {
    it('dispatches singles through scoreMatchHole with CPI applied', () => {
      const result = scoreMatchHole(
        'singles',
        { holeNumber: 11, strokeIndex: 2, usaScore: 5, europeScore: 4 },
        { usaCpi: 95, europeCpi: 80 }
      );

      expect(result.segmentKind).toBe('singles');
      expect(result.cpi.strokes).toEqual({ USA: 1, EUROPE: 0 });
      expect(result.net).toEqual({ USA: 4, EUROPE: 4 });
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

    it('summarizes CPI-adjusted singles outcomes the same way as foursomes outcomes', () => {
      const holes = [
        scoreSinglesHole(
          { holeNumber: 10, strokeIndex: 1, usaScore: 5, europeScore: 4 },
          { usaCpi: 95, europeCpi: 80 }
        ),
        scoreSinglesHole(
          { holeNumber: 11, strokeIndex: 2, usaScore: 4, europeScore: 5 },
          { usaCpi: 80, europeCpi: 95 }
        ),
        scoreSinglesHole(
          { holeNumber: 12, strokeIndex: 16, usaScore: 5, europeScore: 4 },
          { usaCpi: 95, europeCpi: 80 }
        ),
      ];

      expect(summarizeFixtureHoles(holes)).toEqual({
        USA: 0,
        EUROPE: 1,
        halved: 2,
        unplayed: 0,
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
