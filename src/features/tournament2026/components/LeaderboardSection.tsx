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
