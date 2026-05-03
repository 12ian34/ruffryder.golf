import { useMemo, useState } from 'react';
import type {
  PlayerRow,
  PlayerTournamentStatsRow,
  ProfileRow,
} from '../../../services/tournament2026Queries';
import { Panel, StatusCard } from './Layout';

type TeamFilter = 'ALL' | 'USA' | 'EUROPE';
type SortField = 'name' | 'team' | 'currentCpi' | 'holesWon' | number;
type SortDirection = 'asc' | 'desc';

interface PlayerStatsRow {
  player: PlayerRow;
  stats: PlayerTournamentStatsRow[];
  statsByYear: Map<number, PlayerTournamentStatsRow>;
  holesWon: number;
}

export function StatsSection({
  players,
  playerStats,
  profile,
}: {
  players: PlayerRow[];
  playerStats: PlayerTournamentStatsRow[];
  profile: ProfileRow;
}) {
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const years = useMemo(
    () => Array.from(new Set(playerStats.map((stat) => stat.completion_year))).sort((a, b) => b - a),
    [playerStats]
  );
  const rows = useMemo(() => {
    const statsByPlayer = groupStatsByPlayer(playerStats);

    return players.map<PlayerStatsRow>((player) => {
      const stats = statsByPlayer.get(player.id) ?? [];

      return {
        player,
        stats,
        statsByYear: new Map(stats.map((stat) => [stat.completion_year, stat])),
        holesWon: stats.reduce((total, stat) => total + stat.holes_won, 0),
      };
    });
  }, [players, playerStats]);
  const visibleRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    return rows
      .filter((row) => teamFilter === 'ALL' || row.player.team === teamFilter)
      .sort((a, b) => direction * compareRows(a, b, sortField));
  }, [rows, sortDirection, sortField, teamFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  return (
    <Panel title="Player Stats" eyebrow="2026 history">
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'USA', 'EUROPE'] as const).map((team) => (
          <button
            key={team}
            type="button"
            onClick={() => setTeamFilter(team)}
            className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
              teamFilter === team
                ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
                : 'border-[#27272A] text-[#8B949E]'
            }`}
          >
            {team}
          </button>
        ))}
      </div>
      {visibleRows.length === 0 ? (
        <StatusCard>No player stats are available yet.</StatusCard>
      ) : (
        <div className="-mx-4 mt-4 overflow-x-auto sm:mx-0">
          <table className="min-w-full border-y border-[#27272A] text-left text-sm">
            <thead className="bg-[#0C0C0E] text-[10px] uppercase tracking-[0.16em] text-[#8B949E]">
              <tr>
                <SortableHeader label="Player" isActive={sortField === 'name'} onClick={() => toggleSort('name')} />
                <SortableHeader label="Team" isActive={sortField === 'team'} onClick={() => toggleSort('team')} />
                <SortableHeader
                  label="Current CPI"
                  isActive={sortField === 'currentCpi'}
                  onClick={() => toggleSort('currentCpi')}
                />
                <SortableHeader
                  label="Holes won"
                  isActive={sortField === 'holesWon'}
                  onClick={() => toggleSort('holesWon')}
                />
                {years.map((year) => (
                  <SortableHeader
                    key={year}
                    label={year.toString()}
                    isActive={sortField === year}
                    onClick={() => toggleSort(year)}
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A] bg-[#050505]">
              {visibleRows.map((row) => {
                const isCurrentPlayer = row.player.id === profile.linked_player_id;

                return (
                  <tr key={row.player.id} className={isCurrentPlayer ? 'bg-[#06170B]' : undefined}>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-[#FAFAFA]">
                      {row.player.custom_emoji && <span className="mr-2">{row.player.custom_emoji}</span>}
                      {row.player.name}
                      {isCurrentPlayer && (
                        <span className="ml-2 rounded border border-[#3FB950] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#3FB950]">
                          You
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#A1A1AA]">{row.player.team}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#E6EDF3]">
                      {formatNumber(row.player.current_cpi)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#E6EDF3]">{row.holesWon}</td>
                    {years.map((year) => {
                      const stat = row.statsByYear.get(year);

                      return (
                        <td key={year} className="whitespace-nowrap px-4 py-3 tabular-nums text-[#A1A1AA]">
                          {stat ? `${stat.singles_strokes}/${stat.singles_holes_played}` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function SortableHeader({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3">
      <button
        type="button"
        onClick={onClick}
        className={isActive ? 'text-[#3FB950]' : 'text-[#8B949E]'}
      >
        {label}
      </button>
    </th>
  );
}

function groupStatsByPlayer(
  stats: PlayerTournamentStatsRow[]
): Map<string, PlayerTournamentStatsRow[]> {
  const groups = new Map<string, PlayerTournamentStatsRow[]>();

  for (const stat of stats) {
    const existing = groups.get(stat.player_id) ?? [];
    existing.push(stat);
    groups.set(stat.player_id, existing);
  }

  return groups;
}

function compareRows(a: PlayerStatsRow, b: PlayerStatsRow, field: SortField): number {
  if (field === 'name') {
    return a.player.name.localeCompare(b.player.name);
  }

  if (field === 'team') {
    return a.player.team.localeCompare(b.player.team);
  }

  if (field === 'currentCpi') {
    return (a.player.current_cpi ?? 999) - (b.player.current_cpi ?? 999);
  }

  if (field === 'holesWon') {
    return a.holesWon - b.holesWon;
  }

  return (a.statsByYear.get(field)?.singles_strokes ?? 9999) - (b.statsByYear.get(field)?.singles_strokes ?? 9999);
}

function formatNumber(value: number | null): string {
  return value === null ? '-' : value.toString();
}
