import type {
  AiNewsroomArtifactRow,
  AiTournamentOverviewRow,
  FixtureView,
  PlayerRow,
  PlayerTournamentStatsRow,
} from '../../services/tournament2026Queries';
import type { AiRecapSnapshot } from './aiRecap';

export interface AiPlayerOverviewContext {
  player: {
    id: string;
    name: string;
    team: PlayerRow['team'];
    currentCpi: number | null;
    customEmoji: string | null;
  };
  history: AiPlayerHistorySummary[];
}

export interface AiPlayerHistorySummary {
  year: number;
  source: string;
  singlesHolesPlayed: number;
  singlesStrokes: number;
  singlesAverage: number | null;
  holesWon: number;
  holesHalved: number;
  cpiAfter: number | null;
}

export type AiNewsroomArtifactKind = AiNewsroomArtifactRow['kind'];

export interface AiNewsroomArtifactContext {
  snapshot: AiRecapSnapshot;
  scoredHoleCount: number;
  requestedKinds: AiNewsroomArtifactKind[];
}

export const TOURNAMENT_AI_REFRESH_HOLE_INTERVAL = 5;
export const AI_NEWSROOM_REFRESH_HOLE_INTERVAL = 5;
export const AI_NEWSROOM_ARTIFACT_KINDS = [
  'highlights_commentary',
  'moment_of_round',
  'cheese_detector',
  'rivalry_watch',
  'captains_briefing',
  'post_round_report',
] as const satisfies readonly AiNewsroomArtifactKind[];

export function buildAiPlayerOverviewContext(
  player: PlayerRow,
  playerStats: PlayerTournamentStatsRow[]
): AiPlayerOverviewContext {
  return {
    player: {
      id: player.id,
      name: player.name,
      team: player.team,
      currentCpi: player.current_cpi,
      customEmoji: player.custom_emoji,
    },
    history: playerStats
      .filter((stat) => stat.player_id === player.id)
      .sort((a, b) => b.completion_year - a.completion_year)
      .slice(0, 8)
      .map((stat) => ({
        year: stat.completion_year,
        source: stat.source,
        singlesHolesPlayed: stat.singles_holes_played,
        singlesStrokes: stat.singles_strokes,
        singlesAverage: stat.singles_average,
        holesWon: stat.holes_won,
        holesHalved: stat.holes_halved,
        cpiAfter: stat.cpi_after,
      })),
  };
}

export function countScoredTournamentHoles(fixtures: FixtureView[]): number {
  return fixtures.reduce(
    (count, fixture) =>
      count +
      fixture.segments.reduce(
        (segmentCount, segment) =>
          segmentCount + segment.holeScores.filter((score) => score.outcome !== 'unplayed').length,
        0
      ),
    0
  );
}

export function shouldRegenerateTournamentOverview({
  overview,
  scoredHoleCount,
}: {
  overview: AiTournamentOverviewRow | null;
  scoredHoleCount: number;
}): boolean {
  if (scoredHoleCount === 0) {
    return overview === null;
  }

  if (!overview) {
    return true;
  }

  return scoredHoleCount - overview.source_hole_score_count >= TOURNAMENT_AI_REFRESH_HOLE_INTERVAL;
}

export function buildAiNewsroomArtifactContext({
  snapshot,
  scoredHoleCount,
  requestedKinds = [...AI_NEWSROOM_ARTIFACT_KINDS],
}: {
  snapshot: AiRecapSnapshot;
  scoredHoleCount: number;
  requestedKinds?: AiNewsroomArtifactKind[];
}): AiNewsroomArtifactContext {
  return {
    snapshot,
    scoredHoleCount,
    requestedKinds,
  };
}

export function shouldRegenerateNewsroomArtifacts({
  artifacts,
  scoredHoleCount,
}: {
  artifacts: AiNewsroomArtifactRow[];
  scoredHoleCount: number;
}): boolean {
  if (scoredHoleCount === 0) {
    return missingNewsroomKinds(artifacts).length > 0;
  }

  if (missingNewsroomKinds(artifacts).length > 0) {
    return true;
  }

  const oldestSourceCount = Math.min(
    ...AI_NEWSROOM_ARTIFACT_KINDS.map((kind) => {
      const artifact = artifacts.find((item) => item.kind === kind);
      return artifact?.source_hole_score_count ?? 0;
    })
  );

  return scoredHoleCount - oldestSourceCount >= AI_NEWSROOM_REFRESH_HOLE_INTERVAL;
}

export function missingNewsroomKinds(
  artifacts: AiNewsroomArtifactRow[]
): AiNewsroomArtifactKind[] {
  const existingKinds = new Set(artifacts.map((artifact) => artifact.kind));
  return AI_NEWSROOM_ARTIFACT_KINDS.filter((kind) => !existingKinds.has(kind));
}
