import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AiPlayerOverviewRow,
  PlayerRow,
  PlayerTournamentStatsRow,
  ProfileRow,
} from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
import { formatPlayerTier } from '../viewUtils';
import { PlayerAiOverview } from './PlayerAiOverview';

const TEAM_EMOJI = {
  USA: '🇺🇸',
  EUROPE: '🇪🇺',
} as const;

interface PlayerHistoryContextValue {
  openPlayerHistory: (playerId: string) => void;
}

const PlayerHistoryContext = createContext<PlayerHistoryContextValue | null>(null);

export function PlayerHistoryProvider({
  players,
  playerStats,
  aiPlayerOverviews = [],
  profile,
  onSaved,
  children,
}: {
  players: PlayerRow[];
  playerStats: PlayerTournamentStatsRow[];
  aiPlayerOverviews?: AiPlayerOverviewRow[];
  profile?: ProfileRow | null;
  onSaved?: () => Promise<void>;
  children: ReactNode;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const playerLookup = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const selectedPlayer = selectedPlayerId ? playerLookup.get(selectedPlayerId) : null;
  const selectedPlayerStats = useMemo(
    () =>
      selectedPlayerId
        ? playerStats
            .filter((stat) => stat.player_id === selectedPlayerId)
            .sort((a, b) => b.completion_year - a.completion_year)
        : [],
    [playerStats, selectedPlayerId]
  );
  const value = useMemo(
    () => ({
      openPlayerHistory: setSelectedPlayerId,
    }),
    []
  );

  return (
    <PlayerHistoryContext.Provider value={value}>
      {children}
      {selectedPlayerId && (
        <PlayerHistoryPopover
          player={selectedPlayer}
          stats={selectedPlayerStats}
          overview={
            selectedPlayerId
              ? aiPlayerOverviews.find((overview) => overview.player_id === selectedPlayerId) ?? null
              : null
          }
          canRegenerate={Boolean(
            selectedPlayerId && (profile?.is_admin || profile?.linked_player_id === selectedPlayerId)
          )}
          onSaved={onSaved}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </PlayerHistoryContext.Provider>
  );
}

export function PlayerHistoryTrigger({
  player,
  playerId,
  fallback,
  children,
  className = '',
}: {
  player?: PlayerRow | null;
  playerId?: string | null;
  fallback?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const context = useContext(PlayerHistoryContext);
  const targetPlayerId = player?.id ?? playerId;

  if (!context || !targetPlayerId) {
    return <>{children ?? fallback ?? player?.name ?? 'Unknown player'}</>;
  }

  const label = player?.name ?? (typeof fallback === 'string' ? fallback : 'player');

  return (
    <button
      type="button"
      onClick={() => {
        track2026('player_history_opened', {
          player_id: targetPlayerId,
          has_player_record: Boolean(player),
        });
        context.openPlayerHistory(targetPlayerId);
      }}
      aria-label={`Open ${label} history`}
      data-player-history-trigger={targetPlayerId}
      className={`text-left hover:text-[#3FB950] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950] ${className}`}
    >
      {children ?? player?.name ?? fallback ?? 'Unknown player'}
    </button>
  );
}

export function PlayerIdentity({
  player,
  fallback = 'Unknown player',
  showTeam = true,
  showTier = false,
}: {
  player?: PlayerRow | null;
  fallback?: string;
  showTeam?: boolean;
  showTier?: boolean;
}) {
  const teamEmoji = player?.team === 'EUROPE' ? TEAM_EMOJI.EUROPE : TEAM_EMOJI.USA;
  const teamLabel = player?.team === 'EUROPE' ? 'Europe' : 'USA';

  return (
    <span className="inline-flex max-w-48 items-center gap-2">
      {showTeam && <span aria-label={teamLabel} title={teamLabel}>{teamEmoji}</span>}
      {player?.custom_emoji && <span>{player.custom_emoji}</span>}
      <span className="truncate">{player?.name ?? fallback}</span>
      {showTier && player && (
        <span className="shrink-0 whitespace-nowrap rounded-sm border border-[#27272A] px-1.5 py-0.5 text-[10px] tracking-[0.12em] text-[#8B949E]">
          {formatPlayerTier(player.tier)}
        </span>
      )}
    </span>
  );
}

export function getPlayerArchiveScore(
  stat: PlayerTournamentStatsRow,
  mode: 'raw' | 'handicap'
): string {
  return formatNumber(getPlayerArchiveScoreNumber(stat, mode));
}

export function getPlayerArchiveScoreNumber(
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

export function getPlayerArchivePoints(
  stat: PlayerTournamentStatsRow,
  mode: 'raw' | 'handicap'
): string {
  return formatNumber(getPlayerArchivePointsNumber(stat, mode));
}

export function getPlayerArchivePointsNumber(
  stat: PlayerTournamentStatsRow,
  mode: 'raw' | 'handicap'
): number | null {
  const payloadKey = mode === 'raw' ? 'pointsEarned' : 'pointsEarnedAdjusted';

  return getLegacyNumber(stat.legacy_payload, payloadKey);
}

export function getPlayerArchiveHolesWonNumber(stat: PlayerTournamentStatsRow): number | null {
  if (stat.singles_holes_played === 0 && stat.holes_won === 0) {
    return getLegacyNumber(stat.legacy_payload, 'holesWon');
  }

  return stat.holes_won;
}

export function formatNumber(value: number | null): string {
  return value === null ? '-' : value.toString();
}

export function getLegacyNumber(payload: PlayerTournamentStatsRow['legacy_payload'], key: string): number | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const value = payload[key as keyof typeof payload];

  return typeof value === 'number' ? value : null;
}

function PlayerHistoryPopover({
  player,
  stats,
  overview,
  canRegenerate,
  onSaved,
  onClose,
}: {
  player: PlayerRow | null | undefined;
  stats: PlayerTournamentStatsRow[];
  overview: AiPlayerOverviewRow | null;
  canRegenerate: boolean;
  onSaved?: () => Promise<void>;
  onClose: () => void;
}) {
  const teamEmoji = player?.team === 'EUROPE' ? TEAM_EMOJI.EUROPE : TEAM_EMOJI.USA;
  const teamLabel = player?.team === 'EUROPE' ? 'Europe' : 'USA';

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    document.addEventListener('keydown', handleEscape, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleEscape, { capture: true });
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70 px-3 py-4 sm:items-center sm:justify-center"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${player?.name ?? 'Player'} history`}
        className="max-h-[85vh] w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B] shadow-[0_18px_42px_rgba(0,0,0,0.42)] sm:max-w-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#27272A] px-3 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#3FB950]">Player history</p>
            <h3 className="mt-1 truncate text-xl font-bold tracking-[-0.04em] text-[#FAFAFA]">
              <span aria-label={teamLabel} title={teamLabel}>{teamEmoji}</span>{' '}
              {player?.custom_emoji && <span>{player.custom_emoji} </span>}
              {player?.name ?? 'Unknown player'}
            </h3>
            <p className="mt-1 text-xs tracking-[0.14em] text-[#8B949E]">
              <span>Current handicap</span>{' '}
              <span className="tabular-nums text-[#E6EDF3]">{formatNumber(player?.current_cpi ?? null)}</span>
              {player && (
                <>
                  {' '}· <span className="text-[#E6EDF3]">{formatPlayerTier(player.tier)}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#27272A] px-3 py-2 text-[10px] font-bold tracking-[0.14em] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#E6EDF3]"
          >
            Close
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden px-3 py-3">
          {player && (
            <div className="mb-3">
              <PlayerAiOverview
                player={player}
                playerStats={stats}
                overview={overview}
                canRegenerate={canRegenerate}
                source="history_popover"
                onSaved={onSaved}
              />
            </div>
          )}
          {stats.length === 0 ? (
            <p className="text-sm text-[#8B949E]">No historical rows for this player yet.</p>
          ) : (
            <div
              role="region"
              aria-label="Player history table"
              tabIndex={0}
              className="-mx-3 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950] [&::-webkit-scrollbar]:hidden"
            >
              <table className="min-w-[42rem] text-left text-xs">
                <thead className="border-b border-[#27272A] tracking-[0.16em] text-[#8B949E]">
                  <tr>
                    <th className="whitespace-nowrap px-2 py-2">Year</th>
                    <th className="whitespace-nowrap px-2 py-2">Score raw</th>
                    <th className="whitespace-nowrap px-2 py-2">Score legacy adj.</th>
                    <th className="whitespace-nowrap px-2 py-2">Points raw</th>
                    <th className="whitespace-nowrap px-2 py-2">Points legacy adj.</th>
                    <th className="whitespace-nowrap px-2 py-2">Holes won</th>
                    <th className="whitespace-nowrap px-2 py-2">Overall handicap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {stats.map((stat) => (
                    <tr key={stat.id}>
                      <td className="whitespace-nowrap px-2 py-2 font-bold tabular-nums text-[#FAFAFA]">
                        {stat.completion_year}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#A1A1AA]">
                        {getPlayerArchiveScore(stat, 'raw')}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#A1A1AA]">
                        {getPlayerArchiveScore(stat, 'handicap')}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#A1A1AA]">
                        {getPlayerArchivePoints(stat, 'raw')}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#A1A1AA]">
                        {getPlayerArchivePoints(stat, 'handicap')}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#A1A1AA]">
                        {formatNumber(getPlayerArchiveHolesWonNumber(stat))}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#A1A1AA]">
                        {formatNumber(stat.cpi_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
