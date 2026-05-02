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
import { ScoreInput } from './FormControls';
import { Panel, StatusCard } from './Layout';

interface HoleDraft {
  usaScore: string;
  europeScore: string;
}

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
      <div className="space-y-5">
        {fixtures.length === 0 && <StatusCard tone="warning">No fixtures have been created yet.</StatusCard>}
        {fixtures.map((fixture) => (
          <div key={fixture.id} className="rounded-2xl border border-chalk-800 bg-ink-950/70 p-4">
            <h3 className="font-display text-xl font-semibold">
              {fixture.name ?? `Fixture ${fixture.sort_order + 1}`}
            </h3>
            <p className="mt-1 text-sm text-chalk-400">{formatParticipants(fixture.participants)}</p>
            <div className="mt-4 space-y-4">
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
  };

  const saveHole = async (holeNumber: number) => {
    const draft = drafts[holeNumber];

    if (!draft) return;

    setSaveAllError(null);
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
      setSaveAllError(getErrorMessage(err));
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
    <div className="rounded-lg border border-[#27272A] bg-[#0F0F11] p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-data text-sm font-bold text-[#FAFAFA]">{segment.name ?? formatSegmentKind(segment.kind)}</h4>
          <p className="mt-1 font-data text-xs text-[#A1A1AA]">{formatSegmentMatchup(segment, players)}</p>
          {cpiStatus && (
            <p className="mt-1 font-data text-[11px] text-[#8B949E]">
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
          <span className="rounded border border-[#27272A] px-3 py-1 font-data text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA]">
            Holes {segment.hole_start}-{segment.hole_end}
          </span>
        </div>
      </div>
      {saveAllError && <p className="mt-2 font-data text-xs text-[#F85149]">{saveAllError}</p>}
      <div className="mt-3 grid gap-2">
        {holes.map((holeNumber) => {
          const score = segment.holeScores.find((row) => row.hole_number === holeNumber) ?? null;
          const draft = drafts[holeNumber] ?? createDraft(score);

          return (
            <HoleScoreForm
              key={holeNumber}
              holeNumber={holeNumber}
              distance={distances[holeNumber - 1] ?? null}
              score={score}
              draft={draft}
              isDirty={dirtyHoles.includes(holeNumber)}
              isSaving={savingHoles.has(holeNumber)}
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
  isDirty,
  isSaving,
  onDraftChange,
  onSave,
}: {
  holeNumber: number;
  distance: number | null;
  score: HoleScoreRow | null;
  draft: HoleDraft;
  isDirty: boolean;
  isSaving: boolean;
  onDraftChange: (draft: HoleDraft) => void;
  onSave: () => void;
}) {
  const strokeIndex = getCourseStrokeIndex(holeNumber);

  return (
    <div
      className={`rounded-md border bg-[#18181B] p-3 transition-colors ${
        isDirty ? 'border-[#F59E0B]' : 'border-[#27272A]'
      }`}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[7rem_1fr_1fr_5rem_auto] sm:items-center">
        <div>
          <div className="font-data text-lg font-bold text-[#FAFAFA]">H{holeNumber}</div>
          <div className="mt-1 flex flex-wrap gap-2 font-data text-[10px] uppercase tracking-[0.12em] text-[#8B949E]">
            {distance && <span>{distance} yds</span>}
            <span>SI {strokeIndex}</span>
          </div>
        </div>
        <ScoreInput
          label="USA"
          value={draft.usaScore}
          onChange={(usaScore) => onDraftChange({ ...draft, usaScore })}
        />
        <ScoreInput
          label="Europe"
          value={draft.europeScore}
          onChange={(europeScore) => onDraftChange({ ...draft, europeScore })}
        />
        <div className="hidden text-xs uppercase tracking-[0.14em] text-[#8B949E] sm:block">
          SI
          <div className="mt-1 rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 font-data text-sm text-[#E6EDF3]">
            {strokeIndex}
          </div>
        </div>
        {isDirty ? (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="col-span-2 rounded-md bg-[#3FB950] px-3 py-2 font-data text-xs font-bold text-[#09090B] disabled:opacity-60 sm:col-span-1"
          >
            {isSaving ? 'Saving' : 'Save'}
          </button>
        ) : (
          <div className="col-span-2 hidden font-data text-[10px] uppercase tracking-[0.14em] text-[#484F58] sm:block">
            Saved
          </div>
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
