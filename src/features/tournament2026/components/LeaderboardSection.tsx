import { useEffect, useRef, useState } from 'react';
import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../../../domain/2026/matchPlayStatus';
import type {
  FixtureView,
  AiNewsroomArtifactRow,
  AiTournamentOverviewRow,
  PlayerRow,
  TournamentRow,
} from '../../../services/tournament2026Queries';
import type { CourseHoleMetadata } from '../../../domain/2026/course';
import {
  generateAiNewsroomArtifacts,
  generateTournamentAiOverview,
} from '../../../services/aiOverviewService';
import { track2026 } from '../../../utils/analytics';
import {
  AI_NEWSROOM_ARTIFACT_KINDS,
  buildAiNewsroomArtifactContext,
  countScoredTournamentHoles,
  shouldRegenerateNewsroomArtifacts,
  shouldRegenerateTournamentOverview,
} from '../aiOverview';
import { buildAiRecapSnapshot } from '../aiRecap';
import { buildProgressTimeline, generateTournamentHighlights } from '../insights';
import { calculateTotals, getErrorMessage } from '../viewUtils';
import type { TeamScore } from '../viewUtils';
import { CollapsibleSection, StatusCard } from './Layout';
import { LiveTournamentProgressChart } from './LiveTournamentProgressChart';
import { MarkdownContent } from './MarkdownContent';

