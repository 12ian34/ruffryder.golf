import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../../../domain/2026/matchPlayStatus';
import type {
  FixtureView,
  PlayerRow,
  TournamentRow,
} from '../../../services/tournament2026Queries';
import type { CourseHoleMetadata } from '../../../domain/2026/course';
import { buildProgressTimeline, generateTournamentHighlights } from '../insights';
import { calculateTotals } from '../viewUtils';
import type { TeamScore } from '../viewUtils';
import { Panel, StatusCard } from './Layout';

export function LeaderboardSection({
  tournament,
  fixtures,
  players,
  courseHoles,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  courseHoles: CourseHoleMetadata[];
}) {
  const totals = calculateTotals(fixtures);
  const highlights = generateTournamentHighlights({ tournament, fixtures, players, courseHoles });
  const timeline = buildProgressTimeline(fixtures);
  const recentTimeline = timeline.slice(-8);

  return (
    <Panel title="Live Leaderboard" eyebrow="Supabase realtime">
      <div className="grid gap-3 md:grid-cols-3">
        <ScoreTile label="Overall" score={totals.overall} />
        <ScoreTile label="Foursomes" score={totals.foursomes} />
        <ScoreTile label="Singles" score={totals.singles} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <InsightCard title="Highlights Reel" items={highlights} />
        <ProgressTimeline points={recentTimeline} totalPoints={timeline.length} />
      </div>
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

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">{title}</p>
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
        <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">Score Movement</p>
        <StatusCard>No score movement yet.</StatusCard>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#27272A] bg-[#0C0C0E] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">Score Movement</p>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#8B949E]">
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
      <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">{label}</p>
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
      <p className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">{label}</p>
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
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8B949E]">
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
              className="border border-[#27272A] bg-[#0C0C0E] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#A1A1AA]"
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
