import type { ReactNode } from 'react';
import type { PlayerRow } from '../../../services/tournament2026Queries';

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block font-data text-xs tracking-[0.14em] text-[#8B949E]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required
        className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
      />
    </label>
  );
}

export function ScorePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const numericValue = parseScoreValue(value);
  const selectedValue = numericValue?.toString() ?? '';
  const quickValues = getQuickScoreValues(numericValue);
  const decrementValue = numericValue ? Math.max(1, numericValue - 1) : 4;
  const incrementValue = numericValue ? numericValue + 1 : 4;

  return (
    <div className="min-w-0 font-data text-xs tracking-[0.14em] text-[#8B949E]">
      <div>{label}</div>
      <div className="mt-1 min-w-0 border-y border-[#27272A] bg-[#050505] py-2 sm:rounded-md sm:border sm:px-2">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(decrementValue.toString())}
            disabled={!numericValue || numericValue <= 1}
            aria-label={`${label} decrement`}
            className="h-10 rounded-md border border-[#27272A] text-lg font-bold text-[#E6EDF3] disabled:text-[#484F58]"
          >
            -
          </button>
          <select
            value={selectedValue}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${label} score`}
            className="h-10 min-w-0 w-full appearance-none rounded-md border border-[#3F3F46] bg-[#18181B] px-2 text-center text-lg font-bold text-[#FAFAFA] outline-none focus:border-[#3FB950]"
          >
            <option value="">--</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange(incrementValue.toString())}
            aria-label={`${label} increment`}
            className="h-10 rounded-md border border-[#27272A] text-lg font-bold text-[#E6EDF3]"
          >
            +
          </button>
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {quickValues.map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score.toString())}
              className={`rounded border px-1 py-1.5 text-xs font-bold ${
                numericValue === score
                  ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
                  : 'border-[#27272A] text-[#A1A1AA]'
              }`}
            >
              {score}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function parseScoreValue(value: string): number | null {
  const score = Number(value);

  return Number.isInteger(score) && score > 0 ? score : null;
}

function getQuickScoreValues(value: number | null): number[] {
  const center = value ?? 5;
  const start = Math.max(1, center - 2);

  return Array.from({ length: 5 }, (_, index) => start + index);
}

export function PlayerSelect({
  label,
  value,
  players,
  onChange,
}: {
  label: string;
  value: string;
  players: PlayerRow[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block font-data text-xs tracking-[0.14em] text-[#8B949E]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
      >
        <option value="">Select player</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name} · {player.team}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SubmitButton({
  children,
  isSaving,
  disabled = false,
}: {
  children: ReactNode;
  isSaving: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || isSaving}
      className="w-full rounded-md bg-[#3FB950] px-3 py-2 font-data text-sm font-bold text-[#09090B] disabled:opacity-60"
    >
      {isSaving ? 'Saving...' : children}
    </button>
  );
}
