import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../../../domain/2026/matchPlayStatus';
import { calculateCpiStrokesForHole, type CpiStrokes } from '../../../domain/2026/scoring';
import {
  getCourseStrokeIndex,
  getDefaultCourseHole,
  type CourseHoleMetadata,
} from '../../../domain/2026/course';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import {
  saveHoleScore2026,
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
  formatSegmentKind,
  formatSegmentMatchup,
  getErrorMessage,
  parseOptionalPositiveInteger,
} from '../viewUtils';
import { BackNineIndividualTotalsCard } from './BackNineIndividualTotalsCard';
import { FixtureTitleTrigger } from './FixtureDetailsPopover';
import { ScorePicker } from './FormControls';
import { StatusCard, TerminalPageSection } from './Layout';
import { PlayerHistoryTrigger } from './PlayerHistory';

interface HoleDraft {
  usaScore: string;
  europeScore: string;
}

interface ScoreLabels {
  usa: string;
  europe: string;
  usaSubtitle?: string;
  europeSubtitle?: string;
}

interface HoleCpiDisplay {
  summary: string;
  usaStrokes: number;
  europeStrokes: number;
}

type LengthUnit = 'metres' | 'yards';

type HoleSaveState = 'dirty' | 'incomplete' | 'saving' | 'saved' | 'error';
type FixtureScoreView = 'front' | 'back';

const SCORE_DRAFT_STORAGE_PREFIX = 'rrc:2026:score-draft:';
const SCORE_SAVE_TIMEOUT_MS = 10_000;

interface ScoreSyncRow {
  state: HoleSaveState;
  error: string | null;
  retry: () => void;
}

type ScoreSyncRows = Record<string, ScoreSyncRow>;

interface ScoreSyncContextValue {
  registerRow: (rowKey: string, row: ScoreSyncRow) => void;
  unregisterRow: (rowKey: string) => void;
}

const ScoreSyncContext = createContext<ScoreSyncContextValue | null>(null);

