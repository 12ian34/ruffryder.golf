import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../../../domain/2026/matchPlayStatus';
import type { FixtureView } from '../../../services/tournament2026Queries';
import { calculateTotals } from '../viewUtils';
import type { TeamScore } from '../viewUtils';
import { Panel } from './Layout';

export function LeaderboardSection({ fixtures }: { fixtures: FixtureView[] }) {
  const totals = calculateTotals(fixtures);

  return (
    <Panel title="Live Leaderboard" eyebrow="Supabase realtime">
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreTile label="Overall" score={totals.overall} />
        <ScoreTile label="Foursomes" score={totals.foursomes} />
        <ScoreTile label="Singles" score={totals.singles} />
      </div>
      <div className="-mx-4 mt-5 border-t border-[#27272A] sm:mx-0">
        {fixtures.length === 0 ? (
          <p className="px-4 py-4 text-sm text-[#8B949E]">No fixtures yet.</p>
        ) : (
          fixtures.map((fixture) => <FixtureProgressRow key={fixture.id} fixture={fixture} />)
        )}
      </div>
    </Panel>
  );
}

function ScoreTile({ label, score }: { label: string; score: TeamScore }) {
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
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
      <p className={`text-4xl font-bold tracking-[-0.08em] ${className}`}>{value}</p>
    </div>
  );
}

function FixtureProgressRow({ fixture }: { fixture: FixtureView }) {
  const progress = calculateFixtureProgress(fixture.segments);

  return (
    <div className="border-b border-[#27272A] px-4 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
            {fixture.name ?? `Fixture ${fixture.sort_order + 1}`}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8B949E]">
            {progress.completedHoles}/{progress.totalHoles} holes · {progress.percent}%
          </p>
        </div>
        <div className="min-w-24">
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
