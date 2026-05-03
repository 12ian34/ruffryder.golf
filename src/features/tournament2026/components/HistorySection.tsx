import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Tournament2026Data } from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
import { Panel, StatusCard } from './Layout';
import {
  PlayerHistoryTrigger,
  PlayerIdentity,
  formatNumber,
  getLegacyNumber,
  getPlayerArchiveHolesWonNumber,
  getPlayerArchivePoints,
  getPlayerArchivePointsNumber,
  getPlayerArchiveScore,
  getPlayerArchiveScoreNumber,
} from './PlayerHistory';

type ArchiveView = 'tournaments' | 'players';
type PlayerArchiveTeamFilter = 'ALL' | 'USA' | 'EUROPE';
type PlayerArchiveSortField =
  | 'player'
  | 'scoreRaw'
  | 'scoreHandicap'
  | 'pointsRaw'
  | 'pointsHandicap'
  | 'overallHandicap'
  | 'holesWon';
type SortDirection = 'asc' | 'desc';

const TEAM_EMOJI = {
  USA: '🇺🇸',
  EUROPE: '🇪🇺',
} as const;

export function ArchiveSection({
  history,
  players,
  playerStats,
}: {
  history: Tournament2026Data['history'];
  players: Tournament2026Data['players'];
  playerStats: Tournament2026Data['playerStats'];
}) {
  const [activeView, setActiveView] = useState<ArchiveView>('tournaments');
  const changeView = (view: ArchiveView) => {
    setActiveView(view);
    track2026('archive_view_changed', { view });
  };

  return (
    <Panel title="Archive" eyebrow="Tournaments and players">
      <div className="flex gap-2">
        <ArchiveViewButton
          label="Tournaments"
          isActive={activeView === 'tournaments'}
          onClick={() => changeView('tournaments')}
        />
        <ArchiveViewButton
          label="Players"
          isActive={activeView === 'players'}
          onClick={() => changeView('players')}
        />
      </div>
      {activeView === 'tournaments' ? (
        <TournamentArchive history={history} players={players} />
      ) : (
        <PlayerArchive players={players} playerStats={playerStats} />
      )}
    </Panel>
  );
}

function ArchiveViewButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-2 text-[11px] font-bold tracking-[0.14em] ${
        isActive
          ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
          : 'border-[#27272A] text-[#8B949E]'
      }`}
    >
      {label}
    </button>
  );
}

function TournamentArchive({
  history,
  players,
}: {
  history: Tournament2026Data['history'];
  players: Tournament2026Data['players'];
}) {
  const playerLookup = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const [openTournamentId, setOpenTournamentId] = useState<string | null>(null);

  if (history.length === 0) {
    return <StatusCard>No historical tournaments have been imported yet.</StatusCard>;
  }

  return (
    <div className="-mx-3 mt-3 sm:mx-0">
      {history.map((tournament) => (
        <details
          key={tournament.id}
          open={openTournamentId === tournament.id}
          className="group border-t border-[#27272A] bg-[#050505] first:border-t-0"
        >
          <summary
            onClick={(event) => {
              event.preventDefault();
              setOpenTournamentId((current) => {
                const next = current === tournament.id ? null : tournament.id;
                track2026('archive_tournament_toggled', {
                  tournament_id: tournament.id,
                  year: tournament.year,
                  is_open: next === tournament.id,
                });
                return next;
              });
            }}
            className="cursor-pointer list-none px-3 py-3 transition hover:bg-[#0C0C0E] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950]"
          >
            <p className="text-[11px] tracking-[0.18em] text-[#8B949E]">{tournament.year}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">{tournament.name}</h3>
              <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#A1A1AA]">
                <span className="whitespace-nowrap border border-[#27272A] px-2 py-1">{tournament.games.length} games</span>
                <span className="whitespace-nowrap text-[#3FB950]">
                  <span className="group-open:hidden">Open</span>
                  <span className="hidden group-open:inline">Hide</span>
                  <span className="ml-1 inline-block transition group-open:rotate-90">&gt;</span>
                </span>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <HistoryScore label="Raw" usa={tournament.total_raw_usa} europe={tournament.total_raw_europe} />
              <HistoryScore
                label="Handicap"
                usa={tournament.total_legacy_adjusted_usa}
                europe={tournament.total_legacy_adjusted_europe}
              />
            </div>
          </summary>
          <div className="border-t border-[#27272A]">
            {tournament.games.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[#8B949E]">No legacy game rows imported for this tournament.</p>
            ) : (
              tournament.games.map((game) => (
                <LegacyGameRow key={game.id} game={game} playerLookup={playerLookup} />
              ))
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function PlayerArchive({
  players,
  playerStats,
}: {
  players: Tournament2026Data['players'];
  playerStats: Tournament2026Data['playerStats'];
}) {
  const [teamFilter, setTeamFilter] = useState<PlayerArchiveTeamFilter>('ALL');
  const [sortField, setSortField] = useState<PlayerArchiveSortField>('player');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [openPlayerYear, setOpenPlayerYear] = useState<number | null>(null);
  const playerLookup = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const statsByYear = useMemo(
    () => groupStatsByYear(playerStats, playerLookup, teamFilter, sortField, sortDirection),
    [playerStats, playerLookup, teamFilter, sortField, sortDirection]
  );
  const changeFilter = (filter: PlayerArchiveTeamFilter) => {
    setTeamFilter(filter);
    track2026('player_archive_filtered', { team_filter: filter });
  };
  const changeSort = (field: PlayerArchiveSortField) => {
    if (sortField === field) {
      setSortDirection((current) => {
        const nextDirection = current === 'asc' ? 'desc' : 'asc';
        track2026('player_archive_sorted', { sort_field: field, sort_direction: nextDirection });
        return nextDirection;
      });
      return;
    }

    setSortField(field);
    const nextDirection = field === 'player' ? 'asc' : 'desc';
    setSortDirection(nextDirection);
    track2026('player_archive_sorted', { sort_field: field, sort_direction: nextDirection });
  };

  return (
    <div className="-mx-3 mt-3 border-t border-[#27272A] sm:mx-0">
      <div className="px-3 py-3">
        <p className="text-xs font-bold tracking-[0.18em] text-[#3FB950]">Player archive</p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Finalized 2026 app stats and migrated historical score rows. Historical annual scores are shown as scores, not as 2026 hole-count records.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PlayerArchiveFilterButton label="All" isActive={teamFilter === 'ALL'} onClick={() => changeFilter('ALL')} />
          <PlayerArchiveFilterButton
            label={`${TEAM_EMOJI.USA} USA`}
            isActive={teamFilter === 'USA'}
            onClick={() => changeFilter('USA')}
          />
          <PlayerArchiveFilterButton
            label={`${TEAM_EMOJI.EUROPE} Europe`}
            isActive={teamFilter === 'EUROPE'}
            onClick={() => changeFilter('EUROPE')}
          />
        </div>
      </div>
      {statsByYear.length === 0 ? (
        <p className="px-3 pb-3 text-sm text-[#8B949E]">
          {playerStats.length === 0 ? 'No player stat rows have been saved yet.' : 'No player stat rows match this filter.'}
        </p>
      ) : (
        statsByYear.map(({ year, stats }) => (
          <details
            key={year}
            open={openPlayerYear === year}
            className="group border-t border-[#27272A] bg-[#050505]"
          >
            <summary
              onClick={(event) => {
                event.preventDefault();
                setOpenPlayerYear((current) => {
                  const next = current === year ? null : year;
                  track2026('player_archive_year_toggled', {
                    year,
                    is_open: next === year,
                  });
                  return next;
                });
              }}
              className="cursor-pointer list-none px-3 py-2.5 transition hover:bg-[#0C0C0E] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="text-base font-bold tracking-[-0.03em] text-[#FAFAFA]">{year}</p>
                  <span className="whitespace-nowrap border border-[#27272A] px-2 py-1 text-[10px] font-bold tracking-[0.16em] text-[#A1A1AA]">
                    {formatPlayerCount(stats.length)}
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#A1A1AA]">
                  <span className="whitespace-nowrap text-[#3FB950]">
                    <span className="group-open:hidden">Open</span>
                    <span className="hidden group-open:inline">Hide</span>
                    <span className="ml-1 inline-block transition group-open:rotate-90">&gt;</span>
                  </span>
                </span>
              </div>
            </summary>
            <div className="overflow-x-auto border-t border-[#27272A]">
              <table className="min-w-[46rem] text-left text-xs">
                <thead className="border-b border-[#27272A] bg-[#0C0C0E] tracking-[0.16em] text-[#8B949E]">
                  <tr>
                    <th rowSpan={2} className="sticky left-0 z-20 min-w-44 bg-[#0C0C0E] px-3 py-2">
                      <PlayerArchiveSortButton
                        label="Player"
                        field="player"
                        activeField={sortField}
                        direction={sortDirection}
                        onClick={changeSort}
                      />
                    </th>
                    <th colSpan={2} className="px-3 py-2 text-center text-[#3FB950]">Score</th>
                    <th colSpan={2} className="px-3 py-2 text-center text-[#3FB950]">Points</th>
                    <th rowSpan={2} className="px-3 py-2">
                      <PlayerArchiveSortButton
                        label={<>Holes<br />won</>}
                        ariaLabel="Holes won"
                        field="holesWon"
                        activeField={sortField}
                        direction={sortDirection}
                        onClick={changeSort}
                      />
                    </th>
                    <th rowSpan={2} className="px-3 py-2">
                      <PlayerArchiveSortButton
                        label={<>Overall<br />handicap</>}
                        ariaLabel="Overall handicap"
                        field="overallHandicap"
                        activeField={sortField}
                        direction={sortDirection}
                        onClick={changeSort}
                      />
                    </th>
                  </tr>
                  <tr className="border-t border-[#27272A] text-[10px]">
                    <th className="px-3 py-2">
                      <PlayerArchiveSortButton
                        label="Raw"
                        field="scoreRaw"
                        activeField={sortField}
                        direction={sortDirection}
                        onClick={changeSort}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <PlayerArchiveSortButton
                        label="Handicap"
                        field="scoreHandicap"
                        activeField={sortField}
                        direction={sortDirection}
                        onClick={changeSort}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <PlayerArchiveSortButton
                        label="Raw"
                        field="pointsRaw"
                        activeField={sortField}
                        direction={sortDirection}
                        onClick={changeSort}
                      />
                    </th>
                    <th className="px-3 py-2">
                      <PlayerArchiveSortButton
                        label="Handicap"
                        field="pointsHandicap"
                        activeField={sortField}
                        direction={sortDirection}
                        onClick={changeSort}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {stats.map((stat) => {
                    const player = playerLookup.get(stat.player_id);
                    const scoreRaw = getPlayerArchiveScore(stat, 'raw');
                    const scoreHandicap = getPlayerArchiveScore(stat, 'handicap');
                    const pointsRaw = getPlayerArchivePoints(stat, 'raw');
                    const pointsHandicap = getPlayerArchivePoints(stat, 'handicap');

                    return (
                      <tr key={stat.id} className="bg-[#050505]">
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-[#050505] px-3 py-2 text-[#FAFAFA]">
                          <PlayerArchiveName
                            player={player}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {scoreRaw}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {scoreHandicap}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {pointsRaw}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {pointsHandicap}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {formatHolesWon(stat)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {formatNumber(stat.cpi_after)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        ))
      )}
    </div>
  );
}

function groupStatsByYear(
  stats: Tournament2026Data['playerStats'],
  playerLookup: Map<string, Tournament2026Data['players'][number]>,
  teamFilter: PlayerArchiveTeamFilter,
  sortField: PlayerArchiveSortField,
  sortDirection: SortDirection
): { year: number; stats: Tournament2026Data['playerStats'] }[] {
  const groups = new Map<number, Tournament2026Data['playerStats']>();

  for (const stat of stats) {
    const player = playerLookup.get(stat.player_id);
    if (teamFilter !== 'ALL' && player?.team !== teamFilter) {
      continue;
    }

    const existing = groups.get(stat.completion_year) ?? [];
    existing.push(stat);
    groups.set(stat.completion_year, existing);
  }

  return Array.from(groups.entries())
    .map(([year, yearStats]) => ({
      year,
      stats: yearStats.sort((a, b) => comparePlayerArchiveStats(a, b, playerLookup, sortField, sortDirection)),
    }))
    .sort((a, b) => b.year - a.year);
}

function PlayerArchiveFilterButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-2 text-[11px] font-bold tracking-[0.14em] ${
        isActive
          ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
          : 'border-[#27272A] text-[#8B949E]'
      }`}
    >
      {label}
    </button>
  );
}

