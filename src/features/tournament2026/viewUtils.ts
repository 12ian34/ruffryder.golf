import type {
  FixtureView,
  HoleScoreRow,
  PlayerRow,
  ProfileRow,
  SegmentView,
} from '../../services/tournament2026Queries';

export interface TeamScore {
  USA: number;
  EUROPE: number;
  halved: number;
  unplayed: number;
}

export type PlayerTier = 1 | 2 | 3;
type Team = 'USA' | 'EUROPE';

export interface SegmentSideLabels {
  usa: string;
  europe: string;
}

interface SegmentSideLabelOptions {
  fixture?: FixtureView;
  includeTeam?: boolean;
  separator?: string;
}

export function calculateTotals(fixtures: FixtureView[]): {
  overall: TeamScore;
  foursomes: TeamScore;
  singles: TeamScore;
} {
  const totals = {
    overall: createEmptyScore(),
    foursomes: createEmptyScore(),
    singles: createEmptyScore(),
  };

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      const target = segment.kind === 'foursomes' ? totals.foursomes : totals.singles;

      for (const score of segment.holeScores) {
        applyOutcome(target, score.outcome);
        applyOutcome(totals.overall, score.outcome);
      }
    }
  }

  return totals;
}

export function filterFixturesForScoreEntry(
  fixtures: FixtureView[],
  profile: ProfileRow
): FixtureView[] {
  if (!profile.linked_player_id) {
    return [];
  }

  return fixtures.filter((fixture) =>
    fixture.participants.some((participant) => participant.player_id === profile.linked_player_id)
  );
}

export function createHoleRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function parseOptionalPositiveInteger(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  return Number(value);
}

export function formatParticipants(participants: FixtureView['participants']): string {
  return participants
    .map((participant) => {
      const playerName = participant.player?.name ?? 'Unknown player';
      const playerTeam = participant.player?.team;
      const sideLabel = playerTeam && playerTeam !== participant.team
        ? `${participant.team} side`
        : participant.team;
      const teamLabel = playerTeam && playerTeam !== participant.team ? ` (${playerTeam})` : '';

      return `${sideLabel}: ${playerName}${teamLabel}`;
    })
    .join(' | ');
}

export function formatSegmentKind(kind: SegmentView['kind']): string {
  return kind === 'foursomes' ? 'Front 9 Foursomes' : 'Singles Match';
}

export function formatSegmentMatchup(segment: SegmentView, players: PlayerRow[]): string {
  const labels = getSegmentSideLabels(segment, players, { separator: ' + ' });

  return `${labels.usa} vs ${labels.europe}`;
}

export function getSegmentSideLabels(
  segment: SegmentView,
  players: PlayerRow[],
  options: SegmentSideLabelOptions = {}
): SegmentSideLabels {
  return {
    usa: getSegmentSideLabel(segment, 'USA', players, options),
    europe: getSegmentSideLabel(segment, 'EUROPE', players, options),
  };
}

export function getSegmentOutcomeLabel(
  segment: SegmentView,
  players: PlayerRow[],
  outcome: Exclude<HoleScoreRow['outcome'], 'halved' | 'unplayed'>,
  options: SegmentSideLabelOptions = {}
): string {
  const labels = getSegmentSideLabels(segment, players, options);

  return outcome === 'USA' ? labels.usa : labels.europe;
}

export function normalizePlayerTier(tier: number | null | undefined): PlayerTier {
  return tier === 1 || tier === 3 ? tier : 2;
}

export function formatPlayerTier(tier: number | null | undefined): string {
  return `Tier ${normalizePlayerTier(tier)}`;
}

export function formatOutcome(
  outcome: HoleScoreRow['outcome'],
  labels: { usa: string; europe: string } = { usa: 'USA', europe: 'Europe' }
): string {
  if (outcome === 'halved') {
    return 'Halved';
  }

  if (outcome === 'unplayed') {
    return 'Unplayed';
  }

  return outcome === 'USA' ? `${labels.usa} wins` : `${labels.europe} wins`;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function createEmptyScore(): TeamScore {
  return { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 };
}

function getSegmentSideLabel(
  segment: SegmentView,
  team: Team,
  players: PlayerRow[],
  options: SegmentSideLabelOptions
): string {
  const includeTeam = options.includeTeam ?? false;
  const separator = options.separator ?? '/';
  const teamLabel = formatTeamLabel(team);

  if (segment.kind === 'foursomes') {
    const names = getFoursomesSideNames(segment, team, players, options.fixture);
    const label = names.length > 0 ? names.join(separator) : teamLabel;

    return includeTeam ? `${label} (${teamLabel})` : label;
  }

  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const playerId = team === 'USA' ? segment.usa_player_id : segment.europe_player_id;
  const label = playerId ? playerLookup.get(playerId)?.name ?? getSideFallback(team) : getSideFallback(team);

  return includeTeam ? `${label} (${teamLabel})` : label;
}

function getFoursomesSideNames(
  segment: SegmentView,
  team: Team,
  players: PlayerRow[],
  fixture?: FixtureView
): string[] {
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const segmentPlayers = segment.players.filter((player) => player.team === team);
  const sourcePlayers =
    segmentPlayers.length > 0
      ? segmentPlayers
      : fixture && fixture.participants.length <= 4
        ? fixture.participants.filter((participant) => participant.team === team)
        : [];

  return sourcePlayers.map((entry) => {
    const sourcePlayer = entry.player ?? playerLookup.get(entry.player_id);

    return sourcePlayer?.name ?? getSideFallback(team);
  });
}

function formatTeamLabel(team: Team): string {
  return team === 'USA' ? 'USA' : 'Europe';
}

function getSideFallback(team: Team): string {
  return team === 'USA' ? 'Side A' : 'Side B';
}

function applyOutcome(score: TeamScore, outcome: HoleScoreRow['outcome']): void {
  if (outcome === 'USA') {
    score.USA += 1;
  } else if (outcome === 'EUROPE') {
    score.EUROPE += 1;
  } else if (outcome === 'halved') {
    score.halved += 1;
  } else {
    score.unplayed += 1;
  }
}
