import type { ProfileRow, TournamentRow } from '../../../services/tournament2026Queries';

export function Hero({
  tournament,
  profile,
}: {
  tournament: TournamentRow | null;
  profile: ProfileRow;
}) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#09090B] p-4">
      <p className="text-sm tracking-[0.28em] text-[#3FB950]">
        {profile.is_admin ? 'Admin access' : 'Player access'}
      </p>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.06em] text-[#FAFAFA] sm:text-3xl">
            {tournament ? tournament.name : 'No Active Tournament'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A1A1AA]">
            Foursomes on holes 1-9, singles on holes 10-18, match play only. CPI only applies
            to qualifying back-nine singles.
          </p>
        </div>
        {tournament && (
          <div className="rounded-md border border-[#27272A] bg-[#0C0C0E]/80 px-4 py-3 text-right">
            <p className="text-xs tracking-[0.2em] text-[#8B949E]">CPI threshold</p>
            <p className="text-3xl font-bold text-[#F59E0B]">{tournament.cpi_threshold}</p>
          </div>
        )}
      </div>
    </section>
  );
}
