import {
  calculateWinProbability,
  type WinProbabilityForecast,
  type WinProbabilityFixtureInput,
  type WinProbabilityInput,
  type WinProbabilitySegmentInput,
} from '../../domain/2026/winProbability';
import { isOneVOneFixture } from '../../domain/2026/points';
import type {
  FixtureView,
  PlayerRow,
  SegmentView,
  TournamentRow,
} from '../../services/tournament2026Queries';

export function buildWinProbabilityInput({
  fixtures,
  players,
  tournament,
}: {
  fixtures: FixtureView[];
  players: PlayerRow[];
  tournament: TournamentRow | null;
}): WinProbabilityInput {
  const playerLookup = new Map(players.map((player) => [player.id, player]));

  return {
    cpiThreshold: tournament?.cpi_threshold ?? null,
    fixtures: fixtures.map((fixture) => ({
      id: fixture.id,
      isOneVOne: isOneVOneFixture(fixture),
      segments: fixture.segments.map((segment) => buildSegmentInput(segment, playerLookup)),
    }) satisfies WinProbabilityFixtureInput),
    segments: fixtures.flatMap((fixture) =>
      fixture.segments.map((segment) => buildSegmentInput(segment, playerLookup))
    ),
  };
}

export function buildWinPressureForecast({
  fixtures,
  players,
  tournament,
}: {
  fixtures: FixtureView[];
  players: PlayerRow[];
  tournament: TournamentRow | null;
}): WinProbabilityForecast {
  return calculateWinProbability(buildWinProbabilityInput({ fixtures, players, tournament }));
}

function buildSegmentInput(
  segment: SegmentView,
  playerLookup: Map<string, PlayerRow>
): WinProbabilitySegmentInput {
  const usaPlayer = segment.usa_player_id ? playerLookup.get(segment.usa_player_id) : null;
  const europePlayer = segment.europe_player_id ? playerLookup.get(segment.europe_player_id) : null;

  return {
    id: segment.id,
    name: segment.name,
    kind: segment.kind,
    holeStart: segment.hole_start,
    holeEnd: segment.hole_end,
    cpiEnabled: segment.cpi_enabled,
    usaPlayerCpi: usaPlayer?.current_cpi ?? null,
    europePlayerCpi: europePlayer?.current_cpi ?? null,
    holeScores: segment.holeScores.map((score) => ({
      holeNumber: score.hole_number,
      outcome: score.outcome,
      usaScore: score.usa_score,
      europeScore: score.europe_score,
      usaNetScore: score.usa_net_score,
      europeNetScore: score.europe_net_score,
    })),
  };
}
