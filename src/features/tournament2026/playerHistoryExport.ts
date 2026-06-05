import type { PlayerRow, PlayerTournamentStatsRow } from '../../services/tournament2026Queries';

const BASE_PLAYER_HISTORY_COLUMNS = [
  'player_id',
  'player_name',
  'team',
  'tier',
  'current_cpi',
  'history_row_count',
] as const;

export function buildPlayerHistoryCsv(
  players: PlayerRow[],
  stats: PlayerTournamentStatsRow[]
): string {
  const years = Array.from(new Set(stats.map((stat) => stat.completion_year))).sort((a, b) => b - a);
  const columns = [
    ...BASE_PLAYER_HISTORY_COLUMNS,
    ...years.flatMap((year) => [
      `${year}_raw_score`,
      `${year}_legacy_adjusted_score`,
      `${year}_raw_points`,
      `${year}_legacy_adjusted_points`,
      `${year}_holes_won`,
      `${year}_cpi_after`,
      `${year}_source`,
      `${year}_completed_at`,
    ]),
  ];
  const statsByPlayerYear = groupStatsByPlayerYear(stats);
  const rows = [...players]
    .sort((a, b) => getTeamSortValue(a.team) - getTeamSortValue(b.team) || a.name.localeCompare(b.name))
    .map((player) => {
      const playerStats = stats.filter((stat) => stat.player_id === player.id);
      const row: Record<string, CsvValue> = {
        player_id: player.id,
        player_name: player.name,
        team: player.team,
        tier: player.tier,
        current_cpi: player.current_cpi,
        history_row_count: playerStats.length,
      };

      for (const year of years) {
        const yearStats = statsByPlayerYear.get(player.id)?.get(year) ?? [];
        row[`${year}_raw_score`] = joinCellValues(
          yearStats.map((stat) => getPlayerArchiveScoreNumber(stat, 'raw'))
        );
        row[`${year}_legacy_adjusted_score`] = joinCellValues(
          yearStats.map((stat) => getPlayerArchiveScoreNumber(stat, 'handicap'))
        );
        row[`${year}_raw_points`] = joinCellValues(
          yearStats.map((stat) => getPlayerArchivePointsNumber(stat, 'raw'))
        );
        row[`${year}_legacy_adjusted_points`] = joinCellValues(
          yearStats.map((stat) => getPlayerArchivePointsNumber(stat, 'handicap'))
        );
        row[`${year}_holes_won`] = joinCellValues(
          yearStats.map((stat) => getPlayerArchiveHolesWonNumber(stat))
        );
        row[`${year}_cpi_after`] = joinCellValues(yearStats.map((stat) => stat.cpi_after));
        row[`${year}_source`] = joinCellValues(yearStats.map((stat) => stat.source));
        row[`${year}_completed_at`] = joinCellValues(yearStats.map((stat) => stat.completed_at));
      }

      return row;
    });

  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(',')),
  ].join('\n');
}

export function createPlayerHistoryExportFilename(date = new Date()): string {
  return `ruff-ryders-player-history-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadPlayerHistoryCsv(
  players: PlayerRow[],
  stats: PlayerTournamentStatsRow[]
): void {
  const csv = buildPlayerHistoryCsv(players, stats);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = createPlayerHistoryExportFilename();
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getTeamSortValue(team: PlayerRow['team']): number {
  return team === 'USA' ? 0 : 1;
}

function groupStatsByPlayerYear(
  stats: PlayerTournamentStatsRow[]
): Map<string, Map<number, PlayerTournamentStatsRow[]>> {
  const grouped = new Map<string, Map<number, PlayerTournamentStatsRow[]>>();

  for (const stat of stats) {
    const playerStats = grouped.get(stat.player_id) ?? new Map<number, PlayerTournamentStatsRow[]>();
    const yearStats = playerStats.get(stat.completion_year) ?? [];

    yearStats.push(stat);
    yearStats.sort((a, b) => b.completed_at.localeCompare(a.completed_at));
    playerStats.set(stat.completion_year, yearStats);
    grouped.set(stat.player_id, playerStats);
  }

  return grouped;
}

function getPlayerArchiveScoreNumber(
  stat: PlayerTournamentStatsRow,
  mode: 'raw' | 'handicap'
): number | null {
  if (mode === 'handicap') {
    return (
      getLegacyNumber(stat.legacy_payload, 'scoreAdjusted') ??
      getLegacyNumber(stat.legacy_payload, 'totalStrokesAdjusted') ??
      stat.cpi_after
    );
  }

  return (
    getLegacyNumber(stat.legacy_payload, 'score') ??
    getLegacyNumber(stat.legacy_payload, 'totalStrokes') ??
    (stat.singles_average ?? (stat.singles_strokes > 0 ? stat.singles_strokes : null))
  );
}

function getPlayerArchivePointsNumber(
  stat: PlayerTournamentStatsRow,
  mode: 'raw' | 'handicap'
): number | null {
  const payloadKey = mode === 'raw' ? 'pointsEarned' : 'pointsEarnedAdjusted';

  return getLegacyNumber(stat.legacy_payload, payloadKey);
}

function getPlayerArchiveHolesWonNumber(stat: PlayerTournamentStatsRow): number | null {
  if (stat.singles_holes_played === 0 && stat.holes_won === 0) {
    return getLegacyNumber(stat.legacy_payload, 'holesWon');
  }

  return stat.holes_won;
}

function getLegacyNumber(payload: PlayerTournamentStatsRow['legacy_payload'], key: string): number | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const value = payload[key];

  return typeof value === 'number' ? value : null;
}

function joinCellValues(values: CsvValue[]): string {
  return values
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map((value) => String(value))
    .join(' | ');
}

type CsvValue = string | number | boolean | null | undefined;

function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  const serialized = String(value);

  if (/[",\n\r]/.test(serialized)) {
    return `"${serialized.replace(/"/g, '""')}"`;
  }

  return serialized;
}