function PlayerArchiveSortButton({
  label,
  ariaLabel,
  field,
  activeField,
  direction,
  onClick,
}: {
  label: ReactNode;
  ariaLabel?: string;
  field: PlayerArchiveSortField;
  activeField: PlayerArchiveSortField;
  direction: SortDirection;
  onClick: (field: PlayerArchiveSortField) => void;
}) {
  const isActive = field === activeField;
  const labelText = ariaLabel ?? (typeof label === 'string' ? label : undefined);

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      aria-label={labelText ? `${labelText} ${isActive ? direction : 'sort'}` : undefined}
      className={`inline-flex items-center gap-1 whitespace-nowrap tracking-[0.16em] ${
        isActive ? 'text-[#3FB950]' : 'text-[#8B949E] hover:text-[#E6EDF3]'
      }`}
    >
      <span>{label}</span>
      <span className={isActive ? 'text-[#3FB950]' : 'text-[#484F58]'}>
        {isActive ? (direction === 'asc' ? 'ASC' : 'DESC') : 'SORT'}
      </span>
    </button>
  );
}

function comparePlayerArchiveStats(
  a: Tournament2026Data['playerStats'][number],
  b: Tournament2026Data['playerStats'][number],
  playerLookup: Map<string, Tournament2026Data['players'][number]>,
  sortField: PlayerArchiveSortField,
  sortDirection: SortDirection
): number {
  const direction = sortDirection === 'asc' ? 1 : -1;

  if (sortField === 'player') {
    const aName = playerLookup.get(a.player_id)?.name ?? '';
    const bName = playerLookup.get(b.player_id)?.name ?? '';
    return direction * aName.localeCompare(bName);
  }

  const aValue = getPlayerArchiveSortNumber(a, sortField);
  const bValue = getPlayerArchiveSortNumber(b, sortField);

  if (aValue === null && bValue === null) {
    return comparePlayerArchiveStats(a, b, playerLookup, 'player', 'asc');
  }

  if (aValue === null) {
    return 1;
  }

  if (bValue === null) {
    return -1;
  }

  if (aValue === bValue) {
    return comparePlayerArchiveStats(a, b, playerLookup, 'player', 'asc');
  }

  return direction * (aValue - bValue);
}