export function ScoreEntrySection({
  tournament,
  fixtures,
  players,
  courseHoles,
  profile,
  onViewArchive,
  onViewProfile,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  courseHoles: CourseHoleMetadata[];
  profile: ProfileRow;
  onViewArchive?: () => void;
  onViewProfile?: () => void;
  onSaved: () => Promise<void>;
}) {
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('metres');
  const [syncRows, setSyncRows] = useState<ScoreSyncRows>({});
  const isOnline = useOnlineStatus();
  const wasOnlineRef = useRef(isOnline);
  const toggleLengthUnit = () => {
    setLengthUnit((unit) => (unit === 'metres' ? 'yards' : 'metres'));
  };
  const registerRow = useCallback((rowKey: string, row: ScoreSyncRow) => {
    setSyncRows((current) => ({ ...current, [rowKey]: row }));
  }, []);
  const unregisterRow = useCallback((rowKey: string) => {
    setSyncRows((current) => {
      if (!(rowKey in current)) {
        return current;
      }

      const next = { ...current };
      delete next[rowKey];
      return next;
    });
  }, []);
  const syncContextValue = useMemo(
    () => ({ registerRow, unregisterRow }),
    [registerRow, unregisterRow]
  );
  const hasUnsavedRows = Object.values(syncRows).some((row) =>
    row.state === 'dirty' || row.state === 'incomplete' || row.state === 'error' || row.state === 'saving'
  );

  useEffect(() => {
    if (!hasUnsavedRows) {
      return undefined;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeUnload);

    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedRows]);

  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;

    if (!wasOnline && isOnline) {
      for (const row of Object.values(syncRows)) {
        if (row.state === 'error') {
          row.retry();
        }
      }
    }

    return undefined;
  }, [isOnline, syncRows]);

  if (!tournament) {
    return (
      <TerminalPageSection
        title="my game"
        eyebrow="fixture scores"
        description="this tab wakes up when the tournament is live and your player is in a fixture."
        actions={<ScoreEntryStatusPill tone="warning">setup needed</ScoreEntryStatusPill>}
      >
        <div className="px-3 pb-3 sm:px-4">
          <StatusCard tone="warning">
            <div className="space-y-3">
              <p>
                Nothing to score yet. An admin needs to start the tournament and put your player in a
                fixture or game before your scorecard appears here.
              </p>
              <div className="flex flex-wrap gap-2">
                {onViewArchive ? (
                  <button
                    type="button"
                    onClick={onViewArchive}
                    className="min-h-11 rounded-md border border-[#F59E0B]/60 bg-[#050506] px-3 py-2 text-xs font-semibold text-[#FAFAFA] transition hover:border-[#FAFAFA] focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FAFAFA]"
                  >
                    View Archive
                  </button>
                ) : null}
                {onViewProfile ? (
                  <button
                    type="button"
                    onClick={onViewProfile}
                    className="min-h-11 rounded-md border border-[#F59E0B]/60 bg-[#050506] px-3 py-2 text-xs font-semibold text-[#FAFAFA] transition hover:border-[#FAFAFA] focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#FAFAFA]"
                  >
                    Open Profile
                  </button>
                ) : null}
              </div>
              <p className="text-xs leading-5 text-[#E6EDF3]">
                In the meantime, browse past tournaments in the Archive, tap player names to check
                out profiles, or open Profile to generate your AI scouting dossier.
              </p>
            </div>
          </StatusCard>
        </div>
      </TerminalPageSection>
    );
  }

  if (tournament.is_complete) {
    return (
      <TerminalPageSection
        title="my game"
        eyebrow="fixture scores"
        description={`${tournament.name ?? 'tournament'} is locked after finalization.`}
        actions={<ScoreEntryStatusPill tone="warning">locked</ScoreEntryStatusPill>}
      >
        <div className="px-3 pb-3 sm:px-4">
          <StatusCard tone="warning">
            This tournament is complete. Score entry and CPI settings are locked.
          </StatusCard>
        </div>
      </TerminalPageSection>
    );
  }

  return (
    <ScoreSyncContext.Provider value={syncContextValue}>
      <TerminalPageSection
        title="my game"
        eyebrow="fixture scores"
        description={`${tournament.name ?? 'tournament'} · ${fixtures.length} ${
          fixtures.length === 1 ? 'fixture' : 'fixtures'
        } available`}
        actions={
          <ScoreEntryStatusPill tone={isOnline ? 'success' : 'warning'}>
            {isOnline ? 'live' : 'offline'}
          </ScoreEntryStatusPill>
        }
      >
        <ScoreSyncBanner rows={syncRows} isOnline={isOnline} />
        <div>
          {fixtures.length === 0 && (
            <div className="px-3 pb-3 sm:px-4">
              <StatusCard tone="warning">
                {getNoScoreFixturesMessage(profile)}
              </StatusCard>
            </div>
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
      </TerminalPageSection>
    </ScoreSyncContext.Provider>
  );
}

function ScoreEntryStatusPill({
  tone,
  children,
}: {
  tone: 'success' | 'warning';
  children: string;
}) {
  const className = tone === 'success'
    ? 'border-[#3FB950]/60 bg-[#06170B] text-[#3FB950]'
    : 'border-[#F59E0B]/60 bg-[#1C1406] text-[#F59E0B]';

  return (
    <span className={`border px-2 py-1 text-[10px] lowercase tracking-[0.14em] ${className}`}>
      {children}
    </span>
  );
}

function getNoScoreFixturesMessage(profile: ProfileRow): string {
  if (profile.linked_player_id) {
    return 'No fixtures are available for your player yet.';
  }

  if (profile.is_admin) {
    return 'Your admin profile is not linked to a player yet. Link it in Admin before My Game can show your fixture.';
  }

  return 'Your profile is not linked to a player yet. Ask an admin to link you before score entry.';
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
      <div className="px-3 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <FixtureTitleTrigger
              fixture={fixture}
              players={players}
              tournament={tournament}
              className="text-xl font-bold tracking-[-0.05em] text-[#FAFAFA]"
            />
            <FixtureParticipantsLine fixture={fixture} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="border border-[#27272A] px-2 py-1 font-data text-[10px] tracking-[0.16em] tabular-nums text-[#A1A1AA]">
              {progress.completedHoles}/{progress.totalHoles}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen((current) => {
                  const next = !current;
                  track2026('score_fixture_toggled', {
                    fixture_id: fixture.id,
                    is_open: next,
                  });
                  return next;
                });
              }}
              className="min-h-11 border border-[#27272A] px-3 py-2 font-data text-[10px] tracking-[0.16em] text-[#A1A1AA] hover:border-[#3FB950] hover:text-[#3FB950]"
            >
              {isOpen ? 'Hide' : 'Open'}
            </button>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#18181B]">
          <div className="h-full bg-[#3FB950]" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
      {isOpen && (
        <div>
          {hasFrontAndBack && (
            <div className="flex gap-2 border-t border-[#27272A] bg-[#050506] px-3 py-3">
              <ScoreViewButton
                label="Front 9"
                isActive={activeView === 'front'}
                onClick={() => {
                  setActiveView('front');
                  track2026('score_fixture_view_changed', {
                    fixture_id: fixture.id,
                    view: 'front',
                  });
                }}
              />
              <ScoreViewButton
                label="Back 9"
                isActive={activeView === 'back'}
                onClick={() => {
                  setActiveView('back');
                  track2026('score_fixture_view_changed', {
                    fixture_id: fixture.id,
                    view: 'back',
                  });
                }}
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
            <>
              {activeView === 'back' && (
                <BackNineIndividualTotalsCard segments={backSegments} players={players} />
              )}
              {visibleSegments.map((segment) => (
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
              ))}
            </>
          )}
          {hasFrontAndBack && activeView === 'front' && (
            <FixtureViewAdvance
              label="advance to back 9"
              progress={calculateFixtureProgress(frontSegments)}
              onClick={() => {
                setActiveView('back');
                track2026('score_fixture_view_changed', {
                  fixture_id: fixture.id,
                  view: 'back',
                  source: 'advance_button',
                });
              }}
            />
          )}
          {hasFrontAndBack && activeView === 'back' && (
            <FixtureViewAdvance
              label="back to front 9"
              direction="back"
              progress={calculateFixtureProgress(backSegments)}
              onClick={() => {
                setActiveView('front');
                track2026('score_fixture_view_changed', {
                  fixture_id: fixture.id,
                  view: 'front',
                  source: 'advance_button',
                });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FixtureParticipantsLine({ fixture }: { fixture: FixtureView }) {
  const usaParticipants = fixture.participants.filter((participant) => participant.team === 'USA');
  const europeParticipants = fixture.participants.filter((participant) => participant.team === 'EUROPE');

  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-[#8B949E]">
      <FixtureTeamParticipants teamLabel="USA" participants={usaParticipants} />
      <FixtureTeamParticipants teamLabel="Europe" participants={europeParticipants} />
    </p>
  );
}

function FixtureTeamParticipants({
  teamLabel,
  participants,
}: {
  teamLabel: string;
  participants: FixtureView['participants'];
}) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <span>
      {teamLabel}:{' '}
      {participants.map((participant, index) => {
        const playerName = participant.player?.name ?? 'Unknown player';
        const playerTeam = participant.player?.team;
        const teamSuffix = playerTeam && playerTeam !== participant.team ? ` (${playerTeam})` : '';

        return (
          <span key={`${participant.fixture_id}-${participant.player_id}-${participant.team}`}>
            {index > 0 ? ', ' : ''}
            <PlayerHistoryTrigger player={participant.player} fallback={playerName}>
              {playerName}
            </PlayerHistoryTrigger>
            {teamSuffix}
          </span>
        );
      })}
    </span>
  );
}

function ScoreSyncBanner({ rows, isOnline }: { rows: ScoreSyncRows; isOnline: boolean }) {
  const rowList = Object.values(rows);
  const dirtyCount = rowList.filter((row) => row.state === 'dirty').length;
  const incompleteCount = rowList.filter((row) => row.state === 'incomplete').length;
  const savingCount = rowList.filter((row) => row.state === 'saving').length;
  const errorRows = rowList.filter((row) => row.state === 'error');
  const unsavedCount = dirtyCount + incompleteCount + errorRows.length;

  if (rowList.length === 0 || (unsavedCount === 0 && savingCount === 0 && isOnline)) {
    return (
      <div className="border-b border-[#27272A] px-3 py-2 font-data text-[10px] tracking-[0.16em] text-[#3FB950] sm:px-4">
        All saved
      </div>
    );
  }

  const retryAll = () => {
    for (const row of errorRows) {
      row.retry();
    }
  };
  const toneClass = !isOnline || errorRows.length > 0
    ? 'border-[#F85149] bg-[#1A0808] text-[#F85149]'
    : savingCount > 0
      ? 'border-[#F59E0B] bg-[#1C1406] text-[#F59E0B]'
      : 'border-[#F59E0B] bg-[#1C1406] text-[#F59E0B]';
  const message = getSyncBannerMessage({
    isOnline,
    savingCount,
    dirtyCount,
    incompleteCount,
    errorCount: errorRows.length,
  });

  return (
    <div className={`border-b px-3 py-3 sm:px-4 ${toneClass}`} role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-data text-xs font-bold tracking-[0.14em]">{message}</p>
        {errorRows.length > 0 && (
          <button
            type="button"
            onClick={retryAll}
            disabled={!isOnline || savingCount > 0}
            className="rounded-md border border-current px-3 py-2 font-data text-[10px] font-bold tracking-[0.14em] disabled:opacity-50"
          >
            Retry all
          </button>
        )}
      </div>
    </div>
  );
}

function getSyncBannerMessage({
  isOnline,
  savingCount,
  dirtyCount,
  incompleteCount,
  errorCount,
}: {
  isOnline: boolean;
  savingCount: number;
  dirtyCount: number;
  incompleteCount: number;
  errorCount: number;
}): string {
  if (!isOnline) {
    const unsaved = dirtyCount + incompleteCount + errorCount;
    return unsaved > 0
      ? `Offline, ${unsaved} score ${unsaved === 1 ? 'row is' : 'rows are'} not saved`
      : 'Offline, new scores will not save';
  }

  if (errorCount > 0) {
    return `${errorCount} score ${errorCount === 1 ? 'row' : 'rows'} failed to save`;
  }

  if (savingCount > 0) {
    return `Saving ${savingCount} score ${savingCount === 1 ? 'row' : 'rows'}`;
  }

  if (incompleteCount > 0) {
    return `${incompleteCount} incomplete score ${incompleteCount === 1 ? 'row' : 'rows'}`;
  }

  if (dirtyCount > 0) {
    return `${dirtyCount} unsaved score ${dirtyCount === 1 ? 'row' : 'rows'}`;
  }

  return 'All saved';
}

function SegmentMatchupPlayers({ segment, players }: { segment: SegmentView; players: PlayerRow[] }) {
  const playerLookup = new Map(players.map((player) => [player.id, player]));

  if (segment.kind === 'foursomes') {
    const usaPlayers = segment.players
      .filter((player) => player.team === 'USA')
      .map((segmentPlayer) => segmentPlayer.player)
      .filter((player): player is PlayerRow => Boolean(player));
    const europePlayers = segment.players
      .filter((player) => player.team === 'EUROPE')
      .map((segmentPlayer) => segmentPlayer.player)
      .filter((player): player is PlayerRow => Boolean(player));

    return (
      <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 font-data text-sm leading-6 text-[#A1A1AA]">
        <PlayerList players={usaPlayers} />
        <span>vs</span>
        <PlayerList players={europePlayers} />
      </p>
    );
  }

  const usaPlayer = segment.usa_player_id ? playerLookup.get(segment.usa_player_id) : null;
  const europePlayer = segment.europe_player_id ? playerLookup.get(segment.europe_player_id) : null;

  return (
    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 font-data text-sm leading-6 text-[#A1A1AA]">
      <PlayerHistoryTrigger player={usaPlayer} fallback="USA player">
        {usaPlayer?.name ?? 'USA player'}
      </PlayerHistoryTrigger>
      <span>vs</span>
      <PlayerHistoryTrigger player={europePlayer} fallback="Europe player">
        {europePlayer?.name ?? 'Europe player'}
      </PlayerHistoryTrigger>
    </p>
  );
}

function PlayerList({ players }: { players: PlayerRow[] }) {
  if (players.length === 0) {
    return <span>Unknown players</span>;
  }

  return (
    <span className="flex flex-wrap gap-x-1">
      {players.map((player, index) => (
        <span key={player.id} className="inline-flex gap-x-1">
          {index > 0 && <span>+</span>}
          <PlayerHistoryTrigger player={player}>{player.name}</PlayerHistoryTrigger>
        </span>
      ))}
    </span>
  );
}

function FixtureViewAdvance({
  label,
  progress,
  direction = 'forward',
  onClick,
}: {
  label: string;
  progress: { completedHoles: number; totalHoles: number };
  direction?: 'forward' | 'back';
  onClick: () => void;
}) {
  const isComplete = progress.totalHoles > 0 && progress.completedHoles >= progress.totalHoles;
  const arrow = direction === 'back' ? '←' : '→';

  return (
    <div className="border-t border-dashed border-[#27272A] bg-[#050506] px-3 py-4">
      <button
        type="button"
        onClick={onClick}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-4 py-3 font-data text-sm font-bold lowercase tracking-[0.14em] transition-colors ${
          isComplete
            ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950] hover:bg-[#082611]'
            : 'border-[#27272A] bg-[#0C0C0E] text-[#E6EDF3] hover:border-[#3FB950] hover:text-[#3FB950]'
        }`}
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <span className="font-data text-[10px] tracking-[0.16em] tabular-nums opacity-80">
            {progress.completedHoles}/{progress.totalHoles}
          </span>
          <span aria-hidden className="text-base">{arrow}</span>
        </span>
      </button>
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
      className={`min-h-11 rounded-md border px-3 py-2 text-xs font-bold tracking-[0.14em] ${
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
    createDrafts(holes, scoreByHole, tournament.id, segment.id)
  );
  const [savingHoles, setSavingHoles] = useState<Set<number>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [saveAllError, setSaveAllError] = useState<string | null>(null);
  const scoreLabels = getSegmentScoreLabels(segment, players);
  const cpiStatus = getSegmentCpiStatus(segment, players, tournament.cpi_threshold, scoreLabels);
  const matchStatus = calculateSegmentMatchPlayStatus(segment);
  const matchStatusLabel = formatMatchStatusLabel(matchStatus, scoreLabels);
  const currentHoleNumber = getCurrentHoleNumber(holes, scoreByHole);
  const visibleHoles = holes.filter(
    (holeNumber) =>
      holeNumber === currentHoleNumber || isPlayedScore(scoreByHole.get(holeNumber))
  );
  const dirtyHoles = visibleHoles.filter((holeNumber) =>
    isHoleDirty(drafts[holeNumber], scoreByHole.get(holeNumber))
  );
  const isSavingAny = savingHoles.size > 0;
  const activeHoleRef = useRef<HTMLDivElement | null>(null);
  const showJumpButton =
    currentHoleNumber !== null &&
    visibleHoles.length > 1 &&
    visibleHoles[0] !== currentHoleNumber;
  const jumpToCurrentHole = () => {
    activeHoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    track2026('score_jump_to_current_hole', { hole_number: currentHoleNumber });
  };

  useEffect(() => {
    setDrafts(createDrafts(holes, scoreByHole, tournament.id, segment.id));
  }, [holes.join(','), scoreByHole, segment.id, tournament.id]);

  const updateDraft = (holeNumber: number, nextDraft: HoleDraft) => {
    const rowKey = getScoreDraftKey(tournament.id, segment.id, holeNumber);
    const score = scoreByHole.get(holeNumber);

    if (isHoleDirty(nextDraft, score)) {
      writePersistedDraft(rowKey, nextDraft);
    } else {
      removePersistedDraft(rowKey);
    }

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
      removePersistedDraft(getScoreDraftKey(tournament.id, segment.id, holeNumber));
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
      let savedCount = 0;
      let firstError: string | null = null;

      for (const holeNumber of dirtyHoles) {
        const draft = drafts[holeNumber];

        if (!draft) continue;

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
          removePersistedDraft(getScoreDraftKey(tournament.id, segment.id, holeNumber));
          savedCount += 1;
        } catch (err) {
          const message = getErrorMessage(err);
          firstError = firstError ?? message;
          setRowErrors((current) => ({ ...current, [holeNumber]: message }));
        }
      }

      if (firstError) {
        setSaveAllError(firstError);
      } else {
        track2026('scores_bulk_saved', {
          segment_id: segment.id,
          hole_count: savedCount,
        });
      }

      if (savedCount > 0) {
        await onSaved();
      }
    } finally {
      setSavingHoles(new Set());
    }
  };

  return (
    <div className="border-t border-[#27272A] bg-[#050506]">
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-data text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
            {segment.name ?? formatSegmentKind(segment.kind)}
          </h4>
          <SegmentMatchupPlayers segment={segment} players={players} />
          <div className="mt-2 flex flex-wrap gap-2">
            <MatchStatusBadge status={matchStatus.state} label={matchStatusLabel} />
            <span className="border border-[#27272A] px-2 py-1 font-data text-[10px] tracking-[0.14em] text-[#8B949E]">
              {matchStatus.completedHoles}/{matchStatus.totalHoles} played
            </span>
          </div>
          {cpiStatus && (
            <p className="mt-1 font-data text-xs text-[#8B949E]">
              {cpiStatus}
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
              {isSavingAny ? 'Saving…' : `Save all (${dirtyHoles.length})`}
            </button>
          )}
          <span className="border border-[#27272A] px-3 py-1 font-data text-[10px] lowercase tracking-[0.18em] text-[#A1A1AA]">
            {currentHoleNumber ? `now hole ${currentHoleNumber}` : `holes ${segment.hole_start}-${segment.hole_end}`}
          </span>
        </div>
      </div>
      {saveAllError && <p className="px-3 pb-3 font-data text-xs text-[#F85149]">{saveAllError}</p>}
      {showJumpButton && (
        <div className="border-t border-dashed border-[#27272A] bg-[#050506] px-3 py-2">
          <button
            type="button"
            onClick={jumpToCurrentHole}
            className="flex min-h-9 w-full items-center justify-between gap-3 rounded-md border border-[#3FB950]/60 bg-[#06170B] px-3 py-2 font-data text-xs font-bold lowercase tracking-[0.14em] text-[#3FB950] hover:bg-[#082611]"
          >
            <span>jump to current hole</span>
            <span className="font-data tabular-nums">hole {currentHoleNumber} ↓</span>
          </button>
        </div>
      )}
      <div>
        {visibleHoles.map((holeNumber) => {
          const score = segment.holeScores.find((row) => row.hole_number === holeNumber) ?? null;
          const draft = drafts[holeNumber] ?? createDraft(score);
          const isDirty = dirtyHoles.includes(holeNumber);
          const isSaving = savingHoles.has(holeNumber);
          const rowError = rowErrors[holeNumber] ?? null;
          const courseHole = courseHoleLookup.get(holeNumber) ?? getDefaultCourseHole(holeNumber);
          const isActive = holeNumber === currentHoleNumber;
          const cpiDisplay = getHoleCpiDisplay(segment, players, tournament.cpi_threshold, scoreLabels, courseHole);

          return (
            <div
              key={holeNumber}
              ref={isActive ? activeHoleRef : undefined}
              className="scroll-mt-4"
            >
              <HoleScoreForm
                rowKey={getScoreDraftKey(tournament.id, segment.id, holeNumber)}
                holeNumber={holeNumber}
                courseHole={courseHole}
                score={score}
                draft={draft}
                saveState={getHoleSaveState({ draft, isDirty, isSaving, rowError })}
                error={rowError}
                scoreLabels={scoreLabels}
                cpiDisplay={cpiDisplay}
                lengthUnit={lengthUnit}
                canClear={false}
                onLengthUnitToggle={onLengthUnitToggle}
                onDraftChange={(nextDraft) => updateDraft(holeNumber, nextDraft)}
                onSave={() => saveHole(holeNumber)}
                onClear={() => Promise.resolve()}
              />
            </div>
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
  const currentHoleNumber = getCurrentGroupedHoleNumber(segments, holeNumbers);
  const visibleHoleNumbers = holeNumbers.filter(
    (holeNumber) =>
      holeNumber === currentHoleNumber ||
      segments.some((segment) =>
        isPlayedScore(segment.holeScores.find((score) => score.hole_number === holeNumber))
      )
  );
  const courseHoleLookup = useMemo(
    () => new Map(courseHoles.map((hole) => [hole.holeNumber, hole])),
    [courseHoles]
  );
  const activeHoleRef = useRef<HTMLDivElement | null>(null);
  const showJumpButton =
    currentHoleNumber !== null &&
    visibleHoleNumbers.length > 1 &&
    visibleHoleNumbers[0] !== currentHoleNumber;
  const jumpToCurrentHole = () => {
    activeHoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    track2026('score_jump_to_current_hole', { hole_number: currentHoleNumber });
  };

  return (
    <div className="border-t border-[#27272A] bg-[#050506]">
      <BackNineIndividualTotalsCard segments={segments} players={players} />
      <div className="border-t border-[#27272A] px-3 py-3">
        <p className="font-data text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
          Back 9 Singles
        </p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Enter both singles matches by hole, so the group can score the hole they are actually playing.
        </p>
        {currentHoleNumber && (
          <p className="mt-2 font-data text-[10px] lowercase tracking-[0.16em] text-[#8B949E]">
            now hole {currentHoleNumber}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {segments.map((segment) => (
            <SegmentStatusPill
              key={segment.id}
              tournament={tournament}
              segment={segment}
              players={players}
            />
          ))}
        </div>
      </div>
      {showJumpButton && (
        <div className="border-t border-dashed border-[#27272A] bg-[#050506] px-3 py-2">
          <button
            type="button"
            onClick={jumpToCurrentHole}
            className="flex min-h-9 w-full items-center justify-between gap-3 rounded-md border border-[#3FB950]/60 bg-[#06170B] px-3 py-2 font-data text-xs font-bold lowercase tracking-[0.14em] text-[#3FB950] hover:bg-[#082611]"
          >
            <span>jump to current hole</span>
            <span className="font-data tabular-nums">hole {currentHoleNumber} ↓</span>
          </button>
        </div>
      )}
      <div>
        {visibleHoleNumbers.map((holeNumber) => {
          const courseHole = courseHoleLookup.get(holeNumber) ?? getDefaultCourseHole(holeNumber);
          const isActive = holeNumber === currentHoleNumber;

          return (
            <div
              key={holeNumber}
              ref={isActive ? activeHoleRef : undefined}
              className={`border-t border-dashed bg-[#0C0C0E] scroll-mt-4 ${
                isActive ? 'border-[#3FB950]/40' : 'border-[#27272A]'
              }`}
            >
              {isActive ? (
                <>
                  <HoleHeaderTitle holeNumber={holeNumber} isActive />
                  <div className="border-t border-dashed border-[#27272A]" />
                  <HoleStatsRow
                    courseHole={courseHole}
                    lengthUnit={lengthUnit}
                    onLengthUnitToggle={onLengthUnitToggle}
                  />
                </>
              ) : (
                <HoleHeaderCompact
                  holeNumber={holeNumber}
                  courseHole={courseHole}
                  lengthUnit={lengthUnit}
                  onLengthUnitToggle={onLengthUnitToggle}
                />
              )}
              <div className="border-t border-dashed border-[#27272A]" />
              <div className="grid gap-2 px-2 py-2 sm:px-3 lg:grid-cols-2">
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
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
}) {
  const labels = getSegmentScoreLabels(segment, players);
  const status = calculateSegmentMatchPlayStatus(segment);
  const cpiStatus = getSegmentCpiStatus(segment, players, tournament.cpi_threshold, labels);

  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2">
      <p className="text-xs font-bold text-[#FAFAFA]">{segment.name ?? formatSegmentMatchup(segment, players)}</p>
      <p className="mt-1 text-[10px] tracking-[0.12em] text-[#8B949E]">
        {formatMatchStatusLabel(status, labels)}
      </p>
      {cpiStatus && (
        <p className="mt-1 text-[10px] text-[#8B949E]">
          {cpiStatus}
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
  const rowKey = getScoreDraftKey(tournament.id, segment.id, holeNumber);
  const [draft, setDraft] = useState<HoleDraft>(() => readPersistedDraft(rowKey) ?? createDraft(score));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scoreLabels = getSegmentScoreLabels(segment, players);
  const cpiDisplay = getHoleCpiDisplay(segment, players, tournament.cpi_threshold, scoreLabels, courseHole);
  const isDirty = isHoleDirty(draft, score);

  useEffect(() => {
    setDraft(readPersistedDraft(rowKey) ?? createDraft(score));
  }, [rowKey, score]);

  const updateDraft = (nextDraft: HoleDraft) => {
    if (isHoleDirty(nextDraft, score)) {
      writePersistedDraft(rowKey, nextDraft);
    } else {
      removePersistedDraft(rowKey);
    }

    setDraft(nextDraft);
    setError(null);
  };

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
      removePersistedDraft(rowKey);
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <HoleScoreForm
      rowKey={rowKey}
      holeNumber={holeNumber}
      courseHole={courseHole}
      score={score}
      draft={draft}
      saveState={getHoleSaveState({ draft, isDirty, isSaving, rowError: error })}
      error={error}
      scoreLabels={scoreLabels}
      cpiDisplay={cpiDisplay}
      showHoleMetadata={false}
      canClear={false}
      compact
      onDraftChange={updateDraft}
      onSave={saveHole}
      onClear={() => Promise.resolve()}
    />
  );
}

function HoleScoreForm({
  rowKey,
  holeNumber,
  courseHole,
  score,
  draft,
  saveState,
  error,
  scoreLabels,
  cpiDisplay,
  lengthUnit,
  showHoleMetadata = true,
  canClear,
  compact = false,
  onLengthUnitToggle,
  onDraftChange,
  onSave,
  onClear,
}: {
  rowKey: string;
  holeNumber: number;
  courseHole: CourseHoleMetadata;
  score: HoleScoreView | null;
  draft: HoleDraft;
  saveState: HoleSaveState;
  error: string | null;
  scoreLabels: ScoreLabels;
  cpiDisplay?: HoleCpiDisplay | null;
  lengthUnit?: LengthUnit;
  showHoleMetadata?: boolean;
  canClear: boolean;
  compact?: boolean;
  onLengthUnitToggle?: () => void;
  onDraftChange: (draft: HoleDraft) => void;
  onSave: () => void;
  onClear: () => Promise<void>;
}) {
  const isDirty = saveState === 'dirty' || saveState === 'incomplete';
  const [isEditingSaved, setIsEditingSaved] = useState(false);
  const syncContext = useContext(ScoreSyncContext);
  const retryRef = useRef(onSave);
  const borderClass =
    saveState === 'error' ? 'border-[#F85149]' : isDirty ? 'border-[#F59E0B]' : 'border-[#27272A]';
  const draftPreview = getDraftCpiPreview(draft, scoreLabels, cpiDisplay);
  const usaSubtitle = joinSubtitle(scoreLabels.usaSubtitle, formatStrokeSubtitle(cpiDisplay?.usaStrokes));
  const europeSubtitle = joinSubtitle(scoreLabels.europeSubtitle, formatStrokeSubtitle(cpiDisplay?.europeStrokes));

  useEffect(() => {
    retryRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!syncContext) {
      return undefined;
    }

    syncContext.registerRow(rowKey, {
      state: saveState,
      error,
      retry: () => retryRef.current(),
    });

    return () => syncContext.unregisterRow(rowKey);
  }, [error, rowKey, saveState, syncContext]);

  useEffect(() => {
    setIsEditingSaved(false);
  }, [score?.updated_at]);

  useEffect(() => {
    if (saveState !== 'dirty' || (score && !isEditingSaved)) return undefined;

    const timer = window.setTimeout(() => {
      onSave();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [draft.europeScore, draft.usaScore, isEditingSaved, onSave, saveState, score]);

  const cancelEdit = useCallback(() => {
    if (score) {
      onDraftChange(createDraft(score));
    }
    setIsEditingSaved(false);
    track2026('score_saved_row_edit_cancelled', { hole_number: holeNumber });
  }, [holeNumber, onDraftChange, score]);

  useEffect(() => {
    if (!isEditingSaved) return undefined;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelEdit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelEdit, isEditingSaved]);

  if (score && saveState === 'saved' && !isEditingSaved) {
    return (
      <div className={`border-t border-dashed bg-[#101012] px-3 py-2 transition-colors ${borderClass}`}>
        {!compact && (
          <p className="text-[11px] font-bold lowercase tracking-[0.14em] text-[#8B949E]">
            hole {holeNumber}
          </p>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-sm font-bold tabular-nums text-[#FAFAFA]">
            <span>{scoreLabels.usa}</span> <span>{score.usa_score ?? '--'}</span>
            <span className="text-[#484F58]"> — </span>
            <span>{scoreLabels.europe}</span> <span>{score.europe_score ?? '--'}</span>
          </p>
          <div className="flex shrink-0 gap-1.5 font-data text-[10px] lowercase tracking-[0.12em]">
            <button
              type="button"
              onClick={() => {
                setIsEditingSaved(true);
                track2026('score_saved_row_edit_started', { hole_number: holeNumber });
              }}
              className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1 font-bold text-[#E6EDF3] hover:border-[#3FB950] hover:text-[#3FB950]"
            >
              edit
            </button>
            {canClear && (
              <button
                type="button"
                onClick={() => {
                  void onClear();
                }}
                className="rounded border border-[#F85149] bg-[#0C0C0E] px-2 py-1 font-bold text-[#F85149]"
              >
                clear
              </button>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-data text-[10px] lowercase tracking-[0.12em] text-[#A1A1AA]">
          <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1 text-[#E6EDF3]">
            {formatOutcome(score.outcome, scoreLabels)}
          </span>
          {score.cpi_applied && <CpiScoreChip score={score} scoreLabels={scoreLabels} />}
          <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
            saved {formatAuditTime(score.updated_at)}
          </span>
          {score.updatedByProfile && (
            <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
              by {score.updatedByProfile.display_name}
            </span>
          )}
        </div>
      </div>
    );
  }

  const saveControls = (
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
          className="min-h-11 rounded-md border border-[#F59E0B] px-3 py-2 font-data text-xs font-bold text-[#F59E0B] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {saveState === 'error' ? 'Retry' : saveState === 'incomplete' ? 'Add both' : 'Save now'}
        </button>
      )}
      {score && isEditingSaved && (
        <button
          type="button"
          onClick={cancelEdit}
          className="min-h-11 rounded-md border border-[#27272A] px-3 py-2 font-data text-xs font-bold lowercase tracking-[0.14em] text-[#A1A1AA] hover:border-[#FAFAFA] hover:text-[#FAFAFA]"
        >
          cancel
        </button>
      )}
      {canClear && (
        <button
          type="button"
          onClick={() => {
            void onClear();
          }}
          className="min-h-11 rounded-md border border-[#F85149] px-3 py-2 font-data text-xs font-bold text-[#F85149]"
        >
          Clear
        </button>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className={`border-t border-dashed bg-[#101012] px-3 py-3 transition-colors ${borderClass}`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem] lg:items-end">
          <ScorePicker
            label={scoreLabels.usa}
            subtitle={usaSubtitle}
            value={draft.usaScore}
            onChange={(usaScore) => onDraftChange({ ...draft, usaScore })}
          />
          <ScorePicker
            label={scoreLabels.europe}
            subtitle={europeSubtitle}
            value={draft.europeScore}
            onChange={(europeScore) => onDraftChange({ ...draft, europeScore })}
          />
          {saveControls}
        </div>
        {cpiDisplay && <CpiHoleNotice display={cpiDisplay} />}
        {draftPreview && <p className="mt-2 font-data text-[10px] tracking-[0.12em] text-[#F59E0B]">{draftPreview}</p>}
        {score && <ScoreOutcomeChips score={score} scoreLabels={scoreLabels} />}
        {error && <p className="mt-2 font-data text-xs text-[#F85149]">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`border-t border-dashed bg-[#101012] transition-colors ${borderClass}`}>
      <HoleHeaderTitle holeNumber={holeNumber} isActive />
      {showHoleMetadata && lengthUnit && onLengthUnitToggle && (
        <>
          <div className="border-t border-dashed border-[#27272A]" />
          <HoleStatsRow
            courseHole={courseHole}
            lengthUnit={lengthUnit}
            onLengthUnitToggle={onLengthUnitToggle}
          />
          {cpiDisplay && <CpiHoleNotice display={cpiDisplay} />}
        </>
      )}
      <div className="border-t border-dashed border-[#27272A]" />
      <div className="px-3 py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem] lg:items-end">
          <ScorePicker
            label={scoreLabels.usa}
            subtitle={usaSubtitle}
            value={draft.usaScore}
            onChange={(usaScore) => onDraftChange({ ...draft, usaScore })}
          />
          <ScorePicker
            label={scoreLabels.europe}
            subtitle={europeSubtitle}
            value={draft.europeScore}
            onChange={(europeScore) => onDraftChange({ ...draft, europeScore })}
          />
          {saveControls}
        </div>
        {draftPreview && <p className="mt-2 font-data text-[10px] tracking-[0.12em] text-[#F59E0B]">{draftPreview}</p>}
        {score && <ScoreOutcomeChips score={score} scoreLabels={scoreLabels} />}
        {error && <p className="mt-2 font-data text-xs text-[#F85149]">{error}</p>}
      </div>
    </div>
  );
}

function ScoreOutcomeChips({
  score,
  scoreLabels,
}: {
  score: HoleScoreView;
  scoreLabels: ScoreLabels;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 font-data text-[10px] tracking-[0.12em] text-[#A1A1AA]">
      <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
        {formatOutcome(score.outcome, scoreLabels)}
      </span>
      {score.cpi_applied && <CpiScoreChip score={score} scoreLabels={scoreLabels} />}
      <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
        Saved {formatAuditTime(score.updated_at)}
      </span>
      {score.updatedByProfile && (
        <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1">
          By {score.updatedByProfile.display_name}
        </span>
      )}
    </div>
  );
}

function CpiHoleNotice({ display }: { display: HoleCpiDisplay }) {
  return (
    <p className="border-t border-dashed border-[#27272A] px-3 py-2 font-data text-[10px] tracking-[0.12em] text-[#F59E0B]">
      {display.summary}
    </p>
  );
}

function CpiScoreChip({
  score,
  scoreLabels,
}: {
  score: HoleScoreView;
  scoreLabels: ScoreLabels;
}) {
  const recipient =
    score.cpi_strokes_usa > 0
      ? { name: scoreLabels.usa, strokes: score.cpi_strokes_usa }
      : { name: scoreLabels.europe, strokes: score.cpi_strokes_europe };

  return (
    <span className="rounded border border-[#F59E0B]/50 bg-[#0C0C0E] px-2 py-1 text-[#F59E0B]">
      CPI: {recipient.name} receives {formatStrokeCount(recipient.strokes)} · net {scoreLabels.usa}{' '}
      {score.usa_net_score ?? '-'} - {scoreLabels.europe} {score.europe_net_score ?? '-'}
    </span>
  );
}

function HoleHeaderTitle({
  holeNumber,
  isActive,
}: {
  holeNumber: number;
  isActive: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-3 pb-4 pt-5">
      <div
        className={`font-data font-bold lowercase tabular-nums tracking-[-0.08em] text-[#FAFAFA] ${
          isActive ? 'text-4xl lg:text-5xl' : 'text-2xl'
        }`}
      >
        hole {holeNumber}
      </div>
      {isActive && (
        <span className="border border-[#3FB950]/60 bg-[#06170B] px-2 py-1 font-data text-[10px] lowercase tracking-[0.16em] text-[#3FB950]">
          now playing
        </span>
      )}
    </div>
  );
}

function HoleHeaderCompact({
  holeNumber,
  courseHole,
  lengthUnit,
  onLengthUnitToggle,
}: {
  holeNumber: number;
  courseHole: CourseHoleMetadata;
  lengthUnit: LengthUnit;
  onLengthUnitToggle: () => void;
}) {
  const sep = <span className="text-[#3F3F46]">·</span>;

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 font-data text-[11px] lowercase tracking-[0.12em] text-[#8B949E]">
      <span className="text-base font-bold tabular-nums tracking-[-0.03em] text-[#FAFAFA]">
        hole {holeNumber}
      </span>
      {sep}
      {courseHole.yardage ? (
        <button
          type="button"
          onClick={onLengthUnitToggle}
          aria-label={`Show lengths in ${lengthUnit === 'metres' ? 'yards' : 'metres'}`}
          className="underline decoration-dotted underline-offset-2 hover:text-[#FAFAFA] focus:text-[#3FB950] focus:outline-none"
        >
          <span className="font-bold tabular-nums text-[#FAFAFA]">
            {formatLengthValue(courseHole.yardage, lengthUnit)}
          </span>
        </button>
      ) : (
        <span>length --</span>
      )}
      {sep}
      <span>
        par <span className="font-bold tabular-nums text-[#FAFAFA]">{courseHole.par ?? '--'}</span>
      </span>
      {sep}
      <span>
        index <span className="font-bold tabular-nums text-[#FAFAFA]">{courseHole.strokeIndex}</span>
      </span>
    </div>
  );
}

function HoleStatsRow({
  courseHole,
  lengthUnit,
  onLengthUnitToggle,
}: {
  courseHole: CourseHoleMetadata;
  lengthUnit: LengthUnit;
  onLengthUnitToggle: () => void;
}) {
  return (
    <dl className="grid grid-cols-3">
      <div className="px-3 py-3">
        <dt className="font-data text-[10px] lowercase tracking-[0.18em] text-[#8B949E]">length</dt>
        <dd className="mt-1">
          {courseHole.yardage ? (
            <button
              type="button"
              onClick={onLengthUnitToggle}
              aria-label={`Show lengths in ${lengthUnit === 'metres' ? 'yards' : 'metres'}`}
              className="-mx-1 rounded px-1 font-data text-2xl font-bold tabular-nums text-[#FAFAFA] underline decoration-dotted underline-offset-4 hover:text-[#3FB950] focus:outline-none focus:ring-1 focus:ring-[#3FB950]"
            >
              {formatLengthValue(courseHole.yardage, lengthUnit)}
            </button>
          ) : (
            <span className="font-data text-2xl font-bold tabular-nums text-[#484F58]">--</span>
          )}
        </dd>
      </div>
      <div className="border-l border-dashed border-[#27272A] px-3 py-3">
        <dt className="font-data text-[10px] lowercase tracking-[0.18em] text-[#8B949E]">par</dt>
        <dd className="mt-1 font-data text-2xl font-bold tabular-nums text-[#FAFAFA]">
          {courseHole.par ?? '--'}
        </dd>
      </div>
      <div className="border-l border-dashed border-[#27272A] px-3 py-3">
        <dt className="font-data text-[10px] lowercase tracking-[0.18em] text-[#8B949E]">index</dt>
        <dd className="mt-1 font-data text-2xl font-bold tabular-nums text-[#FAFAFA]">
          {courseHole.strokeIndex}
        </dd>
      </div>
    </dl>
  );
}

function SyncBadge({ label, tone }: { label: string; tone: 'saved' | 'pending' }) {
  const className =
    tone === 'saved'
      ? 'border-[#27272A] text-[#484F58]'
      : 'border-[#F59E0B] bg-[#1C1406] text-[#F59E0B]';

  return (
    <div
      className={`border px-3 py-2 text-center font-data text-[10px] font-bold tracking-[0.14em] sm:rounded-md ${className}`}
    >
      {label}
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
    <span className={`border px-2 py-1 font-data text-[10px] tracking-[0.14em] ${className}`}>
      {label}
    </span>
  );
}

function getSegmentScoreLabels(segment: SegmentView, players: PlayerRow[]): ScoreLabels {
  if (segment.kind !== 'singles') {
    const playerLookup = new Map(players.map((player) => [player.id, player]));
    const usaNames = segment.players
      .filter((entry) => entry.team === 'USA')
      .map((entry) => entry.player?.name ?? playerLookup.get(entry.player_id)?.name)
      .filter((name): name is string => Boolean(name));
    const europeNames = segment.players
      .filter((entry) => entry.team === 'EUROPE')
      .map((entry) => entry.player?.name ?? playerLookup.get(entry.player_id)?.name)
      .filter((name): name is string => Boolean(name));

    return {
      usa: 'USA',
      europe: 'Europe',
      usaSubtitle: usaNames.length > 0 ? usaNames.join(' + ') : undefined,
      europeSubtitle: europeNames.length > 0 ? europeNames.join(' + ') : undefined,
    };
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
        .filter(isPlayedScore)
        .map((score) => score.hole_number)
    );

    return createHoleRange(segment.hole_start, segment.hole_end).some(
      (holeNumber) => !scoredHoles.has(holeNumber)
    );
  });
}

function getCurrentHoleNumber(holes: number[], scoreByHole: Map<number, HoleScoreView>): number | null {
  return holes.find((holeNumber) => !isPlayedScore(scoreByHole.get(holeNumber))) ?? getLastHoleNumber(holes);
}

function getCurrentGroupedHoleNumber(segments: SegmentView[], holeNumbers: number[]): number | null {
  return (
    holeNumbers.find((holeNumber) =>
      segments.some((segment) => !isPlayedScore(segment.holeScores.find((score) => score.hole_number === holeNumber)))
    ) ??
    getLastHoleNumber(holeNumbers)
  );
}

function getLastHoleNumber(holeNumbers: number[]): number | null {
  return holeNumbers.length > 0 ? holeNumbers[holeNumbers.length - 1] : null;
}

function isPlayedScore(score: HoleScoreView | null | undefined): boolean {
  return Boolean(score && score.outcome !== 'unplayed');
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

function formatLengthValue(yardage: number, unit: LengthUnit): string {
  if (unit === 'yards') {
    return `${yardage} yds`;
  }

  return `${Math.round(yardage * 0.9144)} m`;
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
  await withTimeout(
    saveHoleScore2026({
      tournament,
      segment,
      players,
      holeNumber,
      strokeIndex: courseHole.strokeIndex,
      usaScore: parseOptionalPositiveInteger(draft.usaScore),
      europeScore: parseOptionalPositiveInteger(draft.europeScore),
      updatedBy: profile.id,
    }),
    SCORE_SAVE_TIMEOUT_MS,
    'Score save is taking too long. Check your connection and retry.'
  );
}

function createDrafts(
  holes: number[],
  scoreByHole: Map<number, HoleScoreView>,
  tournamentId: string,
  segmentId: string
): Record<number, HoleDraft> {
  return Object.fromEntries(
    holes.map((holeNumber) => [
      holeNumber,
      readPersistedDraft(getScoreDraftKey(tournamentId, segmentId, holeNumber)) ??
        createDraft(scoreByHole.get(holeNumber)),
    ])
  );
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

function getScoreDraftKey(tournamentId: string, segmentId: string, holeNumber: number): string {
  return `${SCORE_DRAFT_STORAGE_PREFIX}${tournamentId}:${segmentId}:${holeNumber}`;
}

function readPersistedDraft(rowKey: string): HoleDraft | null {
  try {
    const stored = window.localStorage.getItem(rowKey);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<HoleDraft>;

    if (typeof parsed.usaScore !== 'string' || typeof parsed.europeScore !== 'string') {
      return null;
    }

    return {
      usaScore: parsed.usaScore,
      europeScore: parsed.europeScore,
    };
  } catch {
    return null;
  }
}

function writePersistedDraft(rowKey: string, draft: HoleDraft): void {
  try {
    window.localStorage.setItem(rowKey, JSON.stringify(draft));
  } catch {
    // Storage can fail in private mode; the visible row state still protects the user.
  }
}

function removePersistedDraft(rowKey: string): void {
  try {
    window.localStorage.removeItem(rowKey);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  });
}

function formatAuditTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getHoleCpiDisplay(
  segment: SegmentView,
  players: PlayerRow[],
  threshold: number,
  labels: ScoreLabels,
  courseHole: CourseHoleMetadata
): HoleCpiDisplay | null {
  if (segment.kind !== 'singles' || !segment.cpi_enabled) {
    return null;
  }

  const cpi = getSegmentHoleCpi(segment, players, threshold, courseHole.strokeIndex);

  if (!cpi.applies || !cpi.higherCpiTeam) {
    return null;
  }

  const recipient = cpi.higherCpiTeam === 'USA' ? labels.usa : labels.europe;
  const strokes = cpi.strokes[cpi.higherCpiTeam];

  return {
    summary: `${recipient} receives ${formatStrokeCount(strokes)} on this hole (stroke index ${courseHole.strokeIndex}).`,
    usaStrokes: cpi.strokes.USA,
    europeStrokes: cpi.strokes.EUROPE,
  };
}

function getSegmentHoleCpi(
  segment: SegmentView,
  players: PlayerRow[],
  threshold: number,
  strokeIndex: number
): CpiStrokes {
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const usaPlayer = segment.usa_player_id ? playerLookup.get(segment.usa_player_id) : undefined;
  const europePlayer = segment.europe_player_id ? playerLookup.get(segment.europe_player_id) : undefined;

  return calculateCpiStrokesForHole(
    {
      usaCpi: usaPlayer?.current_cpi,
      europeCpi: europePlayer?.current_cpi,
      threshold,
    },
    strokeIndex
  );
}

function getDraftCpiPreview(
  draft: HoleDraft,
  labels: ScoreLabels,
  cpiDisplay: HoleCpiDisplay | null | undefined
): string | null {
  if (!cpiDisplay) {
    return null;
  }

  const usaScore = parseOptionalPositiveInteger(draft.usaScore);
  const europeScore = parseOptionalPositiveInteger(draft.europeScore);

  if (usaScore === null || europeScore === null) {
    return null;
  }

  const usaNet = usaScore - cpiDisplay.usaStrokes;
  const europeNet = europeScore - cpiDisplay.europeStrokes;
  const outcome = usaNet === europeNet ? 'halved' : usaNet < europeNet ? 'USA' : 'EUROPE';

  return `gross ${usaScore}-${europeScore} · net ${usaNet}-${europeNet} · ${formatOutcome(outcome, labels)}`;
}

function joinSubtitle(...parts: Array<string | null | undefined>): string | undefined {
  const present = parts.filter((part): part is string => Boolean(part));

  return present.length > 0 ? present.join(' · ') : undefined;
}

function formatStrokeSubtitle(strokes: number | null | undefined): string | undefined {
  return strokes && strokes > 0 ? `receives ${formatStrokeCount(strokes)}` : undefined;
}

function formatStrokeCount(strokes: number): string {
  return `${strokes} shot${strokes === 1 ? '' : 's'}`;
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

  const matchupCpiStatus = formatMatchupCpiStatus(
    labels,
    usaPlayer?.current_cpi ?? null,
    europePlayer?.current_cpi ?? null,
    cpi.difference
  );

  if (!cpi.applies) {
    return `CPI enabled. ${matchupCpiStatus} Threshold ${threshold}.`;
  }

  return `CPI enabled. ${matchupCpiStatus}`;
}

function formatMatchupCpiStatus(
  labels: ScoreLabels,
  usaCpi: number | null,
  europeCpi: number | null,
  difference: number
): string {
  return `${labels.usa} HCP ${formatHandicap(usaCpi)}; ${labels.europe} HCP ${formatHandicap(europeCpi)}. Gap ${difference}.`;
}

function formatHandicap(value: number | null): string {
  return value === null ? '-' : value.toString();
}
