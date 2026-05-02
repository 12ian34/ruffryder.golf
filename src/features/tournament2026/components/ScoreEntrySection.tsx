import { useEffect, useMemo, useState } from 'react';
import { calculateCpiStrokesForHole } from '../../../domain/2026/scoring';
import { getCourseStrokeIndex } from '../../../domain/2026/course';
import { useHoleDistances } from '../../../hooks/useHoleDistances';
import {
  saveHoleScore2026,
  updateSegmentCpiEnabled,
  type FixtureView,
  type HoleScoreRow,
  type PlayerRow,
  type ProfileRow,
  type SegmentView,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
import {
  createHoleRange,
  formatOutcome,
  formatParticipants,
  formatSegmentKind,
  formatSegmentMatchup,
  getErrorMessage,
  parseOptionalPositiveInteger,
} from '../viewUtils';
import { ScorePicker } from './FormControls';
import { Panel, StatusCard } from './Layout';

interface HoleDraft {
  usaScore: string;
  europeScore: string;
}

type HoleSaveState = 'dirty' | 'incomplete' | 'saving' | 'saved' | 'error';

export function ScoreEntrySection({
  tournament,
  fixtures,
  players,
  profile,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  profile: ProfileRow;
  onSaved: () => Promise<void>;
}) {
  const { distances } = useHoleDistances();

  if (!tournament) {
    return (
      <Panel title="Score Entry" eyebrow="Fixture scores">
        <StatusCard tone="warning">Create an active tournament before entering scores.</StatusCard>
      </Panel>
    );
  }

  return (
    <Panel title="Score Entry" eyebrow="Fixture scores">
      <div className="-mx-4 sm:mx-0">
        {fixtures.length === 0 && (
          <StatusCard tone="warning">
            {profile.is_admin || profile.linked_player_id
              ? 'No fixtures are available for score entry yet.'
              : 'Your profile is not linked to a player yet. Ask an admin to link you before score entry.'}
          </StatusCard>
        )}
        {fixtures.map((fixture) => (
          <div key={fixture.id} className="border-t border-[#27272A] first:border-t-0">
            <div className="px-4 py-4">
              <h3 className="text-2xl font-bold tracking-[-0.06em] text-[#FAFAFA]">
                {fixture.name ?? `Fixture ${fixture.sort_order + 1}`}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#8B949E]">{formatParticipants(fixture.participants)}</p>
            </div>
            <div>
              {fixture.segments.map((segment) => (
                <SegmentScoreCard
                  key={segment.id}
                  tournament={tournament}
                  segment={segment}
                  players={players}
                  profile={profile}
                  distances={distances}
                  onSaved={onSaved}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SegmentScoreCard({
  tournament,
  segment,
  players,
  profile,
  distances,
  onSaved,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  profile: ProfileRow;
  distances: number[];
  onSaved: () => Promise<void>;
}) {
  const holes = createHoleRange(segment.hole_start, segment.hole_end);
  const scoreByHole = useMemo(
    () => new Map(segment.holeScores.map((score) => [score.hole_number, score])),
    [segment.holeScores]
  );
  const [drafts, setDrafts] = useState<Record<number, HoleDraft>>(() =>
    createDrafts(holes, scoreByHole)
  );
  const [savingHoles, setSavingHoles] = useState<Set<number>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [saveAllError, setSaveAllError] = useState<string | null>(null);
  const cpiStatus = getSegmentCpiStatus(segment, players, tournament.cpi_threshold);
  const canConfigureCpi = profile.is_admin && segment.kind === 'singles';
  const dirtyHoles = holes.filter((holeNumber) =>
    isHoleDirty(drafts[holeNumber], scoreByHole.get(holeNumber))
  );
  const isSavingAny = savingHoles.size > 0;

  useEffect(() => {
    setDrafts(createDrafts(holes, scoreByHole));
  }, [holes.join(','), scoreByHole]);

  const handleCpiToggle = async () => {
    if (!canConfigureCpi) return;

    await updateSegmentCpiEnabled({
      tournament,
      segment,
      players,
      enabled: !segment.cpi_enabled,
      updatedBy: profile.id,
    });
    await onSaved();
  };

  const updateDraft = (holeNumber: number, nextDraft: HoleDraft) => {
    setDrafts((current) => ({
      ...current,
      [holeNumber]: nextDraft,
    }));
    setRowErrors((current) => {
      const next = { ...current };
      delete next[holeNumber];
      return next;
    });
  };

  const saveHole = async (holeNumber: number) => {
    const draft = drafts[holeNumber];

    if (!draft) return;

    setSaveAllError(null);
    setRowErrors((current) => {
      const next = { ...current };
      delete next[holeNumber];
      return next;
    });
    setSavingHoles((current) => new Set(current).add(holeNumber));

    try {
      await saveHoleDraft({
        tournament,
        segment,
        players,
        profile,
        holeNumber,
        draft,
      });
      await onSaved();
    } catch (err) {
      const message = getErrorMessage(err);
      setRowErrors((current) => ({ ...current, [holeNumber]: message }));
      setSaveAllError(message);
    } finally {
      setSavingHoles((current) => {
        const next = new Set(current);
        next.delete(holeNumber);
        return next;
      });
    }
  };

  const saveAll = async () => {
    if (dirtyHoles.length === 0) return;

    setSaveAllError(null);
    setRowErrors({});
    setSavingHoles(new Set(dirtyHoles));

    try {
      for (const holeNumber of dirtyHoles) {
        const draft = drafts[holeNumber];

        if (!draft) continue;

        await saveHoleDraft({
          tournament,
          segment,
          players,
          profile,
          holeNumber,
          draft,
        });
      }
      await onSaved();
    } catch (err) {
      setSaveAllError(getErrorMessage(err));
    } finally {
      setSavingHoles(new Set());
    }
  };

  return (
    <div className="border-t border-[#27272A] bg-[#050505]">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-data text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
            {segment.name ?? formatSegmentKind(segment.kind)}
          </h4>
          <p className="mt-1 font-data text-sm leading-6 text-[#A1A1AA]">{formatSegmentMatchup(segment, players)}</p>
          {cpiStatus && (
            <p className="mt-1 font-data text-xs text-[#8B949E]">
              {cpiStatus}
              {canConfigureCpi && (
                <button
                  type="button"
                  onClick={handleCpiToggle}
                  className="ml-2 rounded border border-[#27272A] px-2 py-0.5 text-[#E6EDF3] hover:border-[#3FB950]"
                >
                  {segment.cpi_enabled ? 'Disable CPI' : 'Enable CPI'}
                </button>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirtyHoles.length > 1 && (
            <button
              type="button"
              onClick={saveAll}
              disabled={isSavingAny}
              className="rounded-md bg-[#3FB950] px-3 py-2 font-data text-xs font-bold text-[#09090B] disabled:opacity-60"
            >
              {isSavingAny ? 'Saving...' : `Save all (${dirtyHoles.length})`}
            </button>
          )}
          <span className="border border-[#27272A] px-3 py-1 font-data text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA]">
            Holes {segment.hole_start}-{segment.hole_end}
          </span>
        </div>
      </div>
      {saveAllError && <p className="px-4 pb-3 font-data text-xs text-[#F85149]">{saveAllError}</p>}
      <div>
        {holes.map((holeNumber) => {
          const score = segment.holeScores.find((row) => row.hole_number === holeNumber) ?? null;
          const draft = drafts[holeNumber] ?? createDraft(score);
          const isDirty = dirtyHoles.includes(holeNumber);
          const isSaving = savingHoles.has(holeNumber);
          const rowError = rowErrors[holeNumber] ?? null;

          return (
            <HoleScoreForm
              key={holeNumber}
              holeNumber={holeNumber}
              distance={distances[holeNumber - 1] ?? null}
              score={score}
              draft={draft}
              saveState={getHoleSaveState({ draft, isDirty, isSaving, rowError })}
              error={rowError}
              onDraftChange={(nextDraft) => updateDraft(holeNumber, nextDraft)}
              onSave={() => saveHole(holeNumber)}
            />
          );
        })}
      </div>
    </div>
  );
}

function HoleScoreForm({
  holeNumber,
  distance,
  score,
  draft,
  saveState,
  error,
  onDraftChange,
  onSave,
}: {
  holeNumber: number;
  distance: number | null;
  score: HoleScoreRow | null;
  draft: HoleDraft;
  saveState: HoleSaveState;
  error: string | null;
  onDraftChange: (draft: HoleDraft) => void;
  onSave: () => void;
}) {
  const strokeIndex = getCourseStrokeIndex(holeNumber);
  const isDirty = saveState === 'dirty' || saveState === 'incomplete';
  const borderClass =
    saveState === 'error' ? 'border-[#F85149]' : isDirty ? 'border-[#F59E0B]' : 'border-[#27272A]';

  useEffect(() => {
    if (saveState !== 'dirty') return undefined;

    const timer = window.setTimeout(() => {
      onSave();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [draft.europeScore, draft.usaScore, onSave, saveState]);

  return (
    <div className={`border-t bg-[#101012] px-4 py-4 transition-colors ${borderClass}`}>
      <div className="grid gap-3 lg:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)_7rem] lg:items-center">
        <div className="flex items-baseline justify-between gap-3 lg:block">
          <div className="font-data text-3xl font-bold tracking-[-0.08em] text-[#FAFAFA] lg:text-xl">H{holeNumber}</div>
          <div className="flex flex-wrap justify-end gap-2 font-data text-[10px] uppercase tracking-[0.12em] text-[#8B949E] lg:mt-1 lg:justify-start">
            {distance && <span>{distance} yds</span>}
            <span>SI {strokeIndex}</span>
          </div>
        </div>
        <ScorePicker
          label="USA"
          value={draft.usaScore}
          onChange={(usaScore) => onDraftChange({ ...draft, usaScore })}
        />
        <ScorePicker
          label="Europe"
          value={draft.europeScore}
          onChange={(europeScore) => onDraftChange({ ...draft, europeScore })}
        />
        {saveState === 'saving' ? (
          <SyncBadge label="Saving" tone="pending" />
        ) : saveState === 'saved' ? (
          <SyncBadge label="Saved" tone="saved" />
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={saveState === 'incomplete'}
            className="rounded-md border border-[#F59E0B] px-3 py-2 font-data text-xs font-bold text-[#F59E0B] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            {saveState === 'error' ? 'Retry' : saveState === 'incomplete' ? 'Add both' : 'Save now'}
          </button>
        )}
      </div>
      {score && (
        <div className="mt-2 flex flex-wrap gap-2 font-data text-[10px] uppercase tracking-[0.12em] text-[#A1A1AA]">
          <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
            {formatOutcome(score.outcome)}
          </span>
          {score.cpi_applied && (
            <span className="rounded border border-[#F59E0B]/50 bg-[#0C0C0E] px-2 py-1 text-[#F59E0B]">
              CPI gap {score.cpi_difference}, USA {score.cpi_strokes_usa}, EUR {score.cpi_strokes_europe}
            </span>
          )}
        </div>
      )}
      {error && <p className="mt-2 font-data text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

function SyncBadge({ label, tone }: { label: string; tone: 'saved' | 'pending' }) {
  const className =
    tone === 'saved'
      ? 'border-[#27272A] text-[#484F58]'
      : 'border-[#F59E0B] bg-[#1C1406] text-[#F59E0B]';

  return (
    <div
      className={`border px-3 py-2 text-center font-data text-[10px] font-bold uppercase tracking-[0.14em] sm:rounded-md ${className}`}
    >
      {label}
    </div>
  );
}

async function saveHoleDraft({
  tournament,
  segment,
  players,
  profile,
  holeNumber,
  draft,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  profile: ProfileRow;
  holeNumber: number;
  draft: HoleDraft;
}) {
  await saveHoleScore2026({
    tournament,
    segment,
    players,
    holeNumber,
    strokeIndex: getCourseStrokeIndex(holeNumber),
    usaScore: parseOptionalPositiveInteger(draft.usaScore),
    europeScore: parseOptionalPositiveInteger(draft.europeScore),
    updatedBy: profile.id,
  });
}

function createDrafts(holes: number[], scoreByHole: Map<number, HoleScoreRow>): Record<number, HoleDraft> {
  return Object.fromEntries(holes.map((holeNumber) => [holeNumber, createDraft(scoreByHole.get(holeNumber))]));
}

function createDraft(score: HoleScoreRow | null | undefined): HoleDraft {
  return {
    usaScore: score?.usa_score?.toString() ?? '',
    europeScore: score?.europe_score?.toString() ?? '',
  };
}

function isHoleDirty(draft: HoleDraft | undefined, score: HoleScoreRow | null | undefined): boolean {
  if (!draft) return false;

  const savedDraft = createDraft(score);

  return draft.usaScore !== savedDraft.usaScore || draft.europeScore !== savedDraft.europeScore;
}

function getHoleSaveState({
  draft,
  isDirty,
  isSaving,
  rowError,
}: {
  draft: HoleDraft;
  isDirty: boolean;
  isSaving: boolean;
  rowError: string | null;
}): HoleSaveState {
  if (isSaving) return 'saving';
  if (rowError) return 'error';
  if (!isDirty) return 'saved';

  return isDraftAutosavable(draft) ? 'dirty' : 'incomplete';
}

function isDraftAutosavable(draft: HoleDraft): boolean {
  const hasUsaScore = draft.usaScore.trim().length > 0;
  const hasEuropeScore = draft.europeScore.trim().length > 0;

  return (hasUsaScore && hasEuropeScore) || (!hasUsaScore && !hasEuropeScore);
}

function getSegmentCpiStatus(
  segment: SegmentView,
  players: PlayerRow[],
  threshold: number
): string | null {
  if (segment.kind !== 'singles') {
    return 'CPI disabled for foursomes';
  }

  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const usaPlayer = segment.usa_player_id ? playerLookup.get(segment.usa_player_id) : undefined;
  const europePlayer = segment.europe_player_id ? playerLookup.get(segment.europe_player_id) : undefined;
  const cpi = calculateCpiStrokesForHole(
    {
      usaCpi: usaPlayer?.current_cpi,
      europeCpi: europePlayer?.current_cpi,
      threshold,
    },
    getCourseStrokeIndex(segment.hole_start)
  );

  if (!segment.cpi_enabled) {
    return `CPI disabled. Gap ${cpi.difference}, threshold ${threshold}.`;
  }

  if (!cpi.applies) {
    return `CPI enabled, not applied. Gap ${cpi.difference}, threshold ${threshold}.`;
  }

  return `CPI enabled. Gap ${cpi.difference}; ${cpi.higherCpiTeam} receives strokes.`;
}
