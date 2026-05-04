import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../../../domain/2026/matchPlayStatus';
import {
  clearHoleScore2026,
  saveHoleScore2026,
  updateSegmentCpiEnabled,
  updateFixture2026,
  type FixtureView,
  type HoleScoreView,
  type PlayerRow,
  type SegmentView,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
import { getCourseStrokeIndex } from '../../../domain/2026/course';
import { track2026 } from '../../../utils/analytics';
import {
  createHoleRange,
  formatOutcome,
  formatSegmentKind,
  formatSegmentMatchup,
  getErrorMessage,
} from '../viewUtils';
import { TextField } from './FormControls';
import { PlayerHistoryTrigger, PlayerIdentity } from './PlayerHistory';

const ADMIN_SCORE_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

export function FixtureTitleTrigger({
  fixture,
  players,
  tournament,
  canEdit = false,
  updatedByProfileId = null,
  onSaved,
  className = '',
  children,
}: {
  fixture: FixtureView;
  players: PlayerRow[];
  tournament?: TournamentRow | null;
  canEdit?: boolean;
  updatedByProfileId?: string | null;
  onSaved?: () => Promise<void>;
  className?: string;
  children?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const title = getFixtureTitle(fixture);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          track2026('fixture_details_opened', {
            fixture_id: fixture.id,
            source: canEdit ? 'admin' : 'fixture_title',
          });
        }}
        className={`text-left hover:text-[#3FB950] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950] ${className}`}
      >
        {children ?? title}
      </button>
      {isOpen ? createPortal(
        <FixtureDetailsDialog
          fixture={fixture}
          players={players}
          tournament={tournament}
          canEdit={canEdit}
          updatedByProfileId={updatedByProfileId}
          onSaved={onSaved}
          onClose={() => setIsOpen(false)}
        />,
        document.body
      ) : null}
    </>
  );
}

