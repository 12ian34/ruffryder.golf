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
import { Panel, StatusCard } from './Layout';
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
  const scoredHoleCount = countScoredTournamentHoles(fixtures);
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
    <Panel title="Live Leaderboard" eyebrow="Supabase realtime">
      <div className="grid gap-3 md:grid-cols-3">
        <ScoreTile label="Overall" score={totals.overall} />
        <ScoreTile label="Foursomes" score={totals.foursomes} />
        <ScoreTile label="Singles" score={totals.singles} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InsightCard title="Highlights Reel" items={highlights} />
        <AiTournamentOverviewCard
          overview={aiTournamentOverview}
          error={overviewError}
          isGenerating={isGeneratingOverview}
          scoredHoleCount={scoredHoleCount}
        />
        <ProgressTimeline points={recentTimeline} totalPoints={timeline.length} />
      </div>
      <AiNewsroomGrid
        artifacts={tournament ? aiNewsroomArtifacts.filter((artifact) => artifact.tournament_id === tournament.id) : []}
        error={newsroomError}
        isGenerating={isGeneratingNewsroom}
      />
      <div className="-mx-3 mt-4 border-t border-[#27272A] sm:mx-0">
        {fixtures.length === 0 ? (
          <p className="px-3 py-3 text-sm text-[#8B949E]">No fixtures yet.</p>
        ) : (
          fixtures.map((fixture) => <FixtureProgressRow key={fixture.id} fixture={fixture} />)
        )}
      </div>
    </Panel>
  );
}

function AiTournamentOverviewCard({
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
    <div className="rounded-lg border border-[#27272A] bg-[#0C0C0E] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#8B949E]">AI Tournament Overview</p>
          <p className="mt-1 text-xs text-[#8B949E]">
            Auto-updates every 5 newly saved holes.
          </p>
        </div>
        <span className="shrink-0 rounded border border-[#27272A] px-2 py-1 text-[10px] tracking-[0.12em] text-[#8B949E]">
          {isGenerating ? 'Generating' : `${scoredHoleCount} holes`}
        </span>
      </div>
      {error && <StatusCard tone="error">{error}</StatusCard>}
      {overview ? (
        <div className="mt-3">
          <MarkdownContent>{overview.overview_markdown}</MarkdownContent>
          <p className="mt-2 text-[10px] tracking-[0.12em] text-[#8B949E]">
            Generated at {overview.source_hole_score_count} saved holes.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#A1A1AA]">
          Waiting for the booth to file its first persisted dispatch.
        </p>
      )}
    </div>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs tracking-[0.2em] text-[#8B949E]">{title}</p>
      <div className="mt-3 space-y-2">
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
    <div className="mt-4 rounded-lg border border-[#27272A] bg-[#0C0C0E] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#8B949E]">AI Newsroom</p>
          <p className="mt-1 text-xs text-[#8B949E]">
            Live copy from the scoreboard once the round has enough signal.
          </p>
        </div>
        <span className="rounded border border-[#27272A] px-2 py-1 text-[10px] tracking-[0.12em] text-[#8B949E]">
          {isGenerating ? 'Filing copy' : `${artifacts.length}/${AI_NEWSROOM_ARTIFACT_KINDS.length} cards`}
        </span>
      </div>
      {error && <StatusCard tone="error">{error}</StatusCard>}
      {orderedArtifacts.length === 0 ? (
        <StatusCard>
          {isGenerating
            ? 'Filing the first newsroom cards...'
            : 'No newsroom cards yet. Save more holes and the booth will wake up.'}
        </StatusCard>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orderedArtifacts.map((artifact) => (
            <div key={artifact.kind} className="rounded border border-[#27272A] bg-[#18181B] p-3">
              <p className="text-[10px] tracking-[0.16em] text-[#8B949E]">{artifact.title}</p>
              <div className="mt-2">
                <MarkdownContent>{artifact.body_markdown}</MarkdownContent>
                <p className="mt-2 text-[10px] tracking-[0.12em] text-[#8B949E]">
                  Filed at {artifact.source_hole_score_count} saved holes.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
      <div className="rounded-lg border border-[#27272A] bg-[#0C0C0E] p-3">
        <p className="text-xs tracking-[0.2em] text-[#8B949E]">Score Movement</p>
        <StatusCard>No score movement yet.</StatusCard>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#27272A] bg-[#0C0C0E] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs tracking-[0.2em] text-[#8B949E]">Score Movement</p>
        <span className="text-[10px] tracking-[0.14em] text-[#8B949E]">
          Last {points.length} of {totalPoints}
        </span>
      </div>
      <div className="mt-3 space-y-2">
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
    </div>
  );
}

function ScoreTile({ label, score }: { label: string; score: TeamScore }) {
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] p-3">
      <p className="text-xs tracking-[0.2em] text-[#8B949E]">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <TeamTotal label="USA" value={score.USA} className="text-[#FACC15]" />
        <TeamTotal label="Europe" value={score.EUROPE} className="text-[#60A5FA]" />
      </div>
      <p className="mt-3 text-xs text-[#8B949E]">
        {score.halved} halved, {score.unplayed} unplayed
      </p>
    </div>
  );
}

function TeamTotal({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div>
      <p className="text-xs tracking-[0.18em] text-[#8B949E]">{label}</p>
      <p className={`text-3xl font-bold tracking-[-0.07em] ${className}`}>{value}</p>
    </div>
  );
}

function FixtureProgressRow({ fixture }: { fixture: FixtureView }) {
  const progress = calculateFixtureProgress(fixture.segments);

  return (
    <div className="border-b border-[#27272A] px-3 py-3 last:border-b-0">
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

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
