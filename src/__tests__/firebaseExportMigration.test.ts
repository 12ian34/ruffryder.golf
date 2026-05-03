import { describe, expect, it } from 'vitest';
import {
  mapFirebaseGame,
  mapFirebaseCourseHoles,
  mapFirebasePlayer,
  mapFirebaseTournament,
  mapFirebaseUserToProfile,
  mapHistoricalScoresToStats,
  validateFirebaseExportCounts,
} from '../domain/migration/firebaseExport';

describe('Firebase export migration mapping', () => {
  it('maps Firebase players to Supabase player inserts', () => {
    expect(
      mapFirebasePlayer({
        id: 'legacy-player-1',
        data: {
          name: 'Ian',
          team: 'USA',
          averageScore: 88,
          customEmoji: '🦅',
          historicalScores: [],
        },
      })
    ).toEqual({
      legacy_firebase_id: 'legacy-player-1',
      name: 'Ian',
      team: 'USA',
      current_cpi: 88,
      custom_emoji: '🦅',
    });
  });

  it('maps Firebase users to profiles with Supabase auth ids and linked player ids', () => {
    const profile = mapFirebaseUserToProfile(
      {
        id: 'firebase-user-1',
        data: {
          email: 'ian@example.com',
          name: 'Ian',
          isAdmin: true,
          linkedPlayerId: 'legacy-player-1',
          team: 'USA',
        },
      },
      new Map([['firebase-user-1', 'auth-user-1']]),
      new Map([['legacy-player-1', 'player-1']])
    );

    expect(profile).toMatchObject({
      id: 'auth-user-1',
      firebase_uid: 'firebase-user-1',
      email: 'ian@example.com',
      display_name: 'Ian',
      is_admin: true,
      linked_player_id: 'player-1',
      team: 'USA',
    });
  });

  it('maps old tournament totals with raw and legacy adjusted results', () => {
    const tournament = mapFirebaseTournament({
      id: 'legacy-tournament-1',
      data: {
        name: '2025 Ruff Ryders Cup',
        year: 2025,
        isComplete: true,
        totalScore: {
          raw: { USA: 10, EUROPE: 8 },
          adjusted: { USA: 9, EUROPE: 9 },
        },
        projectedScore: {
          raw: { USA: 10, EUROPE: 8 },
          adjusted: { USA: 9, EUROPE: 9 },
        },
      },
    });

    expect(tournament).toMatchObject({
      legacy_firebase_id: 'legacy-tournament-1',
      name: '2025 Ruff Ryders Cup',
      year: 2025,
      is_complete: true,
      total_raw_usa: 10,
      total_raw_europe: 8,
      total_legacy_adjusted_usa: 9,
      total_legacy_adjusted_europe: 9,
    });
  });

  it('maps old game raw and legacy adjusted score details', () => {
    const game = mapFirebaseGame(
      {
        id: 'legacy-game-1',
        data: {
          usaPlayerId: 'legacy-usa-1',
          europePlayerId: 'legacy-europe-1',
          usaPlayerName: 'Ian',
          europePlayerName: 'Tom',
          status: 'complete',
          useHandicaps: true,
          handicapStrokes: 7,
          higherHandicapTeam: 'USA',
          strokePlayScore: {
            USA: 90,
            EUROPE: 84,
            adjustedUSA: 90,
            adjustedEUROPE: 91,
          },
          matchPlayScore: {
            USA: 8,
            EUROPE: 7,
            adjustedUSA: 9,
            adjustedEUROPE: 6,
          },
          points: {
            raw: { USA: 1, EUROPE: 1 },
            adjusted: { USA: 2, EUROPE: 0 },
          },
          holes: [{ holeNumber: 1, usaPlayerScore: 5, europePlayerScore: 4 }],
        },
      },
      'legacy-tournament-row-1',
      new Map([
        ['legacy-usa-1', 'usa-1'],
        ['legacy-europe-1', 'europe-1'],
      ])
    );

    expect(game).toMatchObject({
      legacy_firebase_id: 'legacy-game-1',
      legacy_tournament_id: 'legacy-tournament-row-1',
      usa_player_id: 'usa-1',
      europe_player_id: 'europe-1',
      use_legacy_handicap: true,
      stroke_raw_usa: 90,
      stroke_raw_europe: 84,
      stroke_legacy_adjusted_usa: 90,
      stroke_legacy_adjusted_europe: 91,
      points_raw_usa: 1,
      points_raw_europe: 1,
      points_legacy_adjusted_usa: 2,
      points_legacy_adjusted_europe: 0,
    });
  });

  it('maps heterogeneous historical scores into player tournament stats', () => {
    const stats = mapHistoricalScoresToStats(
      {
        id: 'legacy-player-1',
        data: {
          name: 'Ian',
          team: 'USA',
          historicalScores: [
            { year: 2024, score: 88 },
            {
              year: 2025,
              score: 86,
              tournamentId: 'legacy-tournament-1',
              totalStrokes: 172,
              holesWon: 10,
            },
          ],
        },
      },
      'player-1',
      new Map([['legacy-tournament-1', 'tournament-1']])
    );

    expect(stats).toHaveLength(2);
    expect(stats[1]).toMatchObject({
      id: expect.any(String),
      player_id: 'player-1',
      tournament_id: null,
      source: 'migrated_firestore',
      completion_year: 2025,
      singles_strokes: 172,
      singles_average: 86,
      holes_won: 10,
      cpi_after: 86,
      completed_at: '2025-12-31T00:00:00.000Z',
    });
  });

  it('maps Firebase course config into Supabase course holes', () => {
    const courseHoles = mapFirebaseCourseHoles(
      [
        { id: 'holeDistances', data: { indices: [157, 124] } },
        { id: 'strokeIndices', data: { indices: [3, 7] } },
      ],
      {
        tournament1: [
          {
            id: 'game1',
            data: {
              usaPlayerName: 'Ian',
              europePlayerName: 'Tom',
              holes: [
                { holeNumber: 1, parScore: 4 },
                { holeNumber: 2, parScore: 3 },
              ],
            },
          },
        ],
      }
    );

    expect(courseHoles.slice(0, 2)).toEqual([
      { hole_number: 1, stroke_index: 3, par: 4, yardage: 157 },
      { hole_number: 2, stroke_index: 7, par: 3, yardage: 124 },
    ]);
  });

  it('warns about empty or incomplete export counts', () => {
    const result = validateFirebaseExportCounts({
      players: [],
      tournaments: [{ id: 'legacy-tournament-1', data: { name: 'Empty', year: 2025 } }],
      gamesByTournamentId: {},
    });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toContain('No players found in Firebase export');
    expect(result.warnings).toContain('Tournament legacy-tournament-1 has no exported games');
  });
});
