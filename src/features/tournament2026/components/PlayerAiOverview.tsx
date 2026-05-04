import { useId, useState } from 'react';
import { buildAiPlayerOverviewContext } from '../aiOverview';
import { generatePlayerAiOverview } from '../../../services/aiOverviewService';
import type {
  AiPlayerOverviewRow,
  PlayerRow,
  PlayerTournamentStatsRow,
} from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
import { getErrorMessage } from '../viewUtils';
import { MarkdownContent } from './MarkdownContent';
import { StatusCard } from './Layout';

export function PlayerAiOverview({
  player,
  playerStats,
  overview,
  canRegenerate,
  source,
  onSaved,
}: {
  player: PlayerRow;
  playerStats: PlayerTournamentStatsRow[];
  overview: AiPlayerOverviewRow | null;
  canRegenerate: boolean;
  source: 'profile' | 'history_popover';
  onSaved?: () => Promise<void>;
}) {
  const directionFieldId = useId();
  const directionHelpId = `${directionFieldId}-help`;
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateLabel = overview ? 'Regenerate' : 'Generate';
  const containerClassName =
    source === 'profile' ? '' : 'rounded-lg border border-[#27272A] bg-[#0C0C0E] p-3';

  const generate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      await generatePlayerAiOverview({
        playerId: player.id,
        context: buildAiPlayerOverviewContext(player, playerStats),
        customPrompt,
      });
      track2026('ai_player_overview_generated', {
        player_id: player.id,
        source,
        was_regeneration: Boolean(overview),
        has_custom_prompt: customPrompt.trim().length > 0,
      });
      await onSaved?.();
      setCustomPrompt('');
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      track2026('ai_player_overview_failed', {
        player_id: player.id,
        source,
        was_regeneration: Boolean(overview),
        has_custom_prompt: customPrompt.trim().length > 0,
        error: message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={containerClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#3FB950]">AI overview</p>
          {overview && (
            <p className="mt-1 text-[10px] tracking-[0.14em] text-[#8B949E]">
              Generated {formatGeneratedAt(overview.generated_at)}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3">
        {overview ? (
          <MarkdownContent>{overview.overview_markdown}</MarkdownContent>
        ) : (
          <p className="text-sm leading-6 text-[#A1A1AA]">
            No AI scouting dossier has been generated for {player.name} yet.
          </p>
        )}
      </div>
      {canRegenerate && (
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <label
            htmlFor={directionFieldId}
            className="block font-data text-xs tracking-[0.14em] text-[#8B949E]"
          >
            Optional direction
          </label>
          <p id={directionHelpId} className="mt-1 text-[11px] leading-5 tracking-normal text-[#A1A1AA]">
            Add a short note if you want the overview to focus on a specific tone or detail.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id={directionFieldId}
              type="text"
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              maxLength={600}
              aria-describedby={directionHelpId}
              className="min-h-10 flex-1 rounded-md border border-[#27272A] !bg-[#050506] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:!border-[#3FB950] focus:!ring-0"
            />
            <button
              type="submit"
              disabled={isGenerating}
              className="min-h-10 shrink-0 rounded-md border border-[#3FB950]/70 px-3 py-2 text-[10px] font-bold tracking-[0.12em] text-[#3FB950] disabled:cursor-not-allowed disabled:border-[#27272A] disabled:text-[#8B949E]"
            >
              {isGenerating ? 'Generating' : generateLabel}
            </button>
          </div>
        </form>
      )}
      {error && <StatusCard tone="error">{error}</StatusCard>}
    </div>
  );
}

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
