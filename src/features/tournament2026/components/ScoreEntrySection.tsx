import { useEffect, useMemo, useState } from 'react';
import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../../../domain/2026/matchPlayStatus';
import { calculateCpiStrokesForHole } from '../../../domain/2026/scoring';
import {
  getCourseStrokeIndex,
  getDefaultCourseHole,
  type CourseHoleMetadata,
} from '../../../domain/2026/course';
import {
  clearHoleScore2026,
  saveHoleScore2026,
  updateSegmentCpiEnabled,
  type FixtureView,
  type HoleScoreView,
  type PlayerRow,
  type ProfileRow,
  type SegmentView,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
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

interface ScoreLabels {
  usa: string;
  europe: string;
}

type LengthUnit = 'metres' | 'yards';

type HoleSaveState = 'dirty' | 'incomplete' | 'saving' | 'saved' | 'error';
type FixtureScoreView = 'front' | 'back';

export function ScoreEntrySection({
  tournament,
  fixtures,
  players,
  courseHoles,
  profile,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  courseHoles: CourseHoleMetadata[];
  profile: ProfileRow;
  onSaved: () => Promise<void>;
}) {
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('metres');
  const toggleLengthUnit = () => {
    setLengthUnit((unit) => (unit === 'metres' ? 'yards' : 'metres'));
  };

  if (!tournament) {
    return (
      <Panel title="Score Entry" eyebrow="Fixture scores">
        <StatusCard tone="warning">Create an active tournament before entering scores.</StatusCard>
      </Panel>
    );
  }

  if (tournament.is_complete) {
    return (
      <Panel title="Score Entry" eyebrow="Fixture scores">
        <StatusCard tone="warning">
          This tournament is complete. Score entry and CPI settings are locked.
        </StatusCard>
      </Panel>
    );
  }

  return (
    <Panel title="Score Entry" eyebrow="Fixture scores">
      <div className="-mx-3 sm:mx-0">
        {fixtures.length === 0 && (
          <StatusCard tone="warning">
            {profile.is_admin || profile.linked_player_id
              ? 'No fixtures are available for score entry yet.'
              : 'Your profile is not linked to a player yet. Ask an admin to link you before score entry.'}
          </StatusCard>
        )}
        {fixtures.map((fixture, index) => (
          <FixtureScoreCard
            key={fixture.id}
            tournament={tournament}
            fixture={fixture}
            players={players}
            profile={profile}
            courseHoles={courseHoles}
            lengthUnit={lengthUnit}
            initialOpen={fixtures.length === 1 || index === 0}
            onLengthUnitToggle={toggleLengthUnit}
            onSaved={onSaved}
          />
        ))}
      </div>
    </Panel>
  );
}

function FixtureScoreCard({
  tournament,
  fixture,
  players,
  profile,
  courseHoles,
  lengthUnit,
  initialOpen,
  onLengthUnitToggle,
  onSaved,
}: {
  tournament: TournamentRow;
  fixture: FixtureView;
  players: PlayerRow[];
  profile: ProfileRow;
  courseHoles: CourseHoleMetadata[];
  lengthUnit: LengthUnit;
  initialOpen: boolean;
  onLengthUnitToggle: () => void;
  onSaved: () => Promise<void>;
}) {
  const progress = calculateFixtureProgress(fixture.segments);
  const frontSegments = fixture.segments.filter((segment) => segment.kind === 'foursomes');
  const backSegments = fixture.segments.filter((segment) => segment.kind === 'singles');
  const hasFrontAndBack = frontSegments.length > 0 && backSegments.length > 0;
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [activeView, setActiveView] = useState<FixtureScoreView>(() => {
    if (frontSegments.length > 0 && backSegments.length === 0) return 'front';

    return hasFrontAndBack && hasUnplayedScores(frontSegments) ? 'front' : 'back';
  });
  const visibleSegments = activeView === 'front' ? frontSegments : backSegments;

  useEffect(() => {
    if (activeView === 'front' && frontSegments.length === 0) {
      setActiveView('back');
    } else if (activeView === 'back' && backSegments.length === 0) {
      setActiveView('front');
    }
  }, [activeView, backSegments.length, frontSegments.length]);

  return (
    <div className="border-t border-[#27272A] first:border-t-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="w-full px-3 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-[-0.05em] text-[#FAFAFA]">
              {fixture.name ?? `Fixture ${fixture.sort_order + 1}`}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#8B949E]">{formatParticipants(fixture.participants)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="border border-[#27272A] px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-[#A1A1AA]">
              {progress.completedHoles}/{progress.totalHoles}
            </span>
            <span className="border border-[#27272A] px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-[#A1A1AA]">
              {isOpen ? 'Hide' : 'Open'}
            </span>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#18181B]">
          <div className="h-full bg-[#3FB950]" style={{ width: `${progress.percent}%` }} />
        </div>
      </button>
      {isOpen && (
        <div>
          {hasFrontAndBack && (
            <div className="flex gap-2 border-t border-[#27272A] bg-[#050505] px-3 py-3">
              <ScoreViewButton
                label="Front 9"
                isActive={activeView === 'front'}
                onClick={() => setActiveView('front')}
              />
              <ScoreViewButton
                label="Back 9"
                isActive={activeView === 'back'}
                onClick={() => setActiveView('back')}
              />
            </div>
          )}
          {activeView === 'back' && shouldGroupSinglesByHole(backSegments) ? (
            <BackNineGroupedScoreCard
              tournament={tournament}
              segments={backSegments}
              players={players}
              profile={profile}
              courseHoles={courseHoles}
              lengthUnit={lengthUnit}
              onLengthUnitToggle={onLengthUnitToggle}
              onSaved={onSaved}
            />
          ) : (
            visibleSegments.map((segment) => (
              <SegmentScoreCard
                key={segment.id}
                tournament={tournament}
                segment={segment}
                players={players}
                profile={profile}
                courseHoles={courseHoles}
                lengthUnit={lengthUnit}
                onLengthUnitToggle={onLengthUnitToggle}
                onSaved={onSaved}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ScoreViewButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
        isActive
          ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
          : 'border-[#27272A] text-[#8B949E]'
      }`}
    >
      {label}
    </button>
  );
}

function SegmentScoreCard({
  tournament,
  segment,
  players,
  profile,
  courseHoles,
  lengthUnit,
  onLengthUnitToggle,
  onSaved,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  profile: ProfileRow;
  courseHoles: CourseHoleMetadata[];
  lengthUnit: LengthUnit;
  onLengthUnitToggle: () => void;
  onSaved: () => Promise<void>;
}) {
  const holes = createHoleRange(segment.hole_start, segment.hole_end);
  const courseHoleLookup = useMemo(
    () => new Map(courseHoles.map((hole) => [hole.holeNumber, hole])),
    [courseHoles]
  );
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
  const scoreLabels = getSegmentScoreLabels(segment, players);
  const cpiStatus = getSegmentCpiStatus(segment, players, tournament.cpi_threshold, scoreLabels);
  const matchStatus = calculateSegmentMatchPlayStatus(segment);
  const matchStatusLabel = formatMatchStatusLabel(matchStatus, scoreLabels);
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
    track2026('cpi_setting_changed', {
      segment_id: segment.id,
      enabled: !segment.cpi_enabled,
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
        courseHole: courseHoleLookup.get(holeNumber) ?? getDefaultCourseHole(holeNumber),
        holeNumber,
        draft,
      });
      track2026('score_saved', {
        segment_id: segment.id,
        hole_number: holeNumber,
        segment_kind: segment.kind,
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
          courseHole: courseHoleLookup.get(holeNumber) ?? getDefaultCourseHole(holeNumber),
          holeNumber,
          draft,
        });
      }
      await onSaved();
      track2026('scores_bulk_saved', {
        segment_id: segment.id,
        hole_count: dirtyHoles.length,
      });
    } catch (err) {
      setSaveAllError(getErrorMessage(err));
    } finally {
      setSavingHoles(new Set());
    }
  };

  const clearHole = async (holeNumber: number, scoreId: string) => {
    if (!window.confirm(`Clear saved scores for H${holeNumber}?`)) return;

    setSaveAllError(null);
    setRowErrors((current) => {
      const next = { ...current };
      delete next[holeNumber];
      return next;
    });
    setSavingHoles((current) => new Set(current).add(holeNumber));

    try {
      await clearHoleScore2026({ tournament, scoreId });
      track2026('score_cleared', { segment_id: segment.id, hole_number: holeNumber });
      await onSaved();
    } catch (err) {
      setRowErrors((current) => ({ ...current, [holeNumber]: getErrorMessage(err) }));
    } finally {
      setSavingHoles((current) => {
        const next = new Set(current);
        next.delete(holeNumber);
        return next;
      });
    }
  };

  return (
    <div className="border-t border-[#27272A] bg-[#050505]">
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-data text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
            {segment.name ?? formatSegmentKind(segment.kind)}
          </h4>
          <p className="mt-1 font-data text-sm leading-6 text-[#A1A1AA]">{formatSegmentMatchup(segment, players)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <MatchStatusBadge status={matchStatus.state} label={matchStatusLabel} />
            <span className="border border-[#27272A] px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-[#8B949E]">
              {matchStatus.completedHoles}/{matchStatus.totalHoles} played
            </span>
          </div>
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
      {saveAllError && <p className="px-3 pb-3 font-data text-xs text-[#F85149]">{saveAllError}</p>}
      <div>
        {holes.map((holeNumber) => {
          const score = segment.holeScores.find((row) => row.hole_number === holeNumber) ?? null;
          const draft = drafts[holeNumber] ?? createDraft(score);
          const isDirty = dirtyHoles.includes(holeNumber);
          const isSaving = savingHoles.has(holeNumber);
          const rowError = rowErrors[holeNumber] ?? null;
          const courseHole = courseHoleLookup.get(holeNumber) ?? getDefaultCourseHole(holeNumber);

          return (
            <HoleScoreForm
              key={holeNumber}
              holeNumber={holeNumber}
              courseHole={courseHole}
              score={score}
              draft={draft}
              saveState={getHoleSaveState({ draft, isDirty, isSaving, rowError })}
              error={rowError}
              scoreLabels={scoreLabels}
              lengthUnit={lengthUnit}
              canClear={profile.is_admin && Boolean(score)}
              onLengthUnitToggle={onLengthUnitToggle}
              onDraftChange={(nextDraft) => updateDraft(holeNumber, nextDraft)}
              onSave={() => saveHole(holeNumber)}
              onClear={() => {
                if (!score) return Promise.resolve();
                return clearHole(holeNumber, score.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function BackNineGroupedScoreCard({
  tournament,
  segments,
  players,
  profile,
  courseHoles,
  lengthUnit,
  onLengthUnitToggle,
  onSaved,
}: {
  tournament: TournamentRow;
  segments: SegmentView[];
  players: PlayerRow[];
  profile: ProfileRow;
  courseHoles: CourseHoleMetadata[];
  lengthUnit: LengthUnit;
  onLengthUnitToggle: () => void;
  onSaved: () => Promise<void>;
}) {
  const holeNumbers = createGroupedHoleRange(segments);
  const courseHoleLookup = useMemo(
    () => new Map(courseHoles.map((hole) => [hole.holeNumber, hole])),
    [courseHoles]
  );

  return (
    <div className="border-t border-[#27272A] bg-[#050505]">
      <div className="px-3 py-3">
        <p className="font-data text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
          Back 9 Singles
        </p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Enter both singles matches by hole, so the group can score the hole they are actually playing.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {segments.map((segment) => (
            <SegmentStatusPill
              key={segment.id}
              tournament={tournament}
              segment={segment}
              players={players}
              profile={profile}
              onSaved={onSaved}
            />
          ))}
        </div>
      </div>
      <div>
        {holeNumbers.map((holeNumber) => {
          const courseHole = courseHoleLookup.get(holeNumber) ?? getDefaultCourseHole(holeNumber);

          return (
            <div key={holeNumber} className="border-t border-[#27272A] bg-[#0C0C0E]">
              <div className="flex items-baseline justify-between gap-3 px-3 py-3">
                <div className="font-data text-2xl font-bold tracking-[-0.07em] text-[#FAFAFA]">
                  H{holeNumber}
                </div>
                <HoleMetadata
                  courseHole={courseHole}
                  lengthUnit={lengthUnit}
                  onLengthUnitToggle={onLengthUnitToggle}
                />
              </div>
              <div className="grid gap-2 px-2 pb-3 sm:px-3 lg:grid-cols-2">
                {segments.map((segment) => (
                  <SingleHoleScoreCard
                    key={`${segment.id}-${holeNumber}`}
                    tournament={tournament}
                    segment={segment}
                    players={players}
                    profile={profile}
                    courseHole={courseHole}
                    holeNumber={holeNumber}
                    onSaved={onSaved}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SegmentStatusPill({
  tournament,
  segment,
  players,
  profile,
  onSaved,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  profile: ProfileRow;
  onSaved: () => Promise<void>;
}) {
  const labels = getSegmentScoreLabels(segment, players);
  const status = calculateSegmentMatchPlayStatus(segment);
  const cpiStatus = getSegmentCpiStatus(segment, players, tournament.cpi_threshold, labels);
  const canConfigureCpi = profile.is_admin && segment.kind === 'singles';

  const handleCpiToggle = async () => {
    if (!canConfigureCpi) return;

    await updateSegmentCpiEnabled({
      tournament,
      segment,
      players,
      enabled: !segment.cpi_enabled,
      updatedBy: profile.id,
    });
    track2026('cpi_setting_changed', {
      segment_id: segment.id,
      enabled: !segment.cpi_enabled,
    });
    await onSaved();
  };

  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2">
      <p className="text-xs font-bold text-[#FAFAFA]">{segment.name ?? formatSegmentMatchup(segment, players)}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#8B949E]">
        {formatMatchStatusLabel(status, labels)}
      </p>
      {cpiStatus && (
        <p className="mt-1 text-[10px] text-[#8B949E]">
          {cpiStatus}
          {canConfigureCpi && (
            <button
              type="button"
              onClick={handleCpiToggle}
              className="ml-2 rounded border border-[#27272A] px-1.5 py-0.5 text-[#E6EDF3] hover:border-[#3FB950]"
            >
              {segment.cpi_enabled ? 'Disable' : 'Enable'}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

function SingleHoleScoreCard({
  tournament,
  segment,
  players,
  profile,
  courseHole,
  holeNumber,
  onSaved,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  profile: ProfileRow;
  courseHole: CourseHoleMetadata;
  holeNumber: number;
  onSaved: () => Promise<void>;
}) {
  const score = segment.holeScores.find((row) => row.hole_number === holeNumber) ?? null;
  const [draft, setDraft] = useState<HoleDraft>(() => createDraft(score));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scoreLabels = getSegmentScoreLabels(segment, players);
  const isDirty = isHoleDirty(draft, score);

  useEffect(() => {
    setDraft(createDraft(score));
  }, [score]);

  const saveHole = async () => {
    setError(null);
    setIsSaving(true);

    try {
      await saveHoleDraft({
        tournament,
        segment,
        players,
        profile,
        courseHole,
        holeNumber,
        draft,
      });
      track2026('score_saved', {
        segment_id: segment.id,
        hole_number: holeNumber,
        segment_kind: segment.kind,
      });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const clearHole = async () => {
    if (!score || !window.confirm(`Clear saved scores for H${holeNumber}?`)) return;

    setError(null);
    setIsSaving(true);

    try {
      await clearHoleScore2026({ tournament, scoreId: score.id });
      track2026('score_cleared', { segment_id: segment.id, hole_number: holeNumber });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <HoleScoreForm
      holeNumber={holeNumber}
      courseHole={courseHole}
      score={score}
      draft={draft}
      saveState={getHoleSaveState({ draft, isDirty, isSaving, rowError: error })}
      error={error}
      scoreLabels={scoreLabels}
      rowLabel={segment.name ?? formatSegmentMatchup(segment, players)}
      rowMeta={formatSegmentMatchup(segment, players)}
      showHoleMetadata={false}
      canClear={profile.is_admin && Boolean(score)}
      onDraftChange={setDraft}
      onSave={saveHole}
      onClear={clearHole}
    />
  );
}

function HoleScoreForm({
  holeNumber,
  courseHole,
  score,
  draft,
  saveState,
  error,
  scoreLabels,
  lengthUnit,
  rowLabel,
  rowMeta,
  showHoleMetadata = true,
  canClear,
  onLengthUnitToggle,
  onDraftChange,
  onSave,
  onClear,
}: {
  holeNumber: number;
  courseHole: CourseHoleMetadata;
  score: HoleScoreView | null;
  draft: HoleDraft;
  saveState: HoleSaveState;
  error: string | null;
  scoreLabels: ScoreLabels;
  lengthUnit?: LengthUnit;
  rowLabel?: string;
  rowMeta?: string;
  showHoleMetadata?: boolean;
  canClear: boolean;
  onLengthUnitToggle?: () => void;
  onDraftChange: (draft: HoleDraft) => void;
  onSave: () => void;
  onClear: () => Promise<void>;
}) {
  const isDirty = saveState === 'dirty' || saveState === 'incomplete';
  const [isEditingSaved, setIsEditingSaved] = useState(false);
  const borderClass =
    saveState === 'error' ? 'border-[#F85149]' : isDirty ? 'border-[#F59E0B]' : 'border-[#27272A]';

  useEffect(() => {
    setIsEditingSaved(false);
  }, [score?.updated_at]);

  useEffect(() => {
    if (saveState !== 'dirty' || (score && !isEditingSaved)) return undefined;

    const timer = window.setTimeout(() => {
      onSave();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [draft.europeScore, draft.usaScore, isEditingSaved, onSave, saveState, score]);

  if (score && saveState === 'saved' && !isEditingSaved) {
    return (
      <div className={`border-t bg-[#101012] px-3 py-3 transition-colors ${borderClass}`}>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#FAFAFA]">
              {rowLabel ?? `H${holeNumber}`}
            </p>
            <p className="mt-1 text-xs text-[#8B949E]">
              {scoreLabels.usa} {score.usa_score ?? '--'} - {scoreLabels.europe} {score.europe_score ?? '--'} ·{' '}
              {formatOutcome(score.outcome, scoreLabels)}
            </p>
            {rowMeta && <p className="mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-[#8B949E]">{rowMeta}</p>}
            <div className="mt-2 flex flex-wrap gap-2 font-data text-[10px] uppercase tracking-[0.12em] text-[#A1A1AA]">
              <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
                Saved {formatAuditTime(score.updated_at)}
              </span>
              {score.updatedByProfile && (
                <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
                  By {score.updatedByProfile.display_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditingSaved(true)}
              className="rounded-md border border-[#27272A] px-3 py-2 font-data text-xs font-bold uppercase tracking-[0.14em] text-[#E6EDF3]"
            >
              Edit
            </button>
            {canClear && (
              <button
                type="button"
                onClick={() => {
                  void onClear();
                }}
                className="rounded-md border border-[#F85149] px-3 py-2 font-data text-xs font-bold uppercase tracking-[0.14em] text-[#F85149]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t bg-[#101012] px-3 py-3 transition-colors ${borderClass}`}>
      <div className="grid gap-3 lg:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)_7rem] lg:items-center">
        <div className="flex items-baseline justify-between gap-3 lg:block">
          <div
            className={`font-data font-bold text-[#FAFAFA] ${
              rowLabel
                ? 'text-lg tracking-[-0.04em] lg:text-base'
                : 'text-2xl tracking-[-0.07em] lg:text-xl'
            }`}
          >
            {rowLabel ?? `H${holeNumber}`}
          </div>
          {rowMeta && <div className="text-[10px] uppercase tracking-[0.12em] text-[#8B949E]">{rowMeta}</div>}
          {showHoleMetadata && lengthUnit && onLengthUnitToggle && (
            <HoleMetadata
              courseHole={courseHole}
              lengthUnit={lengthUnit}
              onLengthUnitToggle={onLengthUnitToggle}
            />
          )}
        </div>
        <ScorePicker
          label={scoreLabels.usa}
          value={draft.usaScore}
          onChange={(usaScore) => onDraftChange({ ...draft, usaScore })}
        />
        <ScorePicker
          label={scoreLabels.europe}
          value={draft.europeScore}
          onChange={(europeScore) => onDraftChange({ ...draft, europeScore })}
        />
        <div className="grid gap-2">
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
          {canClear && (
            <button
              type="button"
              onClick={() => {
                void onClear();
              }}
              className="rounded-md border border-[#F85149] px-3 py-2 font-data text-xs font-bold text-[#F85149]"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {score && (
        <div className="mt-2 flex flex-wrap gap-2 font-data text-[10px] uppercase tracking-[0.12em] text-[#A1A1AA]">
          <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
            {formatOutcome(score.outcome, scoreLabels)}
          </span>
          {score.cpi_applied && (
            <span className="rounded border border-[#F59E0B]/50 bg-[#0C0C0E] px-2 py-1 text-[#F59E0B]">
              CPI gap {score.cpi_difference}, USA {score.cpi_strokes_usa}, EUR {score.cpi_strokes_europe}
            </span>
          )}
          <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
            Saved {formatAuditTime(score.updated_at)}
          </span>
          {score.updatedByProfile && (
            <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
              By {score.updatedByProfile.display_name}
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

function HoleMetadata({
  courseHole,
  lengthUnit,
  onLengthUnitToggle,
}: {
  courseHole: CourseHoleMetadata;
  lengthUnit: LengthUnit;
  onLengthUnitToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 font-data text-[10px] uppercase tracking-[0.12em] text-[#8B949E] lg:mt-1 lg:justify-start">
      {courseHole.yardage ? (
        <button
          type="button"
          onClick={onLengthUnitToggle}
          aria-label={`Show lengths in ${lengthUnit === 'metres' ? 'yards' : 'metres'}`}
          className="-mx-1 rounded border border-transparent px-1 text-[#A1A1AA] underline decoration-dotted underline-offset-2 hover:border-[#3F3F46] hover:text-[#FAFAFA] focus:border-[#3FB950] focus:outline-none"
        >
          {formatLengthLabel(courseHole.yardage, lengthUnit)}
        </button>
      ) : (
        <span>Length --</span>
      )}
      {courseHole.par && <span>Par {courseHole.par}</span>}
      <span>SI {courseHole.strokeIndex}</span>
    </div>
  );
}

function MatchStatusBadge({
  status,
  label,
}: {
  status: ReturnType<typeof calculateSegmentMatchPlayStatus>['state'];
  label: string;
}) {
  const className =
    status === 'won'
      ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
      : status === 'dormie'
        ? 'border-[#F59E0B] bg-[#1C1406] text-[#F59E0B]'
        : 'border-[#27272A] bg-[#0C0C0E] text-[#A1A1AA]';

  return (
    <span className={`border px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] ${className}`}>
      {label}
    </span>
  );
}

function getSegmentScoreLabels(segment: SegmentView, players: PlayerRow[]): ScoreLabels {
  if (segment.kind !== 'singles') {
    return { usa: 'USA', europe: 'Europe' };
  }

  const playerLookup = new Map(players.map((player) => [player.id, player.name]));

  return {
    usa: segment.usa_player_id ? (playerLookup.get(segment.usa_player_id) ?? 'Side A') : 'Side A',
    europe: segment.europe_player_id ? (playerLookup.get(segment.europe_player_id) ?? 'Side B') : 'Side B',
  };
}

function hasUnplayedScores(segments: SegmentView[]): boolean {
  return segments.some((segment) => {
    const scoredHoles = new Set(
      segment.holeScores
        .filter((score) => score.outcome !== 'unplayed')
        .map((score) => score.hole_number)
    );

    return createHoleRange(segment.hole_start, segment.hole_end).some(
      (holeNumber) => !scoredHoles.has(holeNumber)
    );
  });
}

function shouldGroupSinglesByHole(segments: SegmentView[]): boolean {
  if (segments.length < 2) {
    return false;
  }

  const [firstSegment] = segments;

  return segments.every(
    (segment) =>
      segment.kind === 'singles' &&
      segment.hole_start === firstSegment.hole_start &&
      segment.hole_end === firstSegment.hole_end
  );
}

function createGroupedHoleRange(segments: SegmentView[]): number[] {
  const holes = new Set<number>();

  for (const segment of segments) {
    for (const holeNumber of createHoleRange(segment.hole_start, segment.hole_end)) {
      holes.add(holeNumber);
    }
  }

  return Array.from(holes).sort((a, b) => a - b);
}

function formatMatchStatusLabel(
  status: ReturnType<typeof calculateSegmentMatchPlayStatus>,
  labels: ScoreLabels
): string {
  if (!status.leader) {
    return status.label;
  }

  const leaderLabel = status.leader === 'USA' ? labels.usa : labels.europe;

  if (status.state === 'won') {
    return status.holesRemaining === 0
      ? `${leaderLabel} wins by ${status.margin}`
      : `${leaderLabel} wins ${status.margin} & ${status.holesRemaining}`;
  }

  if (status.state === 'dormie') {
    return `${leaderLabel} dormie ${status.margin}`;
  }

  return `${leaderLabel} ${status.margin} up`;
}

function formatLengthLabel(yardage: number, unit: LengthUnit): string {
  if (unit === 'yards') {
    return `Length ${yardage} yds`;
  }

  return `Length ${Math.round(yardage * 0.9144)} m`;
}

async function saveHoleDraft({
  tournament,
  segment,
  players,
  profile,
  courseHole,
  holeNumber,
  draft,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  profile: ProfileRow;
  courseHole: CourseHoleMetadata;
  holeNumber: number;
  draft: HoleDraft;
}) {
  await saveHoleScore2026({
    tournament,
    segment,
    players,
    holeNumber,
    strokeIndex: courseHole.strokeIndex,
    usaScore: parseOptionalPositiveInteger(draft.usaScore),
    europeScore: parseOptionalPositiveInteger(draft.europeScore),
    updatedBy: profile.id,
  });
}

function createDrafts(holes: number[], scoreByHole: Map<number, HoleScoreView>): Record<number, HoleDraft> {
  return Object.fromEntries(holes.map((holeNumber) => [holeNumber, createDraft(scoreByHole.get(holeNumber))]));
}

function createDraft(score: HoleScoreView | null | undefined): HoleDraft {
  return {
    usaScore: score?.usa_score?.toString() ?? '',
    europeScore: score?.europe_score?.toString() ?? '',
  };
}

function isHoleDirty(draft: HoleDraft | undefined, score: HoleScoreView | null | undefined): boolean {
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

function formatAuditTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getSegmentCpiStatus(
  segment: SegmentView,
  players: PlayerRow[],
  threshold: number,
  labels: ScoreLabels
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

  const higherCpiPlayer = cpi.higherCpiTeam === 'USA' ? labels.usa : labels.europe;

  return `CPI enabled. Gap ${cpi.difference}; ${higherCpiPlayer} receives strokes.`;
}
