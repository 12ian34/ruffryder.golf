import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  buildPointsProgressTimeline,
  buildProgressTimeline,
  generateTournamentHighlights,
  type ProgressPointPlayer,
  type ProgressPointSide,
} from '../insights';
import { calculatePointTotals, type PointsBreakdown, type TeamPoints } from '../../../domain/2026/points';
import { calculateTotals, getErrorMessage } from '../viewUtils';
import type { TeamScore } from '../viewUtils';
import { buildWinPressureForecast } from '../winProbability';
import { BackNineIndividualTotalsCard } from './BackNineIndividualTotalsCard';
import { FixtureTitleTrigger } from './FixtureDetailsPopover';
import { CollapsibleSection, StatusCard } from './Layout';
import { LiveTournamentProgressChart } from './LiveTournamentProgressChart';
import { MarkdownContent } from './MarkdownContent';
import { PlayerHistoryTrigger } from './PlayerHistory';

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
  const pointTotals = useMemo(() => calculatePointTotals(fixtures), [fixtures]);
  const backNineFixtures = useMemo(
    () =>
      fixtures
        .map((fixture) => ({
          fixture,
          segments: fixture.segments.filter(
            (segment) =>
              segment.kind === 'singles' &&
              segment.holeScores.some((score) => score.outcome !== 'unplayed')
          ),
        }))
        .filter((entry) => entry.segments.length > 0),
    [fixtures]
  );
  const pointsTimeline = useMemo(() => buildPointsProgressTimeline(fixtures, players), [fixtures, players]);
  const winPressure = useMemo(
    () => buildWinPressureForecast({ fixtures, players, tournament }),
    [fixtures, players, tournament]
  );
  const highlights = generateTournamentHighlights({ tournament, fixtures, players, courseHoles });
  const timeline = buildProgressTimeline(fixtures, players);
  const reverseTimeline = useMemo(() => timeline.slice().reverse(), [timeline]);
  const totalChartHoles = fixtures.reduce(
    (total, fixture) => total + calculateFixtureProgress(fixture.segments).totalHoles,
    0
  );
  const scoredHoleCount = countScoredTournamentHoles(fixtures);
  const boardStatus = getBoardStatus({
    score: tournament?.is_complete ? pointTotals.onTable.overall : pointTotals.provisional.overall,
    scoredHoleCount,
    totalHoleCount: totalChartHoles,
    tournament,
  });
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
    <section className="relative overflow-x-clip border-y border-[#27272A] bg-[#050506] sm:-mx-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#F2B84B]/70 via-[#3FB950]/60 to-[#58A6FF]/70" />
      <header className="relative grid gap-4 border-b border-[#27272A] px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className={`text-[10px] lowercase tracking-[0.24em] ${boardStatus.kickerClassName}`}>
            {boardStatus.kicker}
          </p>
          <h2 className="mt-1 text-2xl font-bold lowercase tracking-[-0.06em] text-[#FAFAFA] sm:text-3xl">
            {boardStatus.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm lowercase leading-6 text-[#A1A1AA]">
            {tournament?.name ?? 'tournament board'} · {boardStatus.progressLabel}
          </p>
        </div>
        <div className="min-w-0 border-t border-[#27272A] pt-3 lg:border-t-0 lg:pt-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-[0.14em] text-[#8B949E] lg:justify-end">
            <span className={`h-1.5 w-1.5 rounded-full ${boardStatus.dotClassName}`} aria-hidden="true" />
            <span className={boardStatus.stateClassName}>{boardStatus.stateLabel}</span>
            <span className="text-[#3F3F46]">/</span>
            <span className={`font-bold tracking-[-0.03em] ${boardStatus.scoreClassName}`}>
              {boardStatus.scoreLabel}
            </span>
            <span className="text-[#3F3F46]">/</span>
            <span>{boardStatus.progressLabel}</span>
          </p>
        </div>
      </header>
      {backNineFixtures.length > 0 && (
        <CollapsibleSection
          title="Back 9 Singles Totals"
          description="Per-player strokes on the back 9, with handicap-adjusted net where CPI applies."
          meta={`${backNineFixtures.length} ${backNineFixtures.length === 1 ? 'fixture' : 'fixtures'}`}
        >
          <div>
            {backNineFixtures.map(({ fixture, segments }) => (
              <div key={fixture.id} className="border-b border-[#27272A] last:border-b-0">
                <div className="px-3 py-2 sm:px-4">
                  <p className="font-data text-[10px] lowercase tracking-[0.16em] text-[#8B949E]">
                    {fixture.name ?? `Fixture ${fixture.sort_order + 1}`}
                  </p>
                </div>
                <BackNineIndividualTotalsCard
                  segments={segments}
                  players={players}
                  variant="standalone"
                />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
      <CollapsibleSection
        title="Overall Score"
        description="Match-play points (and stroke-play in 1v1 fixtures). On-table is decided matches; provisional projects current leaders."
        meta={formatPointsMeta(pointTotals.onTable.overall, pointTotals.provisional.overall)}
      >
        <PointsLedger totals={pointTotals} />
      </CollapsibleSection>
      <CollapsibleSection
        title="Points Curve"
        description="Provisional team points across saved holes."
        meta={`${pointsTimeline.length} moves`}
      >
        <LiveTournamentProgressChart points={pointsTimeline} totalHoles={totalChartHoles} />
      </CollapsibleSection>
      <CollapsibleSection
        title="Holes Won"
        description="Per-hole tally across foursomes and singles. Momentum, not the score."
        meta={boardStatus.scoreLabel}
      >
        <ScoreLedger totals={totals} />
      </CollapsibleSection>
      <WinPressureSection forecast={winPressure} />
      <CollapsibleSection
        title="Holes Won Curve"
        description="Per-hole tally over time. Momentum, not the score."
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
      <ProgressTimeline points={reverseTimeline} />
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
          fixtures.map((fixture) => <FixtureProgressRow key={fixture.id} fixture={fixture} players={players} />)
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
  if (items.length === 0) {
    return (
      <div className="px-3 pb-3 sm:px-4">
        <StatusCard>No wild highlights yet. Save more scores and this reel will fill in.</StatusCard>
      </div>
    );
  }

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
}: {
  points: ReturnType<typeof buildProgressTimeline>;
}) {
  if (points.length === 0) {
    return (
      <CollapsibleSection title="Score Movement" description="Newest saved holes first." meta="0 saved">
        <div className="px-3 pb-3 sm:px-4">
          <StatusCard>No score movement yet.</StatusCard>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Score Movement"
      description="Newest saved holes first."
      meta={`${points.length} saved`}
    >
      <div className="divide-y divide-[#18181B] px-3 sm:px-4">
        {points.map((point) => (
          <ProgressTimelineRow key={point.id} point={point} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function ProgressTimelineRow({ point }: { point: ReturnType<typeof buildProgressTimeline>[number] }) {
  const usaSide = point.sides.find((side) => side.team === 'USA');
  const europeSide = point.sides.find((side) => side.team === 'EUROPE');
  const usaWon = point.holeOutcome === 'USA';
  const europeWon = point.holeOutcome === 'EUROPE';

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 py-2 text-xs">
      <div className="flex flex-col items-end pt-0.5 tabular-nums leading-tight text-[#8B949E]">
        <span>{formatTime(point.updatedAt)}</span>
        <span className="text-[10px] tracking-[0.14em] text-[#52525B]">H{point.holeNumber}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-x-2 leading-tight">
        <ProgressTimelineSide
          side={usaSide}
          align="right"
          teamClassName="text-[#F2B84B]"
        />
        <ProgressTimelineScore value={point.holeUsaScore} won={usaWon} />
        <span className="text-[10px] tracking-[0.18em] text-[#3F3F46]">vs</span>
        <ProgressTimelineScore value={point.holeEuropeScore} won={europeWon} />
        <ProgressTimelineSide
          side={europeSide}
          align="left"
          teamClassName="text-[#58A6FF]"
        />
      </div>
    </div>
  );
}

function ProgressTimelineSide({
  side,
  align,
  teamClassName,
}: {
  side: ProgressPointSide | undefined;
  align: 'left' | 'right';
  teamClassName: string;
}) {
  const alignClass = align === 'right' ? 'justify-end text-right' : 'justify-start text-left';

  if (!side || side.players.length === 0) {
    return <span className={`flex min-w-0 ${alignClass} text-[#52525B]`}>—</span>;
  }

  return (
    <span className={`flex min-w-0 items-baseline gap-x-1.5 ${alignClass}`}>
      <span className={`shrink-0 text-[10px] tracking-[0.14em] ${teamClassName}`}>
        {side.team === 'USA' ? 'USA' : 'EUR'}
      </span>
      <span className="min-w-0 truncate font-bold text-[#FAFAFA]">
        {side.players.map((player, index) => (
          <span key={`${side.team}-${player.playerId ?? player.name}-${index}`}>
            {index > 0 && <span className="px-1 text-[#3F3F46]">+</span>}
            <PlayerHistoryTrigger
              player={player.player}
              playerId={player.playerId}
              fallback={player.name}
              className="pointer-events-auto"
            >
              {player.name}
            </PlayerHistoryTrigger>
          </span>
        ))}
      </span>
    </span>
  );
}

function ProgressTimelineScore({ value, won }: { value: number | null; won: boolean }) {
  const display = value === null ? '–' : value;
  const className = won
    ? 'rounded-sm bg-[#3FB950]/15 px-1.5 py-0.5 text-[#3FB950]'
    : 'px-1.5 py-0.5 text-[#E6EDF3]';
  return (
    <span className={`tabular-nums text-sm font-bold leading-none ${className}`}>{display}</span>
  );
}

function ProgressSide({ side }: { side: ProgressPointSide }) {
  const teamClassName = side.team === 'USA' ? 'text-[#F2B84B]' : 'text-[#58A6FF]';

  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1">
      <span className={`shrink-0 text-[10px] tracking-[0.14em] ${teamClassName}`}>{formatTeamName(side.team)}</span>
      {side.players.length === 0 ? (
        <span className="text-[#A1A1AA]">Unknown players</span>
      ) : (
        side.players.map((player, index) => (
          <ProgressPlayer key={`${side.team}-${player.playerId ?? player.name}-${index}`} player={player} index={index} />
        ))
      )}
    </span>
  );
}

function ProgressPlayer({
  player,
  index,
}: {
  player: ProgressPointPlayer;
  index: number;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-x-1.5 whitespace-nowrap">
      {index > 0 && <span className="text-[#3F3F46]">+</span>}
      <PlayerHistoryTrigger
        player={player.player}
        playerId={player.playerId}
        fallback={player.name}
        className="pointer-events-auto min-w-0 font-bold text-[#FAFAFA]"
      >
        <span className="truncate">{player.name}</span>
      </PlayerHistoryTrigger>
      <span className="shrink-0 text-[10px] tracking-[0.12em] text-[#8B949E]">
        HCP <span className="tabular-nums text-[#A1A1AA]">{formatHandicap(player.currentCpi)}</span>
      </span>
    </span>
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

function PointsLedger({
  totals,
}: {
  totals: { onTable: PointsBreakdown; provisional: PointsBreakdown; hasOneVOne: boolean };
}) {
  return (
    <div className="bg-[#050506]">
      <PointsLedgerRow
        label="Overall"
        onTable={totals.onTable.overall}
        provisional={totals.provisional.overall}
        isPrimary
      />
      <PointsLedgerRow
        label="Foursomes"
        onTable={totals.onTable.foursomes}
        provisional={totals.provisional.foursomes}
      />
      <PointsLedgerRow
        label="Singles"
        onTable={totals.onTable.singles}
        provisional={totals.provisional.singles}
      />
      {totals.hasOneVOne ? (
        <PointsLedgerRow
          label="Stroke Play"
          onTable={totals.onTable.strokePlay}
          provisional={totals.provisional.strokePlay}
        />
      ) : null}
    </div>
  );
}

function PointsLedgerRow({
  label,
  onTable,
  provisional,
  isPrimary = false,
}: {
  label: string;
  onTable: TeamPoints;
  provisional: TeamPoints;
  isPrimary?: boolean;
}) {
  const provisionalDiffers =
    provisional.USA !== onTable.USA || provisional.EUROPE !== onTable.EUROPE;

  return (
    <div
      className={`border-t border-[#27272A] px-3 py-3 first:border-t-0 sm:px-4 ${
        isPrimary ? 'bg-[radial-gradient(circle_at_top_right,rgba(63,185,80,0.12),transparent_34%)] py-4' : ''
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] tracking-[0.2em] text-[#8B949E]">{label}</p>
        <p className="text-[10px] tracking-[0.14em] text-[#8B949E]">On table</p>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 tabular-nums sm:gap-5">
        <TeamTotal
          flag="🇺🇸"
          label="USA"
          value={formatPointValue(onTable.USA)}
          className="text-[#F2B84B]"
          isPrimary={isPrimary}
          align="right"
        />
        <span className="text-xs tracking-[0.2em] text-[#3F3F46] sm:text-sm">vs</span>
        <TeamTotal
          flag="🇪🇺"
          label="Europe"
          value={formatPointValue(onTable.EUROPE)}
          className="text-[#58A6FF]"
          isPrimary={isPrimary}
          align="left"
        />
      </div>
      {provisionalDiffers ? (
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-[#52525B]">
          Provisional{' '}
          <span className="text-[#F2B84B]">{formatPointValue(provisional.USA)}</span>
          <span className="text-[#3F3F46]"> · </span>
          <span className="text-[#58A6FF]">{formatPointValue(provisional.EUROPE)}</span>
        </p>
      ) : null}
    </div>
  );
}

function formatPointValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatPointsMeta(onTable: TeamPoints, provisional: TeamPoints): string {
  const decided = `${formatPointValue(onTable.USA)}–${formatPointValue(onTable.EUROPE)}`;
  const projectedDiffers =
    provisional.USA !== onTable.USA || provisional.EUROPE !== onTable.EUROPE;
  if (!projectedDiffers) return decided;
  return `${decided} · proj ${formatPointValue(provisional.USA)}–${formatPointValue(provisional.EUROPE)}`;
}

function WinPressureSection({ forecast }: { forecast: ReturnType<typeof buildWinPressureForecast> }) {
  const usaPercent = formatProbabilityPercent(forecast.probabilities.USA);
  const europePercent = formatProbabilityPercent(forecast.probabilities.EUROPE);
  const tiePercent = formatProbabilityPercent(forecast.probabilities.tie);
  const meta = forecast.locked
    ? 'Locked'
    : forecast.scoredHoles === 0
      ? 'No signal'
      : `${forecast.livePoints} points live`;

  return (
    <CollapsibleSection
      title="Win Pressure"
        description="Point-based forecast from live match positions. forecast, not fate."
      meta={meta}
    >
      <div className="px-3 py-3 sm:px-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem] md:items-end">
          <div className="min-w-0">
            <div
              className="flex h-2 overflow-hidden rounded-sm border border-[#27272A] bg-[#18181B]"
              aria-label={`Win pressure: USA ${usaPercent}, tie ${tiePercent}, Europe ${europePercent}`}
            >
              <span
                className="h-full bg-[#F2B84B]"
                style={{ width: usaPercent }}
                aria-hidden="true"
              />
              <span
                className="h-full bg-[#3F3F46]"
                style={{ width: tiePercent }}
                aria-hidden="true"
              />
              <span
                className="h-full bg-[#58A6FF]"
                style={{ width: europePercent }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 tabular-nums">
              <ProbabilityReadout label="USA" value={usaPercent} className="text-[#F2B84B]" />
              <ProbabilityReadout label="Tie" value={tiePercent} className="text-[#E6EDF3]" align="center" />
              <ProbabilityReadout
                label="Europe"
                value={europePercent}
                className="text-[#58A6FF]"
                align="right"
              />
            </div>
          </div>
          <div className="space-y-1.5 border-t border-[#27272A] pt-3 text-xs leading-5 text-[#A1A1AA] md:border-l md:border-t-0 md:pl-4 md:pt-0">
            {forecast.reasons.slice(0, 3).map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function ProbabilityReadout({
  label,
  value,
  className,
  align = 'left',
}: {
  label: string;
  value: string;
  className: string;
  align?: 'left' | 'center' | 'right';
}) {
  const alignClassName = {
    left: '',
    center: 'text-center',
    right: 'text-right',
  }[align];

  return (
    <div className={alignClassName}>
      <p className="text-[10px] tracking-[0.16em] text-[#8B949E]">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-[-0.06em] sm:text-3xl ${className}`}>{value}</p>
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
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] tracking-[0.2em] text-[#8B949E]">{label}</p>
        <p className="text-[10px] tracking-[0.14em] text-[#8B949E]">
          {score.halved} halved · {score.unplayed} unplayed
        </p>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 tabular-nums sm:gap-5">
        <TeamTotal
          flag="🇺🇸"
          label="USA"
          value={score.USA}
          className="text-[#F2B84B]"
          isPrimary={isPrimary}
          align="right"
        />
        <span className="text-xs tracking-[0.2em] text-[#3F3F46] sm:text-sm">vs</span>
        <TeamTotal
          flag="🇪🇺"
          label="Europe"
          value={score.EUROPE}
          className="text-[#58A6FF]"
          isPrimary={isPrimary}
          align="left"
        />
      </div>
    </div>
  );
}

function TeamTotal({
  flag,
  label,
  value,
  className,
  isPrimary = false,
  align,
}: {
  flag: string;
  label: string;
  value: number | string;
  className: string;
  isPrimary?: boolean;
  align: 'left' | 'right';
}) {
  const isLeft = align === 'left';

  return (
    <div className={isLeft ? 'text-left' : 'text-right'}>
      <div className={`flex items-center gap-2 ${isLeft ? 'justify-start' : 'justify-end'}`}>
        {isLeft ? <span className="text-xl sm:text-2xl">{flag}</span> : null}
        <span className={`text-base font-semibold tracking-[0.04em] sm:text-lg ${className}`}>
          {label}
        </span>
        {isLeft ? null : <span className="text-xl sm:text-2xl">{flag}</span>}
      </div>
      <p
        className={`mt-1 font-bold tracking-[-0.07em] tabular-nums ${className} ${
          isPrimary ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FixtureProgressRow({ fixture, players }: { fixture: FixtureView; players: PlayerRow[] }) {
  const progress = calculateFixtureProgress(fixture.segments);
  const fixtureTitle = fixture.name ?? `Fixture ${fixture.sort_order + 1}`;

  return (
    <div className="group relative border-b border-[#27272A] px-3 py-3 transition hover:bg-[#0C0C0E] last:border-b-0 sm:px-4">
      <FixtureTitleTrigger
        fixture={fixture}
        players={players}
        className="absolute inset-0 z-0 h-full w-full cursor-pointer"
      >
        <span className="sr-only">Open {fixtureTitle} details</span>
      </FixtureTitleTrigger>
      <div className="pointer-events-none relative z-10 grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem] sm:items-start">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA] group-hover:text-[#3FB950]">
            {fixtureTitle}
          </p>
          <FixtureProgressMatchup fixture={fixture} players={players} />
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-[0.14em] text-[#8B949E]">
            <span>
              {progress.completedHoles}/{progress.totalHoles} holes · {progress.percent}%
            </span>
          </div>
        </div>
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#18181B]">
            <div className="h-full bg-[#3FB950]" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </div>
      <div className="pointer-events-none relative z-10 mt-3 flex flex-wrap gap-2">
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

function FixtureProgressMatchup({ fixture, players }: { fixture: FixtureView; players: PlayerRow[] }) {
  const sides = buildFixtureProgressSides(fixture, players);

  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-[0.08em] text-[#A1A1AA]">
      {sides.map((side, index) => (
        <span key={`${fixture.id}-${side.team}`} className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
          {index > 0 && <span className="text-sm tracking-normal text-[#3F3F46]">vs</span>}
          <ProgressSide side={side} />
        </span>
      ))}
    </div>
  );
}

function buildFixtureProgressSides(fixture: FixtureView, players: PlayerRow[]): ProgressPointSide[] {
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const sourcePlayers =
    fixture.participants.length > 0
      ? fixture.participants.map((participant) => ({
          playerId: participant.player_id,
          team: participant.team,
          player: participant.player,
        }))
      : buildFallbackFixtureProgressPlayers(fixture, playerLookup);

  return (['USA', 'EUROPE'] as const).map((team) => ({
    team,
    players: sourcePlayers
      .filter((sourcePlayer) => sourcePlayer.team === team)
      .map((sourcePlayer) => {
        const player = sourcePlayer.player ?? playerLookup.get(sourcePlayer.playerId) ?? null;

        return {
          player,
          playerId: sourcePlayer.playerId,
          name: player?.name ?? 'Unknown player',
          currentCpi: player?.current_cpi ?? null,
        };
      }),
  }));
}

function buildFallbackFixtureProgressPlayers(
  fixture: FixtureView,
  playerLookup: Map<string, PlayerRow>
): Array<{ playerId: string; team: ProgressPointSide['team']; player: PlayerRow | null }> {
  const playersByKey = new Map<string, { playerId: string; team: ProgressPointSide['team']; player: PlayerRow | null }>();
  const addPlayer = (playerId: string | null | undefined, team: ProgressPointSide['team'], player?: PlayerRow | null) => {
    if (!playerId) {
      return;
    }

    playersByKey.set(`${team}-${playerId}`, {
      playerId,
      team,
      player: player ?? playerLookup.get(playerId) ?? null,
    });
  };

  for (const segment of fixture.segments) {
    for (const segmentPlayer of segment.players) {
      addPlayer(segmentPlayer.player_id, segmentPlayer.team, segmentPlayer.player);
    }

    addPlayer(segment.usa_player_id, 'USA');
    addPlayer(segment.europe_player_id, 'EUROPE');
  }

  return Array.from(playersByKey.values());
}

interface BoardStatusInput {
  score: TeamPoints;
  scoredHoleCount: number;
  totalHoleCount: number;
  tournament: TournamentRow | null;
}

interface BoardStatusView {
  kicker: string;
  title: string;
  stateLabel: string;
  scoreLabel: string;
  progressLabel: string;
  kickerClassName: string;
  stateClassName: string;
  scoreClassName: string;
  dotClassName: string;
}

function getBoardStatus({
  score,
  scoredHoleCount,
  totalHoleCount,
  tournament,
}: BoardStatusInput): BoardStatusView {
  const progressLabel = getProgressLabel(scoredHoleCount, totalHoleCount);

  if (!tournament) {
    return {
      kicker: 'tournament board',
      title: 'tournament leaderboard',
      stateLabel: 'setup needed',
      scoreLabel: 'no active tournament',
      progressLabel,
      kickerClassName: 'text-[#F59E0B]',
      stateClassName: 'text-[#F59E0B]',
      scoreClassName: 'text-[#E6EDF3]',
      dotClassName: 'bg-[#F59E0B]',
    };
  }

  if (tournament.is_complete) {
    const scoreSummary =
      scoredHoleCount > 0
        ? getScoreSummary(score)
        : { label: 'no saved scores', className: 'text-[#E6EDF3]' };

    return {
      kicker: 'final scoreboard',
      title: 'final leaderboard',
      stateLabel: 'final',
      scoreLabel: scoreSummary.label,
      progressLabel,
      kickerClassName: 'text-[#3FB950]',
      stateClassName: 'text-[#3FB950]',
      scoreClassName: scoreSummary.className,
      dotClassName: 'bg-[#3FB950]',
    };
  }

  if (scoredHoleCount === 0) {
    return {
      kicker: 'scoreboard standby',
      title: 'tournament leaderboard',
      stateLabel: 'not started',
      scoreLabel: 'awaiting first saved hole',
      progressLabel,
      kickerClassName: 'text-[#F59E0B]',
      stateClassName: 'text-[#F59E0B]',
      scoreClassName: 'text-[#E6EDF3]',
      dotClassName: 'bg-[#F59E0B]',
    };
  }

  const scoreSummary = getScoreSummary(score);

  return {
    kicker: 'live scoring',
    title: 'live leaderboard',
    stateLabel: 'live',
    scoreLabel: scoreSummary.label,
    progressLabel,
    kickerClassName: 'text-[#3FB950]',
    stateClassName: 'text-[#3FB950]',
    scoreClassName: scoreSummary.className,
    dotClassName: 'bg-[#3FB950]',
  };
}

function getProgressLabel(scoredHoleCount: number, totalHoleCount: number): string {
  if (totalHoleCount === 0) {
    return `${scoredHoleCount} saved holes`;
  }

  return `${scoredHoleCount}/${totalHoleCount} saved holes`;
}

function getScoreSummary(score: TeamPoints): { label: string; className: string } {
  const lead = Math.abs(score.USA - score.EUROPE);
  const scoreline = `${formatPointValue(score.USA)}-${formatPointValue(score.EUROPE)}`;

  if (lead === 0) {
    return { label: `All square · ${scoreline}`, className: 'text-[#FAFAFA]' };
  }

  if (score.USA > score.EUROPE) {
    return { label: `USA +${formatPointValue(lead)} · ${scoreline}`, className: 'text-[#F2B84B]' };
  }

  return { label: `Europe +${formatPointValue(lead)} · ${scoreline}`, className: 'text-[#58A6FF]' };
}

function formatTeamName(team: 'USA' | 'EUROPE'): string {
  return team === 'USA' ? 'USA' : 'Europe';
}

function formatHandicap(value: number | null): string {
  return value === null ? '-' : value.toString();
}

function formatProbabilityPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
