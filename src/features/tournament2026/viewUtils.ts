import type {
  FixtureView,
  HoleScoreRow,
  PlayerRow,
  SegmentView,
} from '../../services/tournament2026Queries';

export interface TeamScore {
  USA: number;
  EUROPE: number;
  halved: number;
  unplayed: number;
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
    .map((participant) => `${participant.team}: ${participant.player?.name ?? 'Unknown player'}`)
    .join(' | ');
}

export function formatSegmentKind(kind: SegmentView['kind']): string {
  return kind === 'foursomes' ? 'Front 9 Foursomes' : 'Singles Match';
}

export function formatSegmentMatchup(segment: SegmentView, players: PlayerRow[]): string {
  if (segment.kind === 'foursomes') {
    const usaPlayers = segment.players
      .filter((player) => player.team === 'USA')
      .map((player) => player.player?.name ?? 'Unknown USA')
      .join(' + ');
    const europePlayers = segment.players
      .filter((player) => player.team === 'EUROPE')
      .map((player) => player.player?.name ?? 'Unknown Europe')
      .join(' + ');

    return `${usaPlayers} vs ${europePlayers}`;
  }

  const playerLookup = new Map(players.map((player) => [player.id, player.name]));
  const usaPlayer = segment.usa_player_id ? playerLookup.get(segment.usa_player_id) : 'USA player';
  const europePlayer = segment.europe_player_id
    ? playerLookup.get(segment.europe_player_id)
    : 'Europe player';

  return `${usaPlayer} vs ${europePlayer}`;
}

export function formatOutcome(outcome: HoleScoreRow['outcome']): string {
  if (outcome === 'halved') {
    return 'Halved';
  }

  if (outcome === 'unplayed') {
    return 'Unplayed';
  }

  return `${outcome} wins`;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function createEmptyScore(): TeamScore {
  return { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 };
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
