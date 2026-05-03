import { useMemo, useState } from 'react';
import type { Tournament2026Data } from '../../../services/tournament2026Queries';
import { Panel, StatusCard } from './Layout';

type ArchiveView = 'tournaments' | 'players';

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

  return (
    <Panel title="Archive" eyebrow="Tournaments and players">
      <div className="flex gap-2">
        <ArchiveViewButton
          label="Tournaments"
          isActive={activeView === 'tournaments'}
          onClick={() => setActiveView('tournaments')}
        />
        <ArchiveViewButton
          label="Players"
          isActive={activeView === 'players'}
          onClick={() => setActiveView('players')}
        />
      </div>
      {activeView === 'tournaments' ? (
        <TournamentArchive history={history} />
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
      className={`rounded-md border px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] ${
        isActive
          ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
          : 'border-[#27272A] text-[#8B949E]'
      }`}
    >
      {label}
    </button>
  );
}

function TournamentArchive({ history }: { history: Tournament2026Data['history'] }) {
  if (history.length === 0) {
    return <StatusCard>No historical tournaments have been imported yet.</StatusCard>;
  }

  return (
    <div className="-mx-3 mt-3 sm:mx-0">
      {history.map((tournament) => (
        <details key={tournament.id} className="border-t border-[#27272A] bg-[#050505] first:border-t-0">
          <summary className="cursor-pointer list-none px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8B949E]">{tournament.year}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">{tournament.name}</h3>
              <span className="shrink-0 border border-[#27272A] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#A1A1AA]">
                {tournament.games.length} games
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <HistoryScore label="Raw" usa={tournament.total_raw_usa} europe={tournament.total_raw_europe} />
              <HistoryScore
                label="Legacy adjusted"
                usa={tournament.total_legacy_adjusted_usa}
                europe={tournament.total_legacy_adjusted_europe}
              />
            </div>
          </summary>
          <div className="border-t border-[#27272A]">
            {tournament.games.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[#8B949E]">No legacy game rows imported for this tournament.</p>
            ) : (
              tournament.games.map((game) => <LegacyGameRow key={game.id} game={game} />)
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
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const statsByYear = useMemo(() => groupStatsByYear(playerStats, playerLookup), [playerStats, playerLookup]);

  return (
    <div className="-mx-3 mt-3 border-t border-[#27272A] sm:mx-0">
      <div className="px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3FB950]">Player archive</p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Finalized 2026 app stats and migrated historical score rows. Historical annual scores are shown as scores, not as 2026 hole-count records.
        </p>
      </div>
      {statsByYear.length === 0 ? (
        <p className="px-3 pb-3 text-sm text-[#8B949E]">No player stat rows have been saved yet.</p>
      ) : (
        statsByYear.map(({ year, stats }, index) => (
          <details key={year} open={index === 0} className="border-t border-[#27272A] bg-[#050505]">
            <summary className="cursor-pointer list-none px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-bold tracking-[-0.03em] text-[#FAFAFA]">{year}</p>
                <span className="border border-[#27272A] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#A1A1AA]">
                  {stats.length} rows
                </span>
              </div>
            </summary>
            <div className="overflow-x-auto border-t border-[#27272A]">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-[#27272A] bg-[#0C0C0E] uppercase tracking-[0.16em] text-[#8B949E]">
                  <tr>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Won</th>
                    <th className="px-3 py-2">CPI / score</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {stats.map((stat) => {
                    const player = playerLookup.get(stat.player_id);

                    return (
                      <tr key={stat.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-[#FAFAFA]">
                          {player?.name ?? 'Unknown player'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {formatPlayerResult(stat)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {formatHolesWon(stat)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#A1A1AA]">
                          {stat.cpi_after ?? '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 uppercase text-[#8B949E]">{formatSource(stat.source)}</td>
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
  playerLookup: Map<string, Tournament2026Data['players'][number]>
): { year: number; stats: Tournament2026Data['playerStats'] }[] {
  const groups = new Map<number, Tournament2026Data['playerStats']>();

  for (const stat of stats) {
    const existing = groups.get(stat.completion_year) ?? [];
    existing.push(stat);
    groups.set(stat.completion_year, existing);
  }

  return Array.from(groups.entries())
    .map(([year, yearStats]) => ({
      year,
      stats: yearStats.sort((a, b) =>
        (playerLookup.get(a.player_id)?.name ?? '').localeCompare(playerLookup.get(b.player_id)?.name ?? '')
      ),
    }))
    .sort((a, b) => b.year - a.year);
}

function formatPlayerResult(stat: Tournament2026Data['playerStats'][number]): string {
  if (stat.singles_holes_played > 0) {
    return `${stat.singles_strokes}/${stat.singles_holes_played} holes`;
  }

  const legacyScore = stat.singles_strokes > 0 ? stat.singles_strokes : getLegacyNumber(stat.legacy_payload, 'score');

  return legacyScore === null ? '-' : `Score ${legacyScore}`;
}

function formatHolesWon(stat: Tournament2026Data['playerStats'][number]): string {
  if (stat.singles_holes_played === 0 && stat.holes_won === 0) {
    return '-';
  }

  return stat.holes_won.toString();
}

function formatSource(source: string): string {
  return source === 'migrated_firestore' ? 'Legacy' : source;
}

function getLegacyNumber(payload: Tournament2026Data['playerStats'][number]['legacy_payload'], key: string): number | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const value = payload[key as keyof typeof payload];

  return typeof value === 'number' ? value : null;
}

function HistoryScore({ label, usa, europe }: { label: string; usa: number; europe: number }) {
  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8B949E]">{label}</p>
      <p className="mt-1 text-sm leading-5 text-[#E6EDF3]">
        <span className="whitespace-nowrap">USA {usa}</span>
        <span className="text-[#8B949E]"> / </span>
        <span className="whitespace-nowrap">EUR {europe}</span>
      </p>
    </div>
  );
}

function LegacyGameRow({
  game,
}: {
  game: Tournament2026Data['history'][number]['games'][number];
}) {
  return (
    <div className="border-t border-[#27272A] px-3 py-3 first:border-t-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#FAFAFA]">
            {game.usa_player_name} vs {game.europe_player_name}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8B949E]">
            {game.status} · {game.use_legacy_handicap ? `${game.legacy_handicap_strokes} legacy strokes` : 'No legacy handicap'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-64">
          <HistoryScore label="Raw pts" usa={game.points_raw_usa} europe={game.points_raw_europe} />
          <HistoryScore
            label="Adj pts"
            usa={game.points_legacy_adjusted_usa}
            europe={game.points_legacy_adjusted_europe}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#8B949E]">
        Strokes USA {game.stroke_raw_usa} ({game.stroke_legacy_adjusted_usa} adj) - EUR{' '}
        {game.stroke_raw_europe} ({game.stroke_legacy_adjusted_europe} adj)
      </p>
    </div>
  );
}
