import {
  calculateBackNineIndividualTotals,
  hasAnyBackNineTotals,
  type BackNineIndividualTotal,
} from '../../../domain/2026/backNineTotals';
import type { PlayerRow, SegmentView } from '../../../services/tournament2026Queries';

export function BackNineIndividualTotalsCard({
  segments,
  players,
  variant = 'embedded',
}: {
  segments: SegmentView[];
  players: PlayerRow[];
  variant?: 'embedded' | 'standalone';
}) {
  const totals = calculateBackNineIndividualTotals(segments, players);

  if (totals.length === 0) {
    return null;
  }

  const anyCpiApplied = totals.some((row) => row.cpiApplied);
  const wrapperClass =
    variant === 'standalone' ? 'bg-[#050506]' : 'border-t border-[#27272A] bg-[#050506]';

  return (
    <div className={wrapperClass}>
      {variant === 'embedded' && (
        <div className="px-3 py-3">
          <p className="font-data text-[10px] lowercase tracking-[0.16em] text-[#8B949E]">
            back 9 individual totals
          </p>
          <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
            Strokes per player on the back 9{anyCpiApplied ? ', with handicap-adjusted net' : ''}.
          </p>
        </div>
      )}
      <div
        className={`grid sm:grid-cols-2 ${
          variant === 'embedded' ? 'border-t border-dashed border-[#27272A]' : ''
        }`}
      >
        {totals.map((row, index) => (
          <BackNineTotalRow
            key={`${row.playerId}-${index}`}
            row={row}
            showNet={anyCpiApplied}
          />
        ))}
      </div>
    </div>
  );
}

function BackNineTotalRow({
  row,
  showNet,
}: {
  row: BackNineIndividualTotal;
  showNet: boolean;
}) {
  const teamColor = row.team === 'USA' ? 'text-[#58A6FF]' : 'text-[#F2B84B]';
  const teamLabel = row.team === 'USA' ? 'usa' : 'europe';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-dashed border-[#27272A] px-3 py-2 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
      <div className="min-w-0">
        <p className={`truncate text-sm font-bold tracking-[-0.02em] ${teamColor}`}>
          {row.playerName}
        </p>
        <p className="mt-0.5 font-data text-[10px] lowercase tracking-[0.14em] text-[#8B949E]">
          {teamLabel} · {row.holesPlayed} {row.holesPlayed === 1 ? 'hole' : 'holes'} ·
          {' hcp '}
          {row.currentCpi === null ? '-' : row.currentCpi}
        </p>
      </div>
      <div className="text-right font-data tabular-nums">
        <p className="text-xl font-bold tracking-[-0.04em] text-[#FAFAFA]">
          {row.holesPlayed === 0 ? '-' : row.grossStrokes}
        </p>
        {showNet && (
          <p
            className={`mt-0.5 text-[10px] lowercase tracking-[0.14em] ${
              row.cpiApplied ? 'text-[#3FB950]' : 'text-[#8B949E]'
            }`}
            title={
              row.cpiApplied
                ? `Net strokes after ${row.cpiStrokesReceived} handicap stroke${
                    row.cpiStrokesReceived === 1 ? '' : 's'
                  }`
                : 'No handicap strokes received'
            }
          >
            net {row.holesPlayed === 0 ? '-' : row.netStrokes}
            {row.cpiApplied ? ` (−${row.cpiStrokesReceived})` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

export function backNineTotalsAreVisible(
  segments: SegmentView[],
  players: PlayerRow[]
): boolean {
  return hasAnyBackNineTotals(calculateBackNineIndividualTotals(segments, players));
}
