import type { Tournament2026Data } from '../../../services/tournament2026Queries';
import { Panel, StatusCard } from './Layout';

export function HistorySection({
  history,
  players,
  playerStats,
}: {
  history: Tournament2026Data['history'];
  players: Tournament2026Data['players'];
  playerStats: Tournament2026Data['playerStats'];
}) {
  return (
    <Panel title="Historical Results" eyebrow="Legacy Firebase archive">
      <PlayerArchive players={players} playerStats={playerStats} />
      {history.length === 0 ? (
        <StatusCard>No historical tournaments have been imported yet.</StatusCard>
      ) : (
        <div className="-mx-4 sm:mx-0">
          {history.map((tournament) => (
            <details key={tournament.id} className="border-t border-[#27272A] bg-[#050505] first:border-t-0">
              <summary className="cursor-pointer list-none px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">{tournament.year}</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold tracking-[-0.04em] text-[#FAFAFA]">{tournament.name}</h3>
                  <span className="shrink-0 border border-[#27272A] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#A1A1AA]">
                    {tournament.games.length} games
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <HistoryScore
                    label="Raw"
                    usa={tournament.total_raw_usa}
                    europe={tournament.total_raw_europe}
                  />
                  <HistoryScore
                    label="Legacy adjusted"
                    usa={tournament.total_legacy_adjusted_usa}
                    europe={tournament.total_legacy_adjusted_europe}
                  />
                </div>
              </summary>
              <div className="border-t border-[#27272A]">
                {tournament.games.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[#8B949E]">No legacy game rows imported for this tournament.</p>
                ) : (
                  tournament.games.map((game) => <LegacyGameRow key={game.id} game={game} />)
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </Panel>
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
  const visibleStats = [...playerStats].sort((a, b) => {
    if (a.completion_year !== b.completion_year) {
      return b.completion_year - a.completion_year;
    }

    return (playerLookup.get(a.player_id)?.name ?? '').localeCompare(
      playerLookup.get(b.player_id)?.name ?? ''
    );
  });

  return (
    <div className="-mx-4 border-t border-[#27272A] sm:mx-0">
      <div className="px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3FB950]">Player archive</p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Finalized 2026 app stats, including migrated/imported rows when available.
        </p>
      </div>
      {visibleStats.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-[#8B949E]">No player stat rows have been saved yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-y border-[#27272A] bg-[#0C0C0E] uppercase tracking-[0.16em] text-[#8B949E]">
              <tr>
                <th className="px-4 py-2">Year</th>
                <th className="px-4 py-2">Player</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Singles</th>
                <th className="px-4 py-2">Won</th>
                <th className="px-4 py-2">CPI after</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {visibleStats.map((stat) => {
                const player = playerLookup.get(stat.player_id);

                return (
                  <tr key={stat.id}>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[#E6EDF3]">
                      {stat.completion_year}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-[#FAFAFA]">
                      {player?.name ?? 'Unknown player'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 uppercase text-[#8B949E]">{stat.source}</td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[#A1A1AA]">
                      {stat.singles_strokes}/{stat.singles_holes_played}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[#A1A1AA]">
                      {stat.holes_won}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[#A1A1AA]">
                      {stat.cpi_after ?? '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistoryScore({ label, usa, europe }: { label: string; usa: number; europe: number }) {
  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">{label}</p>
      <p className="mt-1 text-lg text-[#E6EDF3]">
        USA {usa} - EUR {europe}
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
    <div className="border-t border-[#27272A] px-4 py-3 first:border-t-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#FAFAFA]">
            {game.usa_player_name} vs {game.europe_player_name}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8B949E]">
            {game.status} · {game.use_legacy_handicap ? `${game.legacy_handicap_strokes} legacy strokes` : 'No legacy handicap'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-72">
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
