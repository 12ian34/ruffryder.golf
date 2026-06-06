import { useMemo, useState, type ReactNode } from 'react';
import {
  calculateCpiComparisons,
  type CpiComparison,
} from '../../../domain/2026/backNineTotals';
import type { PlayerRow, SegmentView } from '../../../services/tournament2026Queries';

type SortField = 'diff' | 'cpi' | 'projected' | 'player';
type SortDirection = 'asc' | 'desc';

export function CpiComparisonCard({
  segments,
  players,
}: {
  segments: SegmentView[];
  players: PlayerRow[];
}) {
  const rows = useMemo(() => calculateCpiComparisons(segments, players), [segments, players]);
  const [sortField, setSortField] = useState<SortField>('diff');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedRows = useMemo(
    () => rows.slice().sort((a, b) => compareCpiRows(a, b, sortField, sortDirection)),
    [rows, sortField, sortDirection]
  );

  if (rows.length === 0) {
    return (
      <p className="px-3 py-3 text-sm leading-6 text-[#A1A1AA] sm:px-4">
        No back 9 singles holes saved yet. Once scores land, each player&apos;s back 9 (×2) shows up
        against their CPI here.
      </p>
    );
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    // CPI / projected / diff read best ascending; names read best A→Z.
    setSortDirection('asc');
  };

  return (
    <div className="bg-[#050506]">
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4.5rem] items-center gap-2 border-b border-[#27272A] px-3 py-2 font-data text-[10px] lowercase text-[#8B949E] sm:px-4">
        <CpiSortButton label="player" field="player" activeField={sortField} direction={sortDirection} onClick={handleSort} align="left" />
        <CpiSortButton label="cpi" field="cpi" activeField={sortField} direction={sortDirection} onClick={handleSort} align="right" />
        <CpiSortButton label="b9×2" field="projected" activeField={sortField} direction={sortDirection} onClick={handleSort} align="right" />
        <CpiSortButton label="diff" field="diff" activeField={sortField} direction={sortDirection} onClick={handleSort} align="right" />
      </div>
      <div>
        {sortedRows.map((row) => (
          <CpiComparisonRow key={row.playerId} row={row} />
        ))}
      </div>
    </div>
  );
}

function CpiComparisonRow({ row }: { row: CpiComparison }) {
  const teamColor = row.team === 'USA' ? 'text-[#58A6FF]' : 'text-[#F2B84B]';
  const teamLabel = row.team === 'USA' ? 'usa' : 'europe';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4.5rem] items-center gap-2 border-t border-dashed border-[#27272A] px-3 py-2 first:border-t-0 sm:px-4">
      <div className="min-w-0">
        <p className={`truncate text-sm font-bold tracking-[-0.02em] ${teamColor}`}>{row.playerName}</p>
        <p className="mt-0.5 font-data text-[10px] lowercase tracking-[0.14em] text-[#8B949E]">
          {teamLabel} · {row.holesPlayed} {row.holesPlayed === 1 ? 'hole' : 'holes'}
        </p>
      </div>
      <p className="text-right font-data text-sm tabular-nums text-[#A1A1AA]">
        {row.currentCpi === null ? '–' : formatNumber(row.currentCpi)}
      </p>
      <p className="text-right font-data text-sm tabular-nums text-[#FAFAFA]">{row.projected}</p>
      <DiffCell diff={row.diff} />
    </div>
  );
}

function DiffCell({ diff }: { diff: number | null }) {
  if (diff === null) {
    return <p className="text-right font-data text-sm tabular-nums text-[#52525B]">–</p>;
  }

  const color =
    diff < 0 ? 'text-[#3FB950]' : diff > 0 ? 'text-[#F85149]' : 'text-[#A1A1AA]';
  const sign = diff > 0 ? '+' : '';

  return (
    <p
      className={`text-right font-data text-sm font-bold tabular-nums ${color}`}
      title={
        diff < 0
          ? 'Beating their CPI on the back 9'
          : diff > 0
            ? 'Behind their CPI on the back 9'
            : 'On their CPI'
      }
    >
      {sign}
      {formatNumber(diff)}
    </p>
  );
}

function CpiSortButton({
  label,
  field,
  activeField,
  direction,
  onClick,
  align,
}: {
  label: ReactNode;
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
  onClick: (field: SortField) => void;
  align: 'left' | 'right';
}) {
  const isActive = field === activeField;

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`inline-flex items-center gap-1 tracking-[0.16em] ${
        align === 'right' ? 'justify-self-end' : 'justify-self-start'
      } ${isActive ? 'text-[#3FB950]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
    >
      <span>{label}</span>
      <span className={isActive ? 'text-[#3FB950]' : 'text-[#484F58]'} aria-hidden="true">
        {isActive ? (direction === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

function compareCpiRows(
  a: CpiComparison,
  b: CpiComparison,
  sortField: SortField,
  sortDirection: SortDirection
): number {
  const direction = sortDirection === 'asc' ? 1 : -1;

  if (sortField === 'player') {
    return direction * a.playerName.localeCompare(b.playerName);
  }

  const aValue = sortField === 'cpi' ? a.currentCpi : sortField === 'projected' ? a.projected : a.diff;
  const bValue = sortField === 'cpi' ? b.currentCpi : sortField === 'projected' ? b.projected : b.diff;

  // Nulls (no CPI / no diff) always sort to the bottom regardless of direction.
  if (aValue === null && bValue === null) return a.playerName.localeCompare(b.playerName);
  if (aValue === null) return 1;
  if (bValue === null) return -1;
  if (aValue === bValue) return a.playerName.localeCompare(b.playerName);

  return direction * (aValue - bValue);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0$/, '');
}
