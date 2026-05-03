import { describe, expect, it } from 'vitest';
import { buildHoleScorePayload } from '../domain/2026/persistence';

describe('2026 score persistence helpers', () => {
  it('builds a hole_scores row for a foursomes hole without CPI', () => {
    const payload = buildHoleScorePayload({
      segmentId: 'segment-1',
      segmentKind: 'foursomes',
      hole: { holeNumber: 1, strokeIndex: 3, usaScore: 4, europeScore: 5 },
      updatedBy: 'profile-1',
    });

    expect(payload.scoredHole.outcome).toBe('USA');
    expect(payload.row).toMatchObject({
      segment_id: 'segment-1',
      hole_number: 1,
      stroke_index: 3,
      usa_score: 4,
      europe_score: 5,
      usa_net_score: 4,
      europe_net_score: 5,
      outcome: 'USA',
      cpi_applied: false,
      cpi_difference: 0,
      cpi_strokes_usa: 0,
      cpi_strokes_europe: 0,
      updated_by: 'profile-1',
    });
  });

  it('builds a hole_scores row for a singles hole with CPI net scores', () => {
    const payload = buildHoleScorePayload({
      segmentId: 'segment-2',
      segmentKind: 'singles',
      hole: { holeNumber: 10, strokeIndex: 1, usaScore: 5, europeScore: 4 },
      cpi: { usaCpi: 95, europeCpi: 80 },
    });

    expect(payload.scoredHole.outcome).toBe('HALVED');
    expect(payload.row).toMatchObject({
      segment_id: 'segment-2',
      hole_number: 10,
      stroke_index: 1,
      usa_score: 5,
      europe_score: 4,
      usa_net_score: 4,
      europe_net_score: 4,
      outcome: 'halved',
      cpi_applied: true,
      cpi_difference: 15,
      cpi_strokes_usa: 1,
      cpi_strokes_europe: 0,
      updated_by: null,
    });
  });

  it('stores Europe CPI strokes and adjusted outcome when Europe is the higher-CPI player', () => {
    const payload = buildHoleScorePayload({
      segmentId: 'segment-3',
      segmentKind: 'singles',
      hole: { holeNumber: 10, strokeIndex: 1, usaScore: 4, europeScore: 6 },
      cpi: { usaCpi: 80, europeCpi: 105 },
      updatedBy: 'profile-2',
    });

    expect(payload.scoredHole.net).toEqual({ USA: 4, EUROPE: 4 });
    expect(payload.row).toMatchObject({
      usa_score: 4,
      europe_score: 6,
      usa_net_score: 4,
      europe_net_score: 4,
      outcome: 'halved',
      cpi_applied: true,
      cpi_difference: 25,
      cpi_strokes_usa: 0,
      cpi_strokes_europe: 2,
      updated_by: 'profile-2',
    });
  });

  it('persists an applied CPI matchup with zero hole strokes on easier holes', () => {
    const payload = buildHoleScorePayload({
      segmentId: 'segment-4',
      segmentKind: 'singles',
      hole: { holeNumber: 18, strokeIndex: 12, usaScore: 5, europeScore: 4 },
      cpi: { usaCpi: 87, europeCpi: 80 },
    });

    expect(payload.row).toMatchObject({
      hole_number: 18,
      stroke_index: 12,
      usa_net_score: 5,
      europe_net_score: 4,
      outcome: 'EUROPE',
      cpi_applied: true,
      cpi_difference: 7,
      cpi_strokes_usa: 0,
      cpi_strokes_europe: 0,
    });
  });

  it('persists partial score rows as unplayed without dropping entered raw scores', () => {
    const payload = buildHoleScorePayload({
      segmentId: 'segment-5',
      segmentKind: 'singles',
      hole: { holeNumber: 10, strokeIndex: 1, usaScore: 5, europeScore: null },
      cpi: { usaCpi: 95, europeCpi: 80 },
    });

    expect(payload.row).toMatchObject({
      usa_score: 5,
      europe_score: null,
      usa_net_score: 4,
      europe_net_score: null,
      outcome: 'unplayed',
      cpi_applied: true,
      cpi_difference: 15,
      cpi_strokes_usa: 1,
      cpi_strokes_europe: 0,
    });
  });
});
