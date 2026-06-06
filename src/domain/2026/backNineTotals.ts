import type { PlayerRow, SegmentView } from '../../services/tournament2026Queries';

export interface BackNineIndividualTotal {
  playerId: string;
  playerName: string;
  team: 'USA' | 'EUROPE';
  currentCpi: number | null;
  grossStrokes: number;
  cpiStrokesReceived: number;
  netStrokes: number;
  holesPlayed: number;
  cpiApplied: boolean;
}

export function calculateBackNineIndividualTotals(
  segments: SegmentView[],
  players: PlayerRow[]
): BackNineIndividualTotal[] {
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const totals: BackNineIndividualTotal[] = [];

  for (const segment of segments) {
    if (segment.kind !== 'singles') continue;

    const usaPlayer = segment.usa_player_id ? playerLookup.get(segment.usa_player_id) ?? null : null;
    const europePlayer = segment.europe_player_id ? playerLookup.get(segment.europe_player_id) ?? null : null;
    const useNet = segment.cpi_enabled;

    let usaGross = 0;
    let usaNet = 0;
    let usaHolesPlayed = 0;
    let europeGross = 0;
    let europeNet = 0;
    let europeHolesPlayed = 0;
    let cpiApplied = false;

    for (const score of segment.holeScores) {
      if (score.outcome === 'unplayed') continue;

      if (typeof score.usa_score === 'number') {
        const netValue = useNet ? score.usa_net_score ?? score.usa_score : score.usa_score;
        usaGross += score.usa_score;
        usaNet += netValue;
        usaHolesPlayed += 1;
        if (useNet && netValue !== score.usa_score) cpiApplied = true;
      }

      if (typeof score.europe_score === 'number') {
        const netValue = useNet ? score.europe_net_score ?? score.europe_score : score.europe_score;
        europeGross += score.europe_score;
        europeNet += netValue;
        europeHolesPlayed += 1;
        if (useNet && netValue !== score.europe_score) cpiApplied = true;
      }
    }

    if (usaPlayer) {
      totals.push({
        playerId: usaPlayer.id,
        playerName: usaPlayer.name,
        team: 'USA',
        currentCpi: usaPlayer.current_cpi,
        grossStrokes: usaGross,
        cpiStrokesReceived: usaGross - usaNet,
        netStrokes: usaNet,
        holesPlayed: usaHolesPlayed,
        cpiApplied,
      });
    }

    if (europePlayer) {
      totals.push({
        playerId: europePlayer.id,
        playerName: europePlayer.name,
        team: 'EUROPE',
        currentCpi: europePlayer.current_cpi,
        grossStrokes: europeGross,
        cpiStrokesReceived: europeGross - europeNet,
        netStrokes: europeNet,
        holesPlayed: europeHolesPlayed,
        cpiApplied,
      });
    }
  }

  return totals;
}

export function hasAnyBackNineTotals(totals: BackNineIndividualTotal[]): boolean {
  return totals.some((row) => row.holesPlayed > 0);
}