function getPlayerArchiveSortNumber(
  stat: Tournament2026Data['playerStats'][number],
  sortField: Exclude<PlayerArchiveSortField, 'player'>
): number | null {
  switch (sortField) {
    case 'scoreRaw':
      return getPlayerArchiveScoreNumber(stat, 'raw');
    case 'scoreHandicap':
      return getPlayerArchiveScoreNumber(stat, 'handicap');
    case 'pointsRaw':
      return getPlayerArchivePointsNumber(stat, 'raw');
    case 'pointsHandicap':
      return getPlayerArchivePointsNumber(stat, 'handicap');
    case 'overallHandicap':
      return stat.cpi_after;
    case 'holesWon':
      return getPlayerArchiveHolesWonNumber(stat);
    default: {
      const exhaustive: never = sortField;
      return exhaustive;
    }
  }
}

function formatHolesWon(stat: Tournament2026Data['playerStats'][number]): string {
  return formatNumber(getPlayerArchiveHolesWonNumber(stat));
}

function formatPlayerCount(count: number): string {
  return `${count} ${count === 1 ? 'player' : 'players'}`;
}

function PlayerArchiveName({ player }: { player: Tournament2026Data['players'][number] | undefined }) {
  return (
    <PlayerHistoryTrigger player={player} fallback="Unknown player" className="inline-flex max-w-48 items-center gap-2">
      <PlayerIdentity player={player} fallback="Unknown player" />
    </PlayerHistoryTrigger>
  );
}

function HistoryScore({ label, usa, europe }: { label: string; usa: number; europe: number }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] tracking-[0.16em] text-[#8B949E]">{label}</p>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm leading-5 text-[#E6EDF3]">
        <TeamNumber emoji={TEAM_EMOJI.USA} value={usa} />
        <TeamNumber emoji={TEAM_EMOJI.EUROPE} value={europe} />
      </p>
    </div>
  );
}

