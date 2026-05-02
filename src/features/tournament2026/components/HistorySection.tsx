import type { Tournament2026Data } from '../../../services/tournament2026Queries';
import { Panel, StatusCard } from './Layout';

export function HistorySection({ history }: { history: Tournament2026Data['history'] }) {
  return (
    <Panel title="Historical Results" eyebrow="Legacy Firebase archive">
      {history.length === 0 ? (
        <StatusCard>No historical tournaments have been imported yet.</StatusCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {history.map((tournament) => (
            <div key={tournament.id} className="rounded-lg border border-[#27272A] bg-[#18181B] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">{tournament.year}</p>
              <h3 className="mt-1 text-xl font-bold tracking-[-0.04em] text-[#FAFAFA]">{tournament.name}</h3>
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
            </div>
          ))}
        </div>
      )}
    </Panel>
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
