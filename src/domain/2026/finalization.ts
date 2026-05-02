import type { Json } from '../../types/supabase';

type Team = 'USA' | 'EUROPE';
type HoleOutcome = Team | 'halved' | 'unplayed';
type SegmentKind = 'foursomes' | 'singles';

export interface FinalizationTournament {
  id: string;
  year: number;
}

export interface FinalizationPlayer {
  id: string;
  current_cpi: number | null;
}

export interface FinalizationHoleScore {
  hole_number: number;
  usa_score: number | null;
  europe_score: number | null;
  outcome: HoleOutcome;
}

export interface FinalizationSegment {
  kind: SegmentKind;
  name: string | null;
  hole_start: number;
  hole_end: number;
  usa_player_id: string | null;
  europe_player_id: string | null;
  holeScores: FinalizationHoleScore[];
}

export interface FinalizationFixture {
  name: string | null;
  sort_order: number;
  segments: FinalizationSegment[];
}

export interface PlayerTournamentStatDraft {
  player_id: string;
  tournament_id: string;
  source: 'app';
  completion_year: number;
  singles_holes_played: number;
  singles_strokes: number;
  singles_average: number | null;
  holes_won: number;
  holes_halved: number;
  cpi_after: number | null;
  legacy_payload: Json;
  completed_at: string;
}

export interface PlayerCpiUpdate {
  playerId: string;
  currentCpi: number;
}

export interface TournamentFinalizationDraft {
  missingScores: string[];
  stats: PlayerTournamentStatDraft[];
  playerCpiUpdates: PlayerCpiUpdate[];
}

interface MutablePlayerStat {
  playerId: string;
  singlesHolesPlayed: number;
  singlesStrokes: number;
  holesWon: number;
  holesHalved: number;
}

export function buildTournamentFinalizationDraft({
  tournament,
  players,
  fixtures,
  completedAt,
}: {
  tournament: FinalizationTournament;
  players: FinalizationPlayer[];
  fixtures: FinalizationFixture[];
  completedAt: string;
}): TournamentFinalizationDraft {
  const missingScores = findMissingScores(fixtures);

  if (missingScores.length > 0) {
    return { missingScores, stats: [], playerCpiUpdates: [] };
  }

  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const mutableStats = new Map<string, MutablePlayerStat>();

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      if (segment.kind !== 'singles' || !segment.usa_player_id || !segment.europe_player_id) {
        continue;
      }

      for (const score of segment.holeScores) {
        if (score.usa_score === null || score.europe_score === null) {
          continue;
        }

        const usaStat = getMutableStat(mutableStats, segment.usa_player_id);
        const europeStat = getMutableStat(mutableStats, segment.europe_player_id);

        usaStat.singlesHolesPlayed += 1;
        usaStat.singlesStrokes += score.usa_score;
        europeStat.singlesHolesPlayed += 1;
        europeStat.singlesStrokes += score.europe_score;

        if (score.outcome === 'USA') {
          usaStat.holesWon += 1;
        } else if (score.outcome === 'EUROPE') {
          europeStat.holesWon += 1;
        } else if (score.outcome === 'halved') {
          usaStat.holesHalved += 1;
          europeStat.holesHalved += 1;
        }
      }
    }
  }

  const stats = Array.from(mutableStats.values())
    .filter((stat) => stat.singlesHolesPlayed > 0)
    .map((stat) => {
      const singlesAverage = roundToTwo(stat.singlesStrokes / stat.singlesHolesPlayed);
      const cpiAfter = roundToTwo((stat.singlesStrokes / stat.singlesHolesPlayed) * 18);

      return {
        player_id: stat.playerId,
        tournament_id: tournament.id,
        source: 'app' as const,
        completion_year: tournament.year,
        singles_holes_played: stat.singlesHolesPlayed,
        singles_strokes: stat.singlesStrokes,
        singles_average: singlesAverage,
        holes_won: stat.holesWon,
        holes_halved: stat.holesHalved,
        cpi_after: cpiAfter,
        completed_at: completedAt,
        legacy_payload: {
          rules_version: '2026',
          cpi_basis: 'back_nine_singles_18_hole_equivalent',
          cpi_before: playerLookup.get(stat.playerId)?.current_cpi ?? null,
        },
      };
    });

  return {
    missingScores,
    stats,
    playerCpiUpdates: stats.flatMap((stat) =>
      stat.cpi_after === null ? [] : [{ playerId: stat.player_id, currentCpi: stat.cpi_after }]
    ),
  };
}

function findMissingScores(fixtures: FinalizationFixture[]): string[] {
  const missingScores: string[] = [];

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      const scoresByHole = new Map(segment.holeScores.map((score) => [score.hole_number, score]));

      for (let holeNumber = segment.hole_start; holeNumber <= segment.hole_end; holeNumber += 1) {
        const score = scoresByHole.get(holeNumber);

        if (
          !score ||
          score.usa_score === null ||
          score.europe_score === null ||
          score.outcome === 'unplayed'
        ) {
          missingScores.push(formatMissingScore(fixture, segment, holeNumber));
        }
      }
    }
  }

  return missingScores;
}

function formatMissingScore(
  fixture: FinalizationFixture,
  segment: FinalizationSegment,
  holeNumber: number
): string {
  const fixtureName = fixture.name ?? `Fixture ${fixture.sort_order + 1}`;
  const segmentName = segment.name ?? (segment.kind === 'foursomes' ? 'Foursomes' : 'Singles');

  return `${fixtureName} / ${segmentName} / H${holeNumber}`;
}

function getMutableStat(
  stats: Map<string, MutablePlayerStat>,
  playerId: string
): MutablePlayerStat {
  const existing = stats.get(playerId);

  if (existing) {
    return existing;
  }

  const created = {
    playerId,
    singlesHolesPlayed: 0,
    singlesStrokes: 0,
    holesWon: 0,
    holesHalved: 0,
  };

  stats.set(playerId, created);
  return created;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
