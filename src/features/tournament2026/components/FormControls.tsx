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
    <label className="block font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
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

export function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        min="1"
        className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-lg font-bold text-[#FAFAFA] outline-none focus:border-[#3FB950]"
      />
    </label>
  );
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
    <label className="block font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
      >
        <option value="">Select player</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
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