export function LeaderboardSection({
  tournament,
  fixtures,
  players,
  courseHoles,
  aiTournamentOverview,
  aiNewsroomArtifacts,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  courseHoles: CourseHoleMetadata[];
  aiTournamentOverview: AiTournamentOverviewRow | null;
  aiNewsroomArtifacts: AiNewsroomArtifactRow[];
  onSaved: () => Promise<void>;
}) {
  const totals = calculateTotals(fixtures);
  const highlights = generateTournamentHighlights({ tournament, fixtures, players, courseHoles });
  const timeline = buildProgressTimeline(fixtures);
  const recentTimeline = timeline.slice(-8);
  const totalChartHoles = fixtures.reduce(
    (total, fixture) => total + calculateFixtureProgress(fixture.segments).totalHoles,
    0
  );
  const scoredHoleCount = countScoredTournamentHoles(fixtures);
  const scoreSummary = getScoreSummary(totals.overall);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);
  const [newsroomError, setNewsroomError] = useState<string | null>(null);
  const [isGeneratingNewsroom, setIsGeneratingNewsroom] = useState(false);
  const attemptedHoleCountRef = useRef<number | null>(null);
  const attemptedNewsroomHoleCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!tournament || isGeneratingOverview) return;

    const shouldGenerate = shouldRegenerateTournamentOverview({
      overview: aiTournamentOverview,
      scoredHoleCount,
    });

    if (!shouldGenerate || attemptedHoleCountRef.current === scoredHoleCount) {
      return;
    }

    attemptedHoleCountRef.current = scoredHoleCount;
    setIsGeneratingOverview(true);
    setOverviewError(null);

    const snapshot = buildAiRecapSnapshot({ tournament, fixtures, players, courseHoles });
    const trigger = aiTournamentOverview ? 'five_hole_interval' : 'initial';

    generateTournamentAiOverview({
      tournamentId: tournament.id,
      snapshot,
      sourceHoleScoreCount: scoredHoleCount,
    })
      .then(() => {
        track2026('ai_tournament_overview_generated', {
          tournament_id: tournament.id,
          source_hole_score_count: scoredHoleCount,
          trigger,
        });
        return onSaved();
      })
      .catch((error) => {
        const message = getErrorMessage(error);
        setOverviewError(message);
        track2026('ai_tournament_overview_failed', {
          tournament_id: tournament.id,
          source_hole_score_count: scoredHoleCount,
          trigger,
          error: message,
        });
      })
      .finally(() => setIsGeneratingOverview(false));
  }, [
    aiTournamentOverview,
    courseHoles,
    fixtures,
    isGeneratingOverview,
    onSaved,
    players,
    scoredHoleCount,
    tournament,
  ]);

  useEffect(() => {
    if (!tournament || isGeneratingNewsroom) return;

    const tournamentArtifacts = aiNewsroomArtifacts.filter(
      (artifact) => artifact.tournament_id === tournament.id
    );
    const shouldGenerate = shouldRegenerateNewsroomArtifacts({
      artifacts: tournamentArtifacts,
      scoredHoleCount,
    });

    if (!shouldGenerate || attemptedNewsroomHoleCountRef.current === scoredHoleCount) {
      return;
    }

    attemptedNewsroomHoleCountRef.current = scoredHoleCount;
    setIsGeneratingNewsroom(true);
    setNewsroomError(null);

    const snapshot = buildAiRecapSnapshot({ tournament, fixtures, players, courseHoles });
    const context = buildAiNewsroomArtifactContext({ snapshot, scoredHoleCount });
    const trigger = tournamentArtifacts.length === 0 ? 'initial' : 'five_hole_interval';

    generateAiNewsroomArtifacts({ tournamentId: tournament.id, context })
      .then((artifacts) => {
        track2026('ai_newsroom_generated', {
          tournament_id: tournament.id,
          source_hole_score_count: scoredHoleCount,
          artifact_count: artifacts.length,
          trigger,
        });
        return onSaved();
      })
      .catch((error) => {
        const message = getErrorMessage(error);
        setNewsroomError(message);
        track2026('ai_newsroom_failed', {
          tournament_id: tournament.id,
          source_hole_score_count: scoredHoleCount,
          trigger,
          error: message,
        });
      })
      .finally(() => setIsGeneratingNewsroom(false));
  }, [
    aiNewsroomArtifacts,
    courseHoles,
    fixtures,
    isGeneratingNewsroom,
    onSaved,
    players,
    scoredHoleCount,
    tournament,
  ]);

  return (
    <section className="relative overflow-hidden border-y border-[#27272A] bg-[#050506] sm:-mx-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#F2B84B]/70 via-[#3FB950]/60 to-[#58A6FF]/70" />
      <header className="relative grid gap-4 border-b border-[#27272A] px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.24em] text-[#3FB950]">Live scoring</p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.06em] text-[#FAFAFA] sm:text-3xl">
            Live Leaderboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A1A1AA]">
            {tournament?.name ?? 'Tournament board'} · {scoredHoleCount}/{totalChartHoles} saved holes
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:justify-end">
          <div className="border border-[#27272A] bg-[#09090B] px-3 py-2 text-right">
            <p className="text-[10px] tracking-[0.18em] text-[#8B949E]">Match state</p>
            <p className={`mt-1 text-lg font-bold tracking-[-0.04em] ${scoreSummary.className}`}>
              {scoreSummary.label}
            </p>
          </div>
          <span className="border border-[#3FB950]/60 bg-[#06170B] px-2 py-1 text-[10px] tracking-[0.14em] text-[#3FB950]">
            Live
          </span>
        </div>
      </header>
      <CollapsibleSection
        title="Score Ledger"
        description="Overall score first, then how it splits between foursomes and singles."
        meta={scoreSummary.label}
      >
        <ScoreLedger totals={totals} />
      </CollapsibleSection>
      <CollapsibleSection
        title="Live Score Curve"
        description="Tournament movement across saved holes."
        meta={`${timeline.length} moves`}
      >
        <LiveTournamentProgressChart points={timeline} totalHoles={totalChartHoles} />
      </CollapsibleSection>
      <CollapsibleSection
        title="Highlights Reel"
        description="Fast read on what matters right now."
        meta={`${highlights.length} highlights`}
      >
        <InsightList items={highlights} />
      </CollapsibleSection>
      <AiTournamentOverviewSection
        overview={aiTournamentOverview}
        error={overviewError}
        isGenerating={isGeneratingOverview}
        scoredHoleCount={scoredHoleCount}
      />
      <ProgressTimeline points={recentTimeline} totalPoints={timeline.length} />
      <AiNewsroomGrid
        artifacts={tournament ? aiNewsroomArtifacts.filter((artifact) => artifact.tournament_id === tournament.id) : []}
        error={newsroomError}
        isGenerating={isGeneratingNewsroom}
      />
      <CollapsibleSection
        title="Fixture Progress"
        description="Match status by group and segment."
        meta={`${fixtures.length} fixtures`}
      >
        {fixtures.length === 0 ? (
          <p className="px-3 py-3 text-sm text-[#8B949E] sm:px-4">No fixtures yet.</p>
        ) : (
          fixtures.map((fixture) => <FixtureProgressRow key={fixture.id} fixture={fixture} />)
        )}
      </CollapsibleSection>
    </section>
  );
}