function FixtureDetailsDialog({
  fixture,
  players,
  tournament,
  canEdit,
  updatedByProfileId,
  onSaved,
  onClose,
}: {
  fixture: FixtureView;
  players: PlayerRow[];
  tournament?: TournamentRow | null;
  canEdit: boolean;
  updatedByProfileId: string | null;
  onSaved?: () => Promise<void>;
  onClose: () => void;
}) {
  const title = getFixtureTitle(fixture);
  const progress = calculateFixtureProgress(fixture.segments);
  const [name, setName] = useState(fixture.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasNameChanged = name !== (fixture.name ?? '');
  const canSave = canEdit && tournament && !tournament.is_complete && hasNameChanged && !isSaving;

  useEffect(() => {
    setName(fixture.name ?? '');
  }, [fixture]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    document.addEventListener('keydown', handleEscape, { capture: true });

    return () => document.removeEventListener('keydown', handleEscape, { capture: true });
  }, [onClose]);

  const saveFixture = async () => {
    if (!tournament || !canSave) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateFixture2026({
        tournament,
        fixtureId: fixture.id,
        name: name.trim() || null,
      });
      track2026('fixture_updated', { fixture_id: fixture.id, source: 'fixture_details_popover' });
      await onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70 px-3 py-4 sm:items-center sm:justify-center"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} fixture details`}
        className="max-h-[85vh] w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B] shadow-[0_18px_42px_rgba(0,0,0,0.42)] sm:max-w-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#27272A] px-3 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#3FB950]">Fixture details</p>
            <h3 className="mt-1 truncate text-xl font-bold tracking-[-0.04em] text-[#FAFAFA]">{title}</h3>
            <p className="mt-1 text-xs tracking-[0.14em] text-[#8B949E]">
              {progress.completedHoles}/{progress.totalHoles} holes - {progress.percent}%
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#27272A] px-3 py-2 text-[10px] font-bold tracking-[0.14em] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#E6EDF3]"
          >
            Close
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden px-3 py-3">
          {canEdit ? (
            <div className="mb-3 rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
              <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Admin edit</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <TextField label="Fixture name" value={name} onChange={setName} />
                <button
                  type="button"
                  onClick={saveFixture}
                  disabled={!canSave}
                  className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
                >
                  {isSaving ? 'Saving' : 'Save'}
                </button>
              </div>
              {tournament?.is_complete ? (
                <p className="mt-2 text-xs text-[#F59E0B]">Tournament is complete, so fixture details are locked.</p>
              ) : null}
              {error ? <p className="mt-2 text-xs text-[#F85149]">{error}</p> : null}
            </div>
          ) : null}
          <FixtureParticipants fixture={fixture} />
          <FixtureSegments
            fixture={fixture}
            players={players}
            tournament={tournament}
            canEdit={canEdit}
            updatedByProfileId={updatedByProfileId}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}

function FixtureParticipants({ fixture }: { fixture: FixtureView }) {
  const participants = useMemo(
    () =>
      fixture.participants.slice().sort((a, b) => {
        if (a.team === b.team) {
          return a.slot - b.slot;
        }

        return a.team === 'USA' ? -1 : 1;
      }),
    [fixture.participants]
  );

  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Players</p>
      {participants.length === 0 ? (
        <p className="mt-2 text-sm text-[#8B949E]">No players assigned.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {participants.map((participant) => (
            <span
              key={`${fixture.id}-${participant.player_id}`}
              className="inline-flex max-w-full items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#A1A1AA]"
            >
              <PlayerHistoryTrigger player={participant.player} fallback="Unknown player" className="min-w-0 text-[#FAFAFA]">
                <PlayerIdentity player={participant.player} fallback="Unknown player" />
              </PlayerHistoryTrigger>
              <span className="shrink-0 text-[10px] tracking-[0.12em] text-[#8B949E]">
                {participant.team} side - HCP{' '}
                <span className="tabular-nums text-[#A1A1AA]">{participant.player?.current_cpi ?? '-'}</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FixtureSegments({
  fixture,
  players,
  tournament,
  canEdit,
  updatedByProfileId,
  onSaved,
}: {
  fixture: FixtureView;
  players: PlayerRow[];
  tournament?: TournamentRow | null;
  canEdit: boolean;
  updatedByProfileId: string | null;
  onSaved?: () => Promise<void>;
}) {
  const canEditScores = Boolean(canEdit && tournament && !tournament.is_complete);

  return (
    <div className="mt-3 grid gap-3">
      {fixture.segments.map((segment) => {
        const status = calculateSegmentMatchPlayStatus(segment);
        const scoresByHole = new Map(segment.holeScores.map((score) => [score.hole_number, score]));

        return (
          <section key={segment.id} className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-data text-sm font-bold text-[#FAFAFA]">
                  {segment.name ?? formatSegmentKind(segment.kind)}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
                  {formatSegmentMatchup(segment, players)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded border border-[#27272A] px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#3FB950]">
                  {status.label}
                </span>
                <AdminCpiToggle
                  tournament={tournament}
                  segment={segment}
                  players={players}
                  canEdit={canEditScores}
                  updatedByProfileId={updatedByProfileId}
                  onSaved={onSaved}
                />
              </div>
            </div>
            <div
              className={
                canEditScores
                  ? 'mt-3 overflow-hidden rounded-md border border-[#27272A] bg-[#18181B]'
                  : 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3'
              }
            >
              {createHoleRange(segment.hole_start, segment.hole_end).map((holeNumber) => {
                const score = scoresByHole.get(holeNumber);

                return canEditScores && tournament ? (
                  <AdminHoleScoreEditor
                    key={holeNumber}
                    tournament={tournament}
                    segment={segment}
                    players={players}
                    holeNumber={holeNumber}
                    score={score ?? null}
                    updatedByProfileId={updatedByProfileId}
                    onSaved={onSaved}
                  />
                ) : (
                  <FixtureHoleResult key={holeNumber} holeNumber={holeNumber} score={score ?? null} />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AdminCpiToggle({
  tournament,
  segment,
  players,
  canEdit,
  updatedByProfileId,
  onSaved,
}: {
  tournament?: TournamentRow | null;
  segment: SegmentView;
  players: PlayerRow[];
  canEdit: boolean;
  updatedByProfileId: string | null;
  onSaved?: () => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (segment.kind !== 'singles') {
    return null;
  }

  const toggleCpi = async () => {
    if (!tournament || !canEdit || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateSegmentCpiEnabled({
        tournament,
        segment,
        players,
        enabled: !segment.cpi_enabled,
        updatedBy: updatedByProfileId,
      });
      track2026('cpi_setting_changed', {
        segment_id: segment.id,
        enabled: !segment.cpi_enabled,
        source: 'fixture_details_popover',
      });
      await onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggleCpi}
        disabled={!canEdit || isSaving}
        className={`rounded border px-2 py-1 text-[10px] font-bold tracking-[0.14em] disabled:border-[#27272A] disabled:text-[#484F58] ${
          segment.cpi_enabled ? 'border-[#F59E0B] text-[#F59E0B]' : 'border-[#27272A] text-[#8B949E]'
        }`}
      >
        {isSaving ? 'Saving CPI' : `CPI ${segment.cpi_enabled ? 'enabled' : 'disabled'}`}
      </button>
      {error ? <span className="max-w-40 text-right text-[10px] text-[#F85149]">{error}</span> : null}
    </span>
  );
}

function AdminHoleScoreEditor({
  tournament,
  segment,
  players,
  holeNumber,
  score,
  updatedByProfileId,
  onSaved,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  holeNumber: number;
  score: HoleScoreView | null;
  updatedByProfileId: string | null;
  onSaved?: () => Promise<void>;
}) {
  const [usaScore, setUsaScore] = useState(score?.usa_score?.toString() ?? '');
  const [europeScore, setEuropeScore] = useState(score?.europe_score?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedUsaScore = parseScoreValue(usaScore);
  const parsedEuropeScore = parseScoreValue(europeScore);
  const isComplete = parsedUsaScore !== null && parsedEuropeScore !== null;
  const isDirty =
    usaScore !== (score?.usa_score?.toString() ?? '') ||
    europeScore !== (score?.europe_score?.toString() ?? '');
  const scoreLabels = getSegmentScoreLabels(segment, players);
  const outcomeLabel = score ? formatOutcome(score.outcome, scoreLabels) : 'Unplayed';

  useEffect(() => {
    setUsaScore(score?.usa_score?.toString() ?? '');
    setEuropeScore(score?.europe_score?.toString() ?? '');
    setError(null);
  }, [score?.europe_score, score?.id, score?.usa_score]);

  const saveScore = async () => {
    if (!isComplete || isSaving) {
      return;
    }

    if (
      !window.confirm(
        `Update H${holeNumber} to ${scoreLabels.usa} ${parsedUsaScore}, ${scoreLabels.europe} ${parsedEuropeScore}?`
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await saveHoleScore2026({
        tournament,
        segment,
        players,
        holeNumber,
        strokeIndex: getCourseStrokeIndex(holeNumber),
        usaScore: parsedUsaScore,
        europeScore: parsedEuropeScore,
        updatedBy: updatedByProfileId,
      });
      track2026('score_saved', {
        segment_id: segment.id,
        hole_number: holeNumber,
        segment_kind: segment.kind,
        source: 'admin_fixture_details',
      });
      await onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const clearScore = async () => {
    if (!score || isSaving) {
      return;
    }

    if (!window.confirm(`Clear score for H${holeNumber}? This cannot be undone.`)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await clearHoleScore2026({ tournament, scoreId: score.id });
      track2026('score_cleared', {
        score_id: score.id,
        segment_id: segment.id,
        hole_number: holeNumber,
        source: 'admin_fixture_details',
      });
      await onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`border-t px-2 py-2 first:border-t-0 ${
        error ? 'border-[#F85149]/70' : isDirty ? 'border-[#F59E0B]/60' : 'border-[#27272A]'
      }`}
    >
      <div className="grid gap-2 sm:grid-cols-[3.25rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div className="flex items-center justify-between gap-2 sm:block">
          <p className="font-data text-sm font-bold tabular-nums text-[#FAFAFA]">H{holeNumber}</p>
          <p
            className={`text-[10px] leading-4 ${
              score ? 'text-[#8B949E]' : 'text-[#F59E0B]'
            }`}
          >
            {outcomeLabel}
          </p>
        </div>
        <AdminScoreSelect label={scoreLabels.usa} value={usaScore} onChange={setUsaScore} />
        <AdminScoreSelect label={scoreLabels.europe} value={europeScore} onChange={setEuropeScore} />
        <div className="grid grid-cols-2 gap-2 sm:w-44">
          <button
            type="button"
            onClick={saveScore}
            disabled={!isComplete || !isDirty || isSaving}
            className="min-h-11 rounded border border-[#3FB950] px-2 py-2 text-[10px] font-bold tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            {isSaving ? 'Updating' : 'Update'}
          </button>
          <button
            type="button"
            onClick={clearScore}
            disabled={!score || isSaving}
            className="min-h-11 rounded border border-[#F85149] px-2 py-2 text-[10px] font-bold tracking-[0.12em] text-[#F85149] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            Clear
          </button>
        </div>
      </div>
      {score ? (
        <p className="mt-2 text-[10px] leading-4 text-[#8B949E]">
          Saved {formatAuditTime(score.updated_at)}
          {score.cpi_applied
            ? ` - CPI gap ${score.cpi_difference}, USA ${score.cpi_strokes_usa}, EUR ${score.cpi_strokes_europe}`
            : ''}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-[10px] text-[#F85149]">{error}</p> : null}
    </div>
  );
}

function AdminScoreSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 font-data text-[10px] font-bold tracking-[0.14em] text-[#8B949E]">
      <span className="block truncate">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} score`}
        className="mt-1 min-h-11 w-full rounded-md border border-[#3F3F46] bg-[#050506] px-2 text-sm font-bold tabular-nums text-[#FAFAFA] outline-none focus:border-[#3FB950]"
      >
        <option value="">--</option>
        {ADMIN_SCORE_OPTIONS.map((score) => (
          <option key={score} value={score}>
            {score}
          </option>
        ))}
      </select>
    </label>
  );
}

function FixtureHoleResult({ holeNumber, score }: { holeNumber: number; score: HoleScoreView | null }) {
  return (
    <div className="rounded border border-[#27272A] bg-[#18181B] px-2 py-2">
      <p className="text-[10px] font-bold tracking-[0.14em] text-[#8B949E]">H{holeNumber}</p>
      <p className="mt-1 text-xs tabular-nums text-[#E6EDF3]">
        {score ? `${score.usa_score ?? '-'} - ${score.europe_score ?? '-'}` : '- - -'}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[#8B949E]">
        {score ? formatOutcome(score.outcome) : 'Unplayed'}
      </p>
    </div>
  );
}

function getSegmentScoreLabels(segment: SegmentView, players: PlayerRow[]): { usa: string; europe: string } {
  if (segment.kind === 'foursomes') {
    return { usa: 'USA', europe: 'Europe' };
  }

  const playerLookup = new Map(players.map((player) => [player.id, player.name]));

  return {
    usa: segment.usa_player_id ? playerLookup.get(segment.usa_player_id) ?? 'USA' : 'USA',
    europe: segment.europe_player_id ? playerLookup.get(segment.europe_player_id) ?? 'Europe' : 'Europe',
  };
}

function parseScoreValue(value: string): number | null {
  const score = Number(value);

  return Number.isInteger(score) && score > 0 ? score : null;
}

function formatAuditTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFixtureTitle(fixture: FixtureView): string {
  return fixture.name ?? `Fixture ${fixture.sort_order + 1}`;
}