function LegacyGameRow({
  game,
  playerLookup,
}: {
  game: Tournament2026Data['history'][number]['games'][number];
  playerLookup: Map<string, Tournament2026Data['players'][number]>;
}) {
  const usaHandicap = getLegacyPlayerHandicap(game, 'USA', playerLookup);
  const europeHandicap = getLegacyPlayerHandicap(game, 'EUROPE', playerLookup);
  const usaPlayer = game.usa_player_id ? playerLookup.get(game.usa_player_id) : null;
  const europePlayer = game.europe_player_id ? playerLookup.get(game.europe_player_id) : null;

  return (
    <div className="border-t border-[#27272A] px-3 py-3 first:border-t-0">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] lg:items-start">
        <div className="grid gap-1.5 text-sm font-bold text-[#FAFAFA]">
          <PlayerNameLine
            emoji={TEAM_EMOJI.USA}
            teamLabel="USA"
            name={game.usa_player_name}
            handicap={usaHandicap}
            player={usaPlayer}
          />
          <PlayerNameLine
            emoji={TEAM_EMOJI.EUROPE}
            teamLabel="Europe"
            name={game.europe_player_name}
            handicap={europeHandicap}
            player={europePlayer}
          />
          {game.use_legacy_handicap && (
            <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-[#8B949E]">
              Handicap stroke gap: <span className="whitespace-nowrap tabular-nums text-[#A1A1AA]">{game.legacy_handicap_strokes}</span>
            </p>
          )}
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-1">
          <HistoryScoreSet
            label="Points"
            rawUsa={game.points_raw_usa}
            rawEurope={game.points_raw_europe}
            handicapUsa={game.points_legacy_adjusted_usa}
            handicapEurope={game.points_legacy_adjusted_europe}
          />
          <HistoryScoreSet
            label="Strokes"
            rawUsa={game.stroke_raw_usa}
            rawEurope={game.stroke_raw_europe}
            handicapUsa={game.stroke_legacy_adjusted_usa}
            handicapEurope={game.stroke_legacy_adjusted_europe}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerNameLine({
  emoji,
  teamLabel,
  name,
  handicap,
  player,
}: {
  emoji: string;
  teamLabel: string;
  name: string;
  handicap: number | null;
  player?: Tournament2026Data['players'][number] | null;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span aria-label={teamLabel} title={teamLabel}>{emoji}</span>
      <PlayerHistoryTrigger player={player} fallback={name}>
        {name}
      </PlayerHistoryTrigger>
      {handicap !== null && (
        <span className="whitespace-nowrap text-[10px] font-bold tracking-[0.14em] text-[#8B949E]">
          HCP <span className="tabular-nums text-[#A1A1AA]">{handicap}</span>
        </span>
      )}
    </p>
  );
}

function HistoryScoreSet({
  label,
  rawUsa,
  rawEurope,
  handicapUsa,
  handicapEurope,
}: {
  label: string;
  rawUsa: number;
  rawEurope: number;
  handicapUsa: number;
  handicapEurope: number;
}) {
  return (
    <div className="min-w-0 border-t border-[#27272A] pt-2 first:border-t-0 first:pt-0 sm:first:border-t sm:first:pt-2 lg:first:border-t-0 lg:first:pt-0">
      <p className="text-[11px] font-black tracking-[0.22em] text-[#3FB950]">{label}</p>
      <div className="mt-1 grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs leading-5">
        <span className="tracking-[0.14em] text-[#8B949E]">Raw</span>
        <TeamNumberPair usa={rawUsa} europe={rawEurope} />
        <span className="tracking-[0.14em] text-[#8B949E]">Handicap</span>
        <TeamNumberPair usa={handicapUsa} europe={handicapEurope} />
      </div>
    </div>
  );
}

function TeamNumberPair({ usa, europe }: { usa: number; europe: number }) {
  return (
    <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[#E6EDF3]">
      <TeamNumber emoji={TEAM_EMOJI.USA} value={usa} />
      <TeamNumber emoji={TEAM_EMOJI.EUROPE} value={europe} />
    </span>
  );
}

function TeamNumber({ emoji, value }: { emoji: string; value: number }) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      {emoji} {value}
    </span>
  );
}

function getLegacyPlayerHandicap(
  game: Tournament2026Data['history'][number]['games'][number],
  team: 'USA' | 'EUROPE',
  playerLookup: Map<string, Tournament2026Data['players'][number]>
): number | null {
  const payloadKey = team === 'USA' ? 'usaPlayerHandicap' : 'europePlayerHandicap';
  const payloadValue = getLegacyNumber(game.source_payload, payloadKey);

  if (payloadValue !== null) {
    return payloadValue;
  }

  const playerId = team === 'USA' ? game.usa_player_id : game.europe_player_id;
  const playerCpi = playerId ? playerLookup.get(playerId)?.current_cpi : null;

  return typeof playerCpi === 'number' ? playerCpi : null;
}
