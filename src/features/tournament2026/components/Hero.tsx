import type { ProfileRow, TournamentRow } from '../../../services/tournament2026Queries';

export function Hero({
  tournament,
  profile,
}: {
  tournament: TournamentRow | null;
  profile: ProfileRow;
}) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[radial-gradient(circle_at_top_left,rgba(63,185,80,0.16),transparent_32%),#09090B] p-6 shadow-[0_18px_80px_rgba(0,0,0,0.45)]">
      <p className="text-sm uppercase tracking-[0.28em] text-[#3FB950]">
        {profile.is_admin ? 'Admin access' : 'Player access'}
      </p>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-[-0.06em] text-[#FAFAFA]">
            {tournament ? tournament.name : 'No Active Tournament'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A1A1AA]">
            Foursomes on holes 1-9, singles on holes 10-18, match play only. CPI only applies
            to qualifying back-nine singles.
          </p>
        </div>
        {tournament && (
          <div className="rounded-md border border-[#27272A] bg-[#0C0C0E]/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E]">CPI threshold</p>
            <p className="text-3xl font-bold text-[#F59E0B]">{tournament.cpi_threshold}</p>
          </div>
        )}
      </div>
    </section>
  );
}
