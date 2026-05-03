import { availableEmojis } from '../../../utils/animalAvatars';

interface AvatarEmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  disabled?: boolean;
  label?: string;
  feedback?: string | null;
  feedbackTone?: 'muted' | 'success' | 'error';
  compact?: boolean;
  collapsible?: boolean;
}

export function AvatarEmojiPicker({
  value,
  onChange,
  disabled = false,
  label = 'Avatar',
  feedback = null,
  feedbackTone = 'muted',
  compact = false,
  collapsible = false,
}: AvatarEmojiPickerProps) {
  const selectedValue = value || 'Default';
  const gridColumns = compact ? 'grid-cols-6 sm:grid-cols-8' : 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10';
  const gridHeight = compact ? 'max-h-36' : 'max-h-64';
  const feedbackClass =
    feedbackTone === 'success'
      ? 'text-[#3FB950]'
      : feedbackTone === 'error'
        ? 'text-[#F85149]'
        : 'text-[#8B949E]';
  const grid = (
    <div
      className={`mt-2 grid ${gridColumns} ${gridHeight} gap-1 overflow-y-auto rounded-md border border-[#27272A] bg-[#050506] p-1`}
      role="group"
      aria-label={`${label} emoji options`}
    >
      <button
        type="button"
        onClick={() => onChange('')}
        disabled={disabled}
        aria-pressed={!value}
        className={`min-h-11 rounded-md border px-2 text-[10px] font-bold tracking-[0.12em] transition ${
          !value
            ? 'border-[#3FB950] bg-[#3FB950]/15 text-[#3FB950]'
            : 'border-[#27272A] text-[#8B949E] hover:border-[#3F3F46] hover:text-[#E6EDF3]'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Default
      </button>
      {availableEmojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji === value ? '' : emoji)}
          disabled={disabled}
          aria-label={`Use ${emoji} avatar`}
          aria-pressed={value === emoji}
          className={`min-h-11 rounded-md border text-2xl leading-none transition ${
            value === emoji
              ? 'border-[#3FB950] bg-[#3FB950]/15 ring-1 ring-[#3FB950]/70'
              : 'border-[#27272A] bg-[#0C0C0E] hover:border-[#3F3F46] hover:bg-[#18181B]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <details className="rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-data text-xs tracking-[0.14em] text-[#8B949E] [&::-webkit-details-marker]:hidden">
          <span>{label}</span>
          <span className="flex items-center gap-2 text-base normal-case tracking-normal text-[#E6EDF3]">
            {feedback && <span className={`text-[10px] tracking-[0.12em] ${feedbackClass}`}>{feedback}</span>}
            {selectedValue}
          </span>
        </summary>
        {grid}
      </details>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 font-data text-xs tracking-[0.14em] text-[#8B949E]">
        <span>{label}</span>
        <span className="flex items-center gap-2 text-base normal-case tracking-normal text-[#E6EDF3]">
          {feedback && <span className={`text-[10px] tracking-[0.12em] ${feedbackClass}`}>{feedback}</span>}
          {selectedValue}
        </span>
      </div>
      {grid}
    </div>
  );
}