function AiTournamentOverviewSection({
  overview,
  error,
  isGenerating,
  scoredHoleCount,
}: {
  overview: AiTournamentOverviewRow | null;
  error: string | null;
  isGenerating: boolean;
  scoredHoleCount: number;
}) {
  return (
    <CollapsibleSection
      title="Tournament Overview"
      description="Auto-updates every 5 newly saved holes."
      meta={isGenerating ? 'Generating' : `${scoredHoleCount} holes`}
    >
      {error && (
        <div className="px-3 sm:px-4">
          <StatusCard tone="error">{error}</StatusCard>
        </div>
      )}
      {overview ? (
        <div className="px-3 py-3 sm:px-4">
          <MarkdownContent>{overview.overview_markdown}</MarkdownContent>
          <p className="mt-2 text-[10px] tracking-[0.12em] text-[#8B949E]">
            Generated at {overview.source_hole_score_count} saved holes.
          </p>
        </div>
      ) : (
        <p className="px-3 py-3 text-sm leading-6 text-[#A1A1AA] sm:px-4">
          Waiting for the booth to file its first persisted dispatch.
        </p>
      )}
    </CollapsibleSection>
  );
}

function InsightList({ items }: { items: string[] }) {
  return (
    <div className="px-3 py-3 sm:px-4">
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-[#E6EDF3]">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function AiNewsroomGrid({
  artifacts,
  error,
  isGenerating,
}: {
  artifacts: AiNewsroomArtifactRow[];
  error: string | null;
  isGenerating: boolean;
}) {
  const artifactByKind = new Map(artifacts.map((artifact) => [artifact.kind, artifact]));
  const orderedArtifacts = AI_NEWSROOM_ARTIFACT_KINDS.map((kind) => artifactByKind.get(kind)).filter(
    (artifact): artifact is AiNewsroomArtifactRow => Boolean(artifact)
  );

  return (
    <CollapsibleSection
      title="Newsroom"
      description="Live copy from the scoreboard once the round has enough signal."
      meta={isGenerating ? 'Filing copy' : `${artifacts.length}/${AI_NEWSROOM_ARTIFACT_KINDS.length} cards`}
    >
      {error && (
        <div className="px-3 sm:px-4">
          <StatusCard tone="error">{error}</StatusCard>
        </div>
      )}
      {orderedArtifacts.length === 0 ? (
        <div className="px-3 pb-3 sm:px-4">
          <StatusCard>
            {isGenerating
              ? 'Filing the first newsroom cards…'
              : 'No newsroom cards yet. Save more holes and the booth will wake up.'}
          </StatusCard>
        </div>
      ) : (
        <div className="border-t border-[#27272A]">
          {orderedArtifacts.map((artifact) => (
            <article key={artifact.kind} className="border-t border-[#27272A] px-3 py-3 first:border-t-0 sm:px-4">
              <p className="text-[10px] tracking-[0.16em] text-[#8B949E]">{artifact.title}</p>
              <div className="mt-2">
                <MarkdownContent>{artifact.body_markdown}</MarkdownContent>
                <p className="mt-2 text-[10px] tracking-[0.12em] text-[#8B949E]">
                  Filed at {artifact.source_hole_score_count} saved holes.
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

function ProgressTimeline({
  points,
  totalPoints,
}: {
  points: ReturnType<typeof buildProgressTimeline>;
  totalPoints: number;
}) {
  if (points.length === 0) {
    return (
      <CollapsibleSection title="Score Movement" description="Latest saved-hole movement." meta={`0 of ${totalPoints}`}>
        <div className="px-3 pb-3 sm:px-4">
          <StatusCard>No score movement yet.</StatusCard>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Score Movement"
      description="Latest saved-hole movement."
      meta={`Last ${points.length} of ${totalPoints}`}
    >
      <div className="space-y-2 px-3 py-3 sm:px-4">
        {points.map((point) => (
          <div key={point.id} className="grid gap-1 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-[#FAFAFA]">{point.label}</p>
              <p className="text-[#8B949E]">{formatTime(point.updatedAt)}</p>
            </div>
            <p className="tabular-nums text-[#E6EDF3] sm:text-right">
              USA {point.usa} - EUR {point.europe}
              {point.halved > 0 ? ` (${point.halved} H)` : ''}
            </p>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

function ScoreLedger({ totals }: { totals: { overall: TeamScore; foursomes: TeamScore; singles: TeamScore } }) {
  return (
    <div className="bg-[#050506]">
      <ScoreLedgerRow label="Overall" score={totals.overall} isPrimary />
      <ScoreLedgerRow label="Foursomes" score={totals.foursomes} />
      <ScoreLedgerRow label="Singles" score={totals.singles} />
    </div>
  );
}

function ScoreLedgerRow({
  label,
  score,
  isPrimary = false,
}: {
  label: string;
  score: TeamScore;
  isPrimary?: boolean;
}) {
  return (
    <div
      className={`border-t border-[#27272A] px-3 py-3 first:border-t-0 sm:px-4 ${
        isPrimary ? 'bg-[radial-gradient(circle_at_top_right,rgba(63,185,80,0.12),transparent_34%)] py-4' : ''
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.2em] text-[#8B949E]">{label}</p>
          <p className="mt-1 text-xs tracking-[0.14em] text-[#8B949E]">
            {score.halved} halved · {score.unplayed} unplayed
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 tabular-nums sm:min-w-[24rem] sm:gap-5">
          <TeamTotal label="USA" value={score.USA} className="text-[#F2B84B]" isPrimary={isPrimary} />
          <span className="pb-1 text-center text-sm tracking-[0.18em] text-[#3F3F46] sm:pb-2">vs</span>
          <TeamTotal
            label="Europe"
            value={score.EUROPE}
            className="text-[#58A6FF]"
            isPrimary={isPrimary}
            align="right"
          />
        </div>
      </div>
    </div>
  );
}

function TeamTotal({
  label,
  value,
  className,
  isPrimary = false,
  align = 'left',
}: {
  label: string;
  value: number;
  className: string;
  isPrimary?: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <div>
      <p className={`text-xs tracking-[0.18em] text-[#8B949E] ${align === 'right' ? 'text-right' : ''}`}>
        {label}
      </p>
      <p
        className={`font-bold tracking-[-0.07em] tabular-nums ${
          isPrimary ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'
        } ${align === 'right' ? 'text-right' : ''} ${className}`}
      >
        {value}
      </p>
    </div>
  );
}

function FixtureProgressRow({ fixture }: { fixture: FixtureView }) {
  const progress = calculateFixtureProgress(fixture.segments);

  return (
    <div className="border-b border-[#27272A] px-3 py-3 last:border-b-0 sm:px-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem] sm:items-start">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
            {fixture.name ?? `Fixture ${fixture.sort_order + 1}`}
          </p>
          <p className="mt-1 text-xs tracking-[0.14em] text-[#8B949E]">
            {progress.completedHoles}/{progress.totalHoles} holes · {progress.percent}%
          </p>
        </div>
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#18181B]">
            <div className="h-full bg-[#3FB950]" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {fixture.segments.map((segment) => {
          const status = calculateSegmentMatchPlayStatus(segment);

          return (
            <span
              key={segment.id}
              className="border border-[#27272A] bg-[#0C0C0E] px-2 py-1 text-[10px] tracking-[0.14em] text-[#A1A1AA]"
            >
              {segment.name ?? segment.kind}: {status.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function getScoreSummary(score: TeamScore): { label: string; className: string } {
  const lead = Math.abs(score.USA - score.EUROPE);

  if (lead === 0) {
    return { label: 'All square', className: 'text-[#FAFAFA]' };
  }

  if (score.USA > score.EUROPE) {
    return { label: `USA +${lead}`, className: 'text-[#F2B84B]' };
  }

  return { label: `Europe +${lead}`, className: 'text-[#58A6FF]' };
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
