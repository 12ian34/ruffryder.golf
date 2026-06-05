import { FormEvent, type MouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { CourseHoleMetadata } from '../../../domain/2026/course';
import {
  clearFixtureScores2026,
  completeTournament2026,
  createCustomFixture2026,
  createPlayer2026,
  createPlayerTournamentStat2026,
  createTournament2026,
  deletePlayerTournamentStat2026,
  deleteFixture2026,
  fetchAuditLogExport2026,
  reopenTournament2026,
  setTournamentActive2026,
  updateCourseHole2026,
  updateFixture2026,
  updatePlayer2026,
  updatePlayerTournamentStat2026,
  updateSegmentCpiEnabled,
  updateSegment2026,
  updateTournament2026,
  type AuditLogRow,
  type FixtureTemplate,
  type FixtureView,
  type PlayerRow,
  type PlayerTournamentStatsRow,
  type ProfileRow,
  type Team,
  type Tournament2026Data,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
import { downloadAuditLogCsv } from '../auditExport';
import { downloadPlayerHistoryCsv } from '../playerHistoryExport';
import { formatPlayerTier, getErrorMessage, normalizePlayerTier, type PlayerTier } from '../viewUtils';
import { FixtureTitleTrigger } from './FixtureDetailsPopover';
import { PlayerSelect, SubmitButton, TextField } from './FormControls';
import { SetupForm, StatusCard, TerminalPageSection } from './Layout';
import { PlayerHistoryTrigger, PlayerIdentity } from './PlayerHistory';
import { ProfileLinkRow } from './ProfileSection';

export function AdminSetupSection({
  data,
  onSaved,
}: {
  data: Tournament2026Data;
  onSaved: () => Promise<void>;
}) {
  if (!data.profile?.is_admin) {
    return null;
  }

  return (
    <TerminalPageSection
      title="admin"
      titleId="admin-title"
      eyebrow="tournament operations"
      description="work top-to-bottom: create or edit the tournament, keep players tidy, build fixtures, then correct fixture setup when needed."
      actions={
        <span className="border border-[#27272A] bg-[#09090B] px-3 py-2 text-[10px] tracking-[0.16em] text-[#3FB950]">
          operations
        </span>
      }
    >
      <div>
        <AdminTaskSection
          title="Tournament"
          description="Create the active event, edit CPI settings, and finalize or reopen when scoring is done."
        >
          <TournamentCorrections
            tournament={data.activeTournament}
            fixtures={data.fixtures}
            players={data.players}
            profileId={data.profile.id}
            onSaved={onSaved}
          />
          <TournamentList tournaments={data.tournaments} onSaved={onSaved} />
          <div className="border-t border-[#27272A] px-3 py-3 sm:px-4">
            <CreateTournamentButton onSaved={onSaved} />
          </div>
          <FinalizationPanel
            tournament={data.activeTournament}
            fixtures={data.fixtures}
            players={data.players}
            onSaved={onSaved}
          />
        </AdminTaskSection>
        <AdminTaskSection
          title="Players"
          description="Create players, correct player details, and link signed-in profiles to players."
        >
          <PlayerCorrections
            players={data.players}
            profiles={data.profiles}
            playerStats={data.playerStats}
            tournaments={data.tournaments}
            onSaved={onSaved}
          />
        </AdminTaskSection>
        <AdminTaskSection
          title="Fixtures"
          description="Create scoring groups, correct fixture setup, clear accidental scores, or update segment CPI."
        >
          <FixtureSetupPanel
            tournament={data.activeTournament}
            players={data.players}
            fixtures={data.fixtures}
            fixtureCount={data.fixtures.length}
            profileId={data.profile.id}
            onSaved={onSaved}
          />
          <div className="mt-4">
            <FixtureCorrections
              tournament={data.activeTournament}
              fixtures={data.fixtures}
              players={data.players}
              profileId={data.profile.id}
              onSaved={onSaved}
            />
          </div>
        </AdminTaskSection>
        <AdminTaskSection
          title="Course"
          description="Maintain hole par and yardage metadata used by score entry."
        >
          <CourseMetadataCorrections courseHoles={data.courseHoles} onSaved={onSaved} />
        </AdminTaskSection>
        <AdminTaskSection
          title="Activity"
          description="Recent admin activity for score entry, setup, profile, course, and finalization changes."
        >
          <AuditLogPanel auditLogs={data.auditLogs} players={data.players} />
        </AdminTaskSection>
      </div>
    </TerminalPageSection>
  );
}

function AuditLogPanel({ auditLogs, players }: { auditLogs: AuditLogRow[]; players: PlayerRow[] }) {
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    setExportedCount(null);
    track2026('audit_log_export_started', { source: 'admin_activity' });

    try {
      const rows = await fetchAuditLogExport2026();
      downloadAuditLogCsv(rows);
      setExportedCount(rows.length);
      track2026('audit_log_export_completed', {
        source: 'admin_activity',
        row_count: rows.length,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      setExportError(message);
      track2026('audit_log_export_failed', {
        source: 'admin_activity',
        error: message,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 border border-[#27272A] bg-[#09090B] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-data text-sm font-bold tracking-[0.12em] text-[#FAFAFA]">Audit export</p>
          <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
            Showing latest {auditLogs.length} rows. Export downloads every audit row your admin account can read.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isExporting}
          className="min-h-11 rounded-md border border-[#3FB950]/70 px-3 py-2 font-data text-sm font-bold text-[#3FB950] disabled:opacity-60"
        >
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
      {exportError ? <StatusCard tone="error">Audit export failed: {exportError}</StatusCard> : null}
      {exportedCount !== null ? (
        <StatusCard tone="success">Exported {exportedCount} audit rows as CSV.</StatusCard>
      ) : null}
      {auditLogs.length === 0 ? (
        <StatusCard tone="warning">
          No admin activity yet. New score and setup changes will appear here once activity logging is available.
        </StatusCard>
      ) : (
        <div className="grid gap-2">
          {auditLogs.map((log) => {
            const actorPlayer = log.actor_player_id ? playersById.get(log.actor_player_id) : null;
            const targetPlayer = log.player_id ? playersById.get(log.player_id) : null;
            const actorLabel = actorPlayer?.name ?? log.actor_display_name ?? 'Unknown user';
            const changedFields = formatChangedFields(log.changed_fields);

            return (
              <article key={log.id} className="border border-[#27272A] bg-[#09090B] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-data text-sm font-bold tracking-[0.12em] text-[#FAFAFA]">
                      {formatAuditAction(log.action)} {formatAuditTable(log.table_name)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
                      {actorLabel}
                      {log.actor_is_admin ? ' · admin' : ''}
                      {targetPlayer ? ` · target ${targetPlayer.name}` : ''}
                    </p>
                  </div>
                  <time className="font-data text-[10px] tracking-[0.16em] text-[#8B949E]">
                    {formatAuditTime(log.created_at)}
                  </time>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] tracking-[0.14em] text-[#8B949E]">
                  <span className="border border-[#27272A] px-2 py-1">Record {shortId(log.record_id)}</span>
                  {log.tournament_id ? (
                    <span className="border border-[#27272A] px-2 py-1">
                      Tournament {shortId(log.tournament_id)}
                    </span>
                  ) : null}
                  {log.fixture_id ? (
                    <span className="border border-[#27272A] px-2 py-1">Fixture {shortId(log.fixture_id)}</span>
                  ) : null}
                  {log.segment_id ? (
                    <span className="border border-[#27272A] px-2 py-1">Segment {shortId(log.segment_id)}</span>
                  ) : null}
                </div>
                {changedFields ? <p className="mt-2 text-xs text-[#A1A1AA]">Changed: {changedFields}</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminTaskSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLDetailsElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  function handleReturnToSectionStart(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

    sectionRef.current?.scrollIntoView?.({
      block: 'start',
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <details
      ref={sectionRef}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group scroll-mt-2 border-b border-[#27272A] bg-transparent"
    >
      <summary className="sticky top-0 z-20 cursor-pointer list-none bg-[#050506]/95 px-3 py-2.5 backdrop-blur transition hover:bg-[#0C0C0E] focus:outline-none focus-visible:bg-[#0C0C0E] sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          {isOpen ? (
            <button
              type="button"
              onClick={handleReturnToSectionStart}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left text-[#FAFAFA] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950]"
              aria-label={`Return to ${title} section start`}
            >
              <span className="min-w-0 truncate text-base font-bold tracking-[-0.03em] sm:text-lg">{title}</span>
              <span className="shrink-0 border border-[#27272A] px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#8B949E]">
                Top
              </span>
            </button>
          ) : (
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-[-0.03em] text-[#FAFAFA] sm:text-lg">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#8B949E] sm:text-sm">{description}</p>
            </div>
          )}
          <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold tracking-[0.16em] text-[#3FB950]">
            <span className="group-open:hidden">Open</span>
            <span className="hidden group-open:inline">Hide</span>
            <span className="inline-block transition group-open:rotate-90">&gt;</span>
          </span>
        </div>
      </summary>
      <div className="border-t border-[#27272A] px-3 py-3 sm:px-4">{children}</div>
    </details>
  );
}

function AdminActionDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      onClose();
    };

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70 px-3 py-4 sm:items-center sm:justify-center"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#27272A] bg-[#09090B] shadow-[0_18px_42px_rgba(0,0,0,0.42)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#27272A] px-3 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#3FB950]">Admin action</p>
            <h3 className="mt-1 text-xl font-bold tracking-[-0.04em] text-[#FAFAFA]">{title}</h3>
            {description ? <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-[#27272A] px-3 py-2 text-xs text-[#A1A1AA] hover:border-[#3FB950] hover:text-[#FAFAFA]"
          >
            Close
          </button>
        </div>
        <div className="p-3">{children(onClose)}</div>
      </div>
    </div>
  );
}

function AdminActionPopover({
  buttonLabel,
  title,
  description,
  disabled = false,
  children,
}: {
  buttonLabel: string;
  title: string;
  description?: string;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#3FB950] hover:bg-[#06170B] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58] disabled:hover:bg-transparent"
      >
        {buttonLabel}
      </button>
      <AdminActionDialog isOpen={isOpen} onClose={close} title={title} description={description}>
        {children}
      </AdminActionDialog>
    </>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'error' | 'muted';
  children: ReactNode;
}) {
  const className = {
    success: 'border-[#3FB950] text-[#3FB950]',
    warning: 'border-[#F59E0B] text-[#F59E0B]',
    error: 'border-[#F85149] text-[#F85149]',
    muted: 'border-[#27272A] text-[#8B949E]',
  }[tone];

  return (
    <span className={`rounded border px-2 py-1 text-[10px] font-bold tracking-[0.14em] ${className}`}>
      {children}
    </span>
  );
}

function AdminTextInput({
  label,
  value,
  onChange,
  type = 'text',
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block font-data text-xs tracking-[0.14em] text-[#8B949E]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        className="mt-1 w-full rounded-md border border-[#27272A] bg-[#050506] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
      />
    </label>
  );
}

function TournamentSelect({
  label,
  value,
  tournaments,
  onChange,
}: {
  label: string;
  value: string;
  tournaments: TournamentRow[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block font-data text-xs tracking-[0.14em] text-[#8B949E]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#27272A] bg-[#050506] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
      >
        <option value="">No linked tournament</option>
        {tournaments.map((tournament) => (
          <option key={tournament.id} value={tournament.id}>
            {tournament.year} · {tournament.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatAuditAction(action: string): string {
  switch (action) {
    case 'insert':
      return 'Created';
    case 'update':
      return 'Updated';
    case 'delete':
      return 'Deleted';
    default:
      return action;
  }
}

function formatAuditTable(tableName: string): string {
  return tableName.replace(/_/g, ' ');
}

function formatAuditTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCompactDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatChangedFields(fields: string[] | null): string | null {
  if (!fields?.length) {
    return null;
  }

  return fields.map((field) => field.replace(/_/g, ' ')).join(', ');
}

function shortId(value: string): string {
  return value.length <= 8 ? value : value.slice(0, 8);
}

function parseOptionalNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function toDateInputValue(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function toCompletedAtIso(value: string): string {
  return `${value}T12:00:00.000Z`;
}

function CreateTournamentButton({ onSaved }: { onSaved: () => Promise<void> }) {
  return (
    <AdminActionPopover
      buttonLabel="Create tournament"
      title="Create tournament"
      description="Add a new active event after reviewing the current activation list."
    >
      {(close) => <TournamentForm onSaved={onSaved} onComplete={close} />}
    </AdminActionPopover>
  );
}

function TournamentForm({
  onSaved,
  onComplete,
}: {
  onSaved: () => Promise<void>;
  onComplete?: () => void;
}) {
  const [name, setName] = useState('Ruff Ryders Cup 2026');
  const [year, setYear] = useState('2026');
  const [threshold, setThreshold] = useState('7');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await createTournament2026({
        name,
        year: Number(year),
        cpiThreshold: Number(threshold),
        isActive: true,
      });
      track2026('tournament_created', { year: Number(year) });
      await onSaved();
      onComplete?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SetupForm title="Create tournament" onSubmit={handleSubmit} error={error}>
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Year" value={year} onChange={setYear} type="number" />
      <TextField label="CPI threshold" value={threshold} onChange={setThreshold} type="number" />
      <SubmitButton isSaving={isSaving}>Create tournament</SubmitButton>
    </SetupForm>
  );
}

function TournamentList({
  tournaments,
  onSaved,
}: {
  tournaments: TournamentRow[];
  onSaved: () => Promise<void>;
}) {
  if (tournaments.length === 0) {
    return (
      <div className="mt-4 border-y border-[#27272A] bg-[#050506] px-3 py-3 sm:rounded-md sm:border">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Active tournaments</p>
        <p className="mt-2 text-sm text-[#8B949E]">No tournaments have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-y border-[#27272A] bg-[#050506] sm:rounded-md sm:border">
      <div className="px-3 py-3">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Active tournaments</p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Activate the event players should see, or leave all events inactive during setup.
        </p>
      </div>
      <div>
        {tournaments.map((tournament) => (
          <TournamentListRow key={tournament.id} tournament={tournament} onSaved={onSaved} />
        ))}
      </div>
    </div>
  );
}

function TournamentListRow({
  tournament,
  onSaved,
}: {
  tournament: TournamentRow;
  onSaved: () => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextActiveState = !tournament.is_active;

  const updateActiveState = async () => {
    if (!nextActiveState) {
      const confirmed = window.confirm(
        `Deactivate "${tournament.name}"? Players will see no active event until another tournament is activated.`
      );

      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      await setTournamentActive2026({
        tournamentId: tournament.id,
        isActive: nextActiveState,
      });
      track2026('tournament_active_state_updated', {
        tournament_id: tournament.id,
        is_active: nextActiveState,
      });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-3 py-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
              {tournament.name}
            </p>
            <StatusPill tone={tournament.is_active ? 'success' : 'muted'}>
              {tournament.is_active ? 'Active' : 'Inactive'}
            </StatusPill>
            {tournament.is_complete ? <StatusPill tone="warning">Complete</StatusPill> : null}
          </div>
          <p className="mt-1 text-xs tracking-[0.12em] text-[#8B949E]">
            {tournament.year} · CPI threshold {tournament.cpi_threshold} · Updated{' '}
            {formatCompactDateTime(tournament.updated_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={updateActiveState}
          disabled={isSaving}
          className={`min-h-11 rounded-md border px-4 py-2 text-xs font-bold tracking-[0.14em] ${
            tournament.is_active
              ? 'border-[#F59E0B] text-[#F59E0B]'
              : 'border-[#3FB950] text-[#3FB950]'
          } disabled:border-[#27272A] disabled:text-[#484F58]`}
        >
          {isSaving ? 'Saving' : tournament.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

function CreatePlayerButton({ onSaved }: { onSaved: () => Promise<void> }) {
  return (
    <AdminActionPopover
      buttonLabel="Create player"
      title="Create player"
      description="Add a player to the roster before assigning fixtures or profile access."
    >
      {(close) => <PlayerForm onSaved={onSaved} onComplete={close} />}
    </AdminActionPopover>
  );
}

function PlayerForm({
  onSaved,
  onComplete,
}: {
  onSaved: () => Promise<void>;
  onComplete?: () => void;
}) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState<Team>('USA');
  const [tier, setTier] = useState<PlayerTier>(2);
  const [cpi, setCpi] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await createPlayer2026({
        name,
        team,
        currentCpi: cpi ? Number(cpi) : null,
        tier,
      });
      track2026('player_created', { team, tier });
      setName('');
      setTier(2);
      setCpi('');
      await onSaved();
      onComplete?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SetupForm title="Create player" onSubmit={handleSubmit} error={error}>
      <TextField label="Name" value={name} onChange={setName} />
      <label className="font-data text-xs tracking-[0.14em] text-[#8B949E]">
        Team
        <select
          value={team}
          onChange={(event) => setTeam(event.target.value as Team)}
          className="mt-1 w-full rounded-md border border-[#27272A] bg-[#050506] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
        >
          <option value="USA">USA</option>
          <option value="EUROPE">Europe</option>
        </select>
      </label>
      <TextField label="Current CPI" value={cpi} onChange={setCpi} type="number" />
      <PlayerTierSelect value={tier} onChange={setTier} />
      <SubmitButton isSaving={isSaving}>Create player</SubmitButton>
    </SetupForm>
  );
}


function PlayerStatCreateForm({
  playerId,
  tournaments,
  onSaved,
}: {
  playerId: string;
  tournaments: TournamentRow[];
  onSaved: () => Promise<void>;
}) {
  const [tournamentId, setTournamentId] = useState('');
  const [source, setSource] = useState('manual');
  const [completionYear, setCompletionYear] = useState(new Date().getFullYear().toString());
  const [singlesHolesPlayed, setSinglesHolesPlayed] = useState('0');
  const [singlesStrokes, setSinglesStrokes] = useState('0');
  const [singlesAverage, setSinglesAverage] = useState('');
  const [holesWon, setHolesWon] = useState('0');
  const [holesHalved, setHolesHalved] = useState('0');
  const [cpiAfter, setCpiAfter] = useState('');
  const [completedAt, setCompletedAt] = useState(toDateInputValue(new Date().toISOString()));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await createPlayerTournamentStat2026({
        playerId,
        tournamentId: tournamentId || null,
        source,
        completionYear: Number(completionYear),
        singlesHolesPlayed: Number(singlesHolesPlayed),
        singlesStrokes: Number(singlesStrokes),
        singlesAverage: parseOptionalNumber(singlesAverage),
        holesWon: Number(holesWon),
        holesHalved: Number(holesHalved),
        cpiAfter: parseOptionalNumber(cpiAfter),
        completedAt: toCompletedAtIso(completedAt),
      });
      track2026('player_history_row_created', {
        player_id: playerId,
        source,
        completion_year: Number(completionYear),
      });
      setTournamentId('');
      setSource('manual');
      setSinglesHolesPlayed('0');
      setSinglesStrokes('0');
      setSinglesAverage('');
      setHolesWon('0');
      setHolesHalved('0');
      setCpiAfter('');
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-[#27272A] bg-[#0F0F11] px-3 py-3">
      <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Add history row</p>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        <TournamentSelect
          label="Tournament"
          value={tournamentId}
          tournaments={tournaments}
          onChange={setTournamentId}
        />
        <AdminTextInput label="Source" value={source} onChange={setSource} />
        <AdminTextInput label="Year" value={completionYear} onChange={setCompletionYear} type="number" />
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AdminTextInput label="Singles holes" value={singlesHolesPlayed} onChange={setSinglesHolesPlayed} type="number" />
        <AdminTextInput label="Singles strokes" value={singlesStrokes} onChange={setSinglesStrokes} type="number" />
        <AdminTextInput label="Singles avg" value={singlesAverage} onChange={setSinglesAverage} type="number" required={false} />
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AdminTextInput label="Holes won" value={holesWon} onChange={setHolesWon} type="number" />
        <AdminTextInput label="Holes halved" value={holesHalved} onChange={setHolesHalved} type="number" />
        <AdminTextInput label="CPI after" value={cpiAfter} onChange={setCpiAfter} type="number" required={false} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <AdminTextInput label="Completed date" value={completedAt} onChange={setCompletedAt} type="date" />
        <button
          type="submit"
          disabled={isSaving || !playerId}
          className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isSaving ? 'Saving' : 'Add row'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </form>
  );
}

function PlayerStatEditor({
  stat,
  tournaments,
  onSaved,
  onClose,
}: {
  stat: PlayerTournamentStatsRow;
  tournaments: TournamentRow[];
  onSaved: () => Promise<void>;
  onClose?: () => void;
}) {
  const [tournamentId, setTournamentId] = useState(stat.tournament_id ?? '');
  const [source, setSource] = useState(stat.source);
  const [completionYear, setCompletionYear] = useState(stat.completion_year.toString());
  const [singlesHolesPlayed, setSinglesHolesPlayed] = useState(stat.singles_holes_played.toString());
  const [singlesStrokes, setSinglesStrokes] = useState(stat.singles_strokes.toString());
  const [singlesAverage, setSinglesAverage] = useState(stat.singles_average?.toString() ?? '');
  const [holesWon, setHolesWon] = useState(stat.holes_won.toString());
  const [holesHalved, setHolesHalved] = useState(stat.holes_halved.toString());
  const [cpiAfter, setCpiAfter] = useState(stat.cpi_after?.toString() ?? '');
  const [completedAt, setCompletedAt] = useState(toDateInputValue(stat.completed_at));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanged =
    tournamentId !== (stat.tournament_id ?? '') ||
    source !== stat.source ||
    completionYear !== stat.completion_year.toString() ||
    singlesHolesPlayed !== stat.singles_holes_played.toString() ||
    singlesStrokes !== stat.singles_strokes.toString() ||
    singlesAverage !== (stat.singles_average?.toString() ?? '') ||
    holesWon !== stat.holes_won.toString() ||
    holesHalved !== stat.holes_halved.toString() ||
    cpiAfter !== (stat.cpi_after?.toString() ?? '') ||
    completedAt !== toDateInputValue(stat.completed_at);

  useEffect(() => {
    setTournamentId(stat.tournament_id ?? '');
    setSource(stat.source);
    setCompletionYear(stat.completion_year.toString());
    setSinglesHolesPlayed(stat.singles_holes_played.toString());
    setSinglesStrokes(stat.singles_strokes.toString());
    setSinglesAverage(stat.singles_average?.toString() ?? '');
    setHolesWon(stat.holes_won.toString());
    setHolesHalved(stat.holes_halved.toString());
    setCpiAfter(stat.cpi_after?.toString() ?? '');
    setCompletedAt(toDateInputValue(stat.completed_at));
  }, [stat]);

  const saveStat = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updatePlayerTournamentStat2026({
        statId: stat.id,
        playerId: stat.player_id,
        tournamentId: tournamentId || null,
        source,
        completionYear: Number(completionYear),
        singlesHolesPlayed: Number(singlesHolesPlayed),
        singlesStrokes: Number(singlesStrokes),
        singlesAverage: parseOptionalNumber(singlesAverage),
        holesWon: Number(holesWon),
        holesHalved: Number(holesHalved),
        cpiAfter: parseOptionalNumber(cpiAfter),
        completedAt: toCompletedAtIso(completedAt),
        legacyPayload: stat.legacy_payload,
      });
      track2026('player_history_row_updated', {
        player_id: stat.player_id,
        stat_id: stat.id,
        source,
      });
      await onSaved();
      onClose?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStat = async () => {
    const confirmed = window.confirm(`Delete this ${stat.completion_year} history row?`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deletePlayerTournamentStat2026(stat.id);
      track2026('player_history_row_deleted', {
        player_id: stat.player_id,
        stat_id: stat.id,
      });
      await onSaved();
      onClose?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="grid gap-2 lg:grid-cols-3">
        <TournamentSelect
          label="Tournament"
          value={tournamentId}
          tournaments={tournaments}
          onChange={setTournamentId}
        />
        <AdminTextInput label="Source" value={source} onChange={setSource} />
        <AdminTextInput label="Year" value={completionYear} onChange={setCompletionYear} type="number" />
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AdminTextInput label="Singles holes" value={singlesHolesPlayed} onChange={setSinglesHolesPlayed} type="number" />
        <AdminTextInput label="Singles strokes" value={singlesStrokes} onChange={setSinglesStrokes} type="number" />
        <AdminTextInput label="Singles avg" value={singlesAverage} onChange={setSinglesAverage} type="number" required={false} />
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AdminTextInput label="Holes won" value={holesWon} onChange={setHolesWon} type="number" />
        <AdminTextInput label="Holes halved" value={holesHalved} onChange={setHolesHalved} type="number" />
        <AdminTextInput label="CPI after" value={cpiAfter} onChange={setCpiAfter} type="number" required={false} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <AdminTextInput label="Completed date" value={completedAt} onChange={setCompletedAt} type="date" />
        <button
          type="button"
          onClick={saveStat}
          disabled={!hasChanged || isSaving || isDeleting}
          className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isSaving ? 'Saving' : 'Save'}
        </button>
        <button
          type="button"
          onClick={deleteStat}
          disabled={isSaving || isDeleting}
          className="min-h-11 rounded-md border border-[#F85149] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#F85149] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isDeleting ? 'Deleting' : 'Delete'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

function FinalizationPanel({
  tournament,
  fixtures,
  players,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeTournament = async () => {
    if (!tournament) return;
    if (
      !window.confirm(
        'Complete this tournament? This locks score entry, saves back-nine singles stats, and updates player CPI.'
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await completeTournament2026({ tournament, fixtures, players });
      track2026('tournament_finalized', { tournament_id: tournament.id });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const reopenTournament = async () => {
    if (!tournament) return;
    if (
      !window.confirm(
        'Reopen this tournament? This restores player CPI from before finalization, removes generated app stats, and unlocks score entry.'
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await reopenTournament2026({ tournament });
      track2026('tournament_reopened', { tournament_id: tournament.id });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-5 border-t border-[#27272A] pt-4">
      <p className="text-xs font-bold tracking-[0.22em] text-[#3FB950]">Finalization</p>
      <div className="mt-3 border-y border-[#27272A] bg-[#050506] px-3 py-3 sm:rounded-md sm:border">
        {!tournament ? (
          <StatusCard tone="warning">Create an active tournament before finalization.</StatusCard>
        ) : tournament.is_complete ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">Tournament locked</p>
              <p className="mt-1 text-sm text-[#8B949E]">
                Completed {tournament.completed_at ? new Date(tournament.completed_at).toLocaleString() : 'recently'}.
                Score entry and CPI settings are locked.
              </p>
            </div>
            <button
              type="button"
              onClick={reopenTournament}
              disabled={isSaving}
              className="min-h-11 rounded-md border border-[#F59E0B] px-4 py-2 text-xs font-bold tracking-[0.12em] text-[#F59E0B] disabled:border-[#27272A] disabled:text-[#484F58]"
            >
              {isSaving ? 'Reopening' : 'Reopen'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">Complete tournament</p>
              <p className="mt-1 text-sm leading-6 text-[#8B949E]">
                Requires every fixture hole to be scored. Only back-nine singles feed player stats and CPI.
              </p>
            </div>
            <button
              type="button"
              onClick={completeTournament}
              disabled={isSaving || fixtures.length === 0}
              className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
            >
              {isSaving ? 'Completing' : 'Finalize'}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-xs text-[#F85149]">{error}</p>}
      </div>
    </div>
  );
}

function CourseMetadataCorrections({
  courseHoles,
  onSaved,
}: {
  courseHoles: CourseHoleMetadata[];
  onSaved: () => Promise<void>;
}) {
  return (
    <div className="border-y border-[#27272A] bg-[#050506] sm:rounded-md sm:border">
      <div className="px-3 py-3">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Course</p>
        <p className="mt-1 text-xs leading-5 text-[#8B949E]">
          Tap par, yardage, or stroke index to correct the score-entry metadata.
        </p>
      </div>
      <div className="max-h-[32rem] overflow-y-auto border-t border-[#27272A]">
        {courseHoles.map((hole) => (
          <CourseHoleCorrectionRow key={hole.holeNumber} hole={hole} onSaved={onSaved} />
        ))}
      </div>
    </div>
  );
}

function CourseHoleCorrectionRow({
  hole,
  onSaved,
}: {
  hole: CourseHoleMetadata;
  onSaved: () => Promise<void>;
}) {
  const [par, setPar] = useState(hole.par?.toString() ?? '');
  const [yardage, setYardage] = useState(hole.yardage?.toString() ?? '');
  const [strokeIndex, setStrokeIndex] = useState(hole.strokeIndex.toString());
  const [activeField, setActiveField] = useState<CourseMetricField | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validationError = getCourseMetricValidationError({ par, yardage, strokeIndex });
  const hasChanged =
    par !== (hole.par?.toString() ?? '') ||
    yardage !== (hole.yardage?.toString() ?? '') ||
    strokeIndex !== hole.strokeIndex.toString();

  useEffect(() => {
    setPar(hole.par?.toString() ?? '');
    setYardage(hole.yardage?.toString() ?? '');
    setStrokeIndex(hole.strokeIndex.toString());
    setActiveField(null);
  }, [hole]);

  const saveHole = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateCourseHole2026({
        holeNumber: hole.holeNumber,
        strokeIndex: Number(strokeIndex),
        par: par ? Number(par) : null,
        yardage: yardage ? Number(yardage) : null,
      });
      track2026('course_hole_updated', { hole_number: hole.holeNumber });
      setActiveField(null);
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-3 py-3 first:border-t-0">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] sm:items-center">
        <div className="flex items-center justify-between gap-3 sm:block">
          <div>
            <p className="font-data text-lg font-bold text-[#FAFAFA]">
              H{hole.holeNumber.toString().padStart(2, '0')}
            </p>
            <p className="mt-0.5 text-[10px] tracking-[0.14em] text-[#8B949E]">Course metadata</p>
          </div>
          {hasChanged ? (
            <span className="rounded-sm border border-[#F59E0B] bg-[#171006] px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#F59E0B]">
              Unsaved
            </span>
          ) : (
            <span className="rounded-sm border border-[#27272A] px-2 py-1 text-[10px] tracking-[0.14em] text-[#8B949E]">
              Synced
            </span>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-2">
          <CourseMetricTile
            label="Par"
            value={par}
            placeholder="-"
            active={activeField === 'par'}
            onActivate={() => setActiveField('par')}
            onDeactivate={() => setActiveField(null)}
            onChange={setPar}
          />
          <CourseMetricTile
            label="Yards"
            value={yardage}
            placeholder="Set"
            active={activeField === 'yardage'}
            onActivate={() => setActiveField('yardage')}
            onDeactivate={() => setActiveField(null)}
            onChange={setYardage}
          />
          <CourseMetricTile
            label="SI"
            value={strokeIndex}
            placeholder="-"
            active={activeField === 'strokeIndex'}
            onActivate={() => setActiveField('strokeIndex')}
            onDeactivate={() => setActiveField(null)}
            onChange={setStrokeIndex}
          />
        </div>
        <button
          type="button"
          onClick={saveHole}
          disabled={!hasChanged || isSaving || Boolean(validationError)}
          className="min-h-11 w-full rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold tracking-[0.12em] text-[#3FB950] hover:bg-[#06170B] disabled:border-[#27272A] disabled:text-[#484F58] disabled:hover:bg-transparent sm:w-auto"
        >
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
      {(validationError || error) && <p className="mt-2 text-xs text-[#F85149]">{validationError ?? error}</p>}
    </div>
  );
}

type CourseMetricField = 'par' | 'yardage' | 'strokeIndex';

function CourseMetricTile({
  label,
  value,
  placeholder,
  active,
  onActivate,
  onDeactivate,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onChange: (value: string) => void;
}) {
  if (active) {
    return (
      <div className="min-w-0 rounded-md border border-[#3FB950] bg-[#06170B] p-2 font-data">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] tracking-[0.14em] text-[#3FB950]">{label}</span>
          <button
            type="button"
            onClick={onDeactivate}
            className="rounded-sm border border-[#27272A] px-1.5 py-1 text-[10px] tracking-[0.12em] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950]"
            aria-label={`Done ${label}`}
          >
            Done
          </button>
        </div>
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onDeactivate();
            }
          }}
          aria-label={label}
          type="number"
          inputMode="numeric"
          className="mt-1 min-h-11 min-w-0 w-full rounded border border-[#3F3F46] bg-[#050506] px-2 text-center text-lg font-bold tabular-nums tracking-normal text-[#FAFAFA] outline-none focus:border-[#3FB950]"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      className="min-h-[4.5rem] min-w-0 rounded-md border border-[#27272A] bg-[#0F0F11] p-2 text-left transition hover:border-[#3F3F46] hover:bg-[#18181B] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950]"
      aria-label={`Edit ${label}`}
    >
      <span className="block text-[10px] tracking-[0.14em] text-[#8B949E]">{label}</span>
      <span className="mt-1 block truncate font-data text-xl font-bold tabular-nums text-[#FAFAFA]">
        {value || placeholder}
      </span>
      <span className="mt-1 block text-[10px] tracking-[0.12em] text-[#3FB950]">Tap edit</span>
    </button>
  );
}

function getCourseMetricValidationError({
  par,
  yardage,
  strokeIndex,
}: {
  par: string;
  yardage: string;
  strokeIndex: string;
}): string | null {
  if (par && (!Number.isInteger(Number(par)) || Number(par) < 1)) {
    return 'Par must be a whole number greater than 0.';
  }

  if (yardage && (!Number.isInteger(Number(yardage)) || Number(yardage) < 1)) {
    return 'Yardage must be a whole number greater than 0.';
  }

  if (!Number.isInteger(Number(strokeIndex)) || Number(strokeIndex) < 1 || Number(strokeIndex) > 18) {
    return 'Stroke index must be a whole number from 1 to 18.';
  }

  return null;
}

function TournamentCorrections({
  tournament,
  fixtures,
  players,
  profileId,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  profileId: string;
  onSaved: () => Promise<void>;
}) {
  return (
    <div className="border-y border-[#27272A] bg-[#050506] sm:rounded-md sm:border">
      <div className="px-3 py-3">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Tournament</p>
      </div>
      {!tournament ? (
        <p className="border-t border-[#27272A] px-3 py-3 text-sm text-[#8B949E]">
          No active tournament yet.
        </p>
      ) : (
        <div className="border-t border-[#27272A] px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
                  {tournament.name}
                </p>
                <StatusPill tone={tournament.is_active ? 'success' : 'muted'}>
                  {tournament.is_active ? 'Active' : 'Inactive'}
                </StatusPill>
                {tournament.is_complete ? <StatusPill tone="warning">Complete</StatusPill> : null}
              </div>
              <p className="mt-1 text-xs tracking-[0.12em] text-[#8B949E]">
                {tournament.year} · CPI threshold {tournament.cpi_threshold} · Updated{' '}
                {formatCompactDateTime(tournament.updated_at)}
              </p>
              {tournament.is_complete ? (
                <p className="mt-2 text-xs text-[#F59E0B]">Tournament is complete, so details are locked.</p>
              ) : null}
            </div>
            <AdminActionPopover
              buttonLabel="Edit"
              title={`Edit ${tournament.name}`}
              description="Update event name, year, or CPI threshold. CPI changes recalculate saved score outcomes."
              disabled={tournament.is_complete}
            >
              {(close) => (
                <TournamentEditForm
                  tournament={tournament}
                  fixtures={fixtures}
                  players={players}
                  profileId={profileId}
                  onSaved={onSaved}
                  onComplete={close}
                />
              )}
            </AdminActionPopover>
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentEditForm({
  tournament,
  fixtures,
  players,
  profileId,
  onSaved,
  onComplete,
}: {
  tournament: TournamentRow;
  fixtures: FixtureView[];
  players: PlayerRow[];
  profileId: string;
  onSaved: () => Promise<void>;
  onComplete: () => void;
}) {
  const [name, setName] = useState(tournament?.name ?? '');
  const [year, setYear] = useState(tournament?.year.toString() ?? '');
  const [threshold, setThreshold] = useState(tournament?.cpi_threshold.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanged =
    Boolean(tournament) &&
    (name !== tournament?.name ||
      year !== tournament?.year.toString() ||
      threshold !== tournament?.cpi_threshold.toString());

  useEffect(() => {
    setName(tournament?.name ?? '');
    setYear(tournament?.year.toString() ?? '');
    setThreshold(tournament?.cpi_threshold.toString() ?? '');
  }, [tournament]);

  const saveTournament = async () => {
    if (!tournament) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateTournament2026({
        tournament,
        fixtures,
        players,
        name,
        year: Number(year),
        cpiThreshold: Number(threshold),
        updatedBy: profileId,
      });
      track2026('tournament_updated', { tournament_id: tournament.id });
      await onSaved();
      onComplete();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-2">
      <TextField label="Name" value={name} onChange={setName} />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <TextField label="Year" value={year} onChange={setYear} type="number" />
        <TextField label="CPI threshold" value={threshold} onChange={setThreshold} type="number" />
        <button
          type="button"
          onClick={saveTournament}
          disabled={!hasChanged || isSaving || tournament.is_complete}
          className="min-h-11 rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

type PlayerRosterSortKey = 'team' | 'tier' | 'handicap' | 'updated' | 'linked' | 'name' | 'email';

type PlayerRosterSortConfig = {
  key: PlayerRosterSortKey;
  direction: 'asc' | 'desc';
};

type PlayerRosterRow = {
  player: PlayerRow;
  linkedProfiles: ProfileRow[];
  linkedNames: string;
  linkedEmails: string;
  linkedStatus: 'Linked' | 'Unlinked';
  searchableText: string;
};

type TierCpiStats = {
  min: number | null;
  max: number | null;
  median: number | null;
  count: number;
};

type TierStatsMap = Record<PlayerTier, TierCpiStats>;

function computeTierCpiStats(players: PlayerRow[]): TierStatsMap {
  const buckets: Record<PlayerTier, number[]> = { 1: [], 2: [], 3: [] };

  for (const player of players) {
    if (player.current_cpi == null) {
      continue;
    }

    buckets[normalizePlayerTier(player.tier)].push(player.current_cpi);
  }

  const summarize = (values: number[]): TierCpiStats => {
    if (values.length === 0) {
      return { min: null, max: null, median: null, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    return { min: sorted[0], max: sorted[sorted.length - 1], median, count: sorted.length };
  };

  return { 1: summarize(buckets[1]), 2: summarize(buckets[2]), 3: summarize(buckets[3]) };
}

function formatTierStat(value: number | null): string {
  if (value == null) {
    return '–';
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function PlayerCorrections({
  players,
  profiles,
  playerStats,
  tournaments,
  onSaved,
}: {
  players: PlayerRow[];
  profiles: ProfileRow[];
  playerStats: PlayerTournamentStatsRow[];
  tournaments: TournamentRow[];
  onSaved: () => Promise<void>;
}) {
  const [teamFilter, setTeamFilter] = useState<'ALL' | Team>('ALL');
  const [linkedFilter, setLinkedFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');
  const [query, setQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<PlayerRosterSortConfig>({
    key: 'team',
    direction: 'asc',
  });
  const [historyExportError, setHistoryExportError] = useState<string | null>(null);
  const [exportedHistoryCount, setExportedHistoryCount] = useState<number | null>(null);
  const profilesByPlayerId = useMemo(() => {
    const nextProfilesByPlayerId = new Map<string, ProfileRow[]>();

    for (const profile of profiles) {
      if (!profile.linked_player_id) {
        continue;
      }

      nextProfilesByPlayerId.set(profile.linked_player_id, [
        ...(nextProfilesByPlayerId.get(profile.linked_player_id) ?? []),
        profile,
      ]);
    }

    return nextProfilesByPlayerId;
  }, [profiles]);
  const rosterRows = useMemo(
    () =>
      players.map((player) => {
        const linkedProfiles = profilesByPlayerId.get(player.id) ?? [];
        const linkedNames = linkedProfiles.map((profile) => profile.display_name).join(', ');
        const linkedEmails = linkedProfiles.map((profile) => profile.email).join(', ');
        const linkedStatus: PlayerRosterRow['linkedStatus'] = linkedProfiles.length > 0 ? 'Linked' : 'Unlinked';
        const searchableText = [
          player.name,
          player.team,
          formatPlayerTier(player.tier),
          player.current_cpi?.toString() ?? '',
          linkedStatus,
          linkedNames,
          linkedEmails,
        ]
          .join(' ')
          .toLowerCase();

        return {
          player,
          linkedProfiles,
          linkedNames,
          linkedEmails,
          linkedStatus,
          searchableText,
        };
      }),
    [players, profilesByPlayerId]
  );
  const tierStats = useMemo(() => computeTierCpiStats(players), [players]);
  const unlinkedProfiles = useMemo(
    () => profiles.filter((profile) => !profile.linked_player_id),
    [profiles]
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rosterRows
      .filter(({ player }) => teamFilter === 'ALL' || player.team === teamFilter)
      .filter(({ linkedProfiles }) => {
        if (linkedFilter === 'LINKED') {
          return linkedProfiles.length > 0;
        }

        if (linkedFilter === 'UNLINKED') {
          return linkedProfiles.length === 0;
        }

        return true;
      })
      .filter((row) => !normalizedQuery || row.searchableText.includes(normalizedQuery))
      .sort((a, b) => comparePlayerRosterRows(a, b, sortConfig));
  }, [linkedFilter, query, rosterRows, sortConfig, teamFilter]);
  const updateSort = (key: PlayerRosterSortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  const exportPlayerHistory = () => {
    setHistoryExportError(null);
    setExportedHistoryCount(null);
    track2026('player_history_export_started', { source: 'admin_players' });

    try {
      downloadPlayerHistoryCsv(players, playerStats);
      setExportedHistoryCount(playerStats.length);
      track2026('player_history_export_completed', {
        source: 'admin_players',
        player_count: players.length,
        row_count: playerStats.length,
        year_count: new Set(playerStats.map((stat) => stat.completion_year)).size,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      setHistoryExportError(message);
      track2026('player_history_export_failed', {
        source: 'admin_players',
        error: message,
      });
    }
  };

  return (
    <div className="border-y border-[#27272A] bg-[#050506] sm:rounded-md sm:border">
      <div className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Players</p>
          <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
            Full roster with archive-style history links. Edit details from the left-side action on each row.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={exportPlayerHistory}
            disabled={players.length === 0}
            className="min-h-11 rounded-md border border-[#3FB950]/70 px-3 py-2 font-data text-sm font-bold text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            Export history CSV
          </button>
          <CreatePlayerButton onSaved={onSaved} />
        </div>
      </div>
      {historyExportError ? (
        <div className="px-3 pb-3">
          <StatusCard tone="error">Player history export failed: {historyExportError}</StatusCard>
        </div>
      ) : null}
      {exportedHistoryCount !== null ? (
        <div className="px-3 pb-3">
          <StatusCard tone="success">
            Exported {players.length} players and {exportedHistoryCount} history rows as CSV.
          </StatusCard>
        </div>
      ) : null}
      <UnlinkedProfilesPanel profiles={unlinkedProfiles} players={players} onSaved={onSaved} />
      <div className="border-t border-[#27272A] px-3 py-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="block font-data text-xs tracking-[0.14em] text-[#8B949E]">
            Filter roster
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, team, tier, or link"
              className="mt-1 min-h-11 w-full rounded-md border border-[#27272A] !bg-[#050506] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:!border-[#3FB950] focus:!ring-0"
            />
          </label>
          <div>
            <p className="font-data text-xs tracking-[0.14em] text-[#8B949E]">Team</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <PlayerFilterButton label="All" isActive={teamFilter === 'ALL'} onClick={() => setTeamFilter('ALL')} />
              <PlayerFilterButton label="USA" isActive={teamFilter === 'USA'} onClick={() => setTeamFilter('USA')} />
              <PlayerFilterButton
                label="Europe"
                isActive={teamFilter === 'EUROPE'}
                onClick={() => setTeamFilter('EUROPE')}
              />
            </div>
          </div>
          <div>
            <p className="font-data text-xs tracking-[0.14em] text-[#8B949E]">Linked</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <PlayerFilterButton
                label="All"
                isActive={linkedFilter === 'ALL'}
                onClick={() => setLinkedFilter('ALL')}
              />
              <PlayerFilterButton
                label="Linked"
                isActive={linkedFilter === 'LINKED'}
                onClick={() => setLinkedFilter('LINKED')}
              />
              <PlayerFilterButton
                label="Open"
                isActive={linkedFilter === 'UNLINKED'}
                onClick={() => setLinkedFilter('UNLINKED')}
              />
            </div>
          </div>
        </div>
      </div>
      {filteredRows.length === 0 ? (
        <p className="border-t border-[#27272A] px-3 py-3 text-sm text-[#8B949E]">
          {players.length === 0 ? 'No players yet.' : 'No players match this filter.'}
        </p>
      ) : (
        <div className="border-t border-[#27272A] overflow-x-auto">
          <table className="w-full border-collapse text-left font-data text-xs">
            <thead className="bg-[#09090B] text-[#8B949E]">
              <tr className="border-b border-[#27272A]">
                <PlayerRosterSortHeader
                  label="Name"
                  sortKey="name"
                  sortConfig={sortConfig}
                  onSort={updateSort}
                  className="sticky left-0 z-20 w-px whitespace-nowrap bg-[#09090B]"
                />
                <PlayerRosterSortHeader
                  label="Team"
                  sortKey="team"
                  sortConfig={sortConfig}
                  onSort={updateSort}
                  className="w-24"
                />
                <PlayerRosterSortHeader
                  label="Tier"
                  sortKey="tier"
                  sortConfig={sortConfig}
                  onSort={updateSort}
                  className="w-20"
                />
                <PlayerRosterSortHeader
                  label="Handicap"
                  sortKey="handicap"
                  sortConfig={sortConfig}
                  onSort={updateSort}
                  className="w-24"
                />
                <PlayerRosterSortHeader
                  label="Last updated"
                  sortKey="updated"
                  sortConfig={sortConfig}
                  onSort={updateSort}
                  className="w-32"
                />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <PlayerCorrectionRow
                  key={row.player.id}
                  row={row}
                  tierStats={tierStats}
                  players={players}
                  playerStats={playerStats}
                  tournaments={tournaments}
                  onSaved={onSaved}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlayerFilterButton({
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
      className={`rounded-md border px-2.5 py-2 text-[11px] font-bold tracking-[0.14em] ${
        isActive
          ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
          : 'border-[#27272A] text-[#8B949E] hover:text-[#E6EDF3]'
      }`}
    >
      {label}
    </button>
  );
}

function PlayerRosterSortHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: PlayerRosterSortKey;
  sortConfig: PlayerRosterSortConfig;
  onSort: (sortKey: PlayerRosterSortKey) => void;
  className?: string;
}) {
  const isActive = sortConfig.key === sortKey;

  return (
    <th scope="col" className={`px-3 py-0 font-bold tracking-[0.12em] ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex min-h-11 w-full items-center justify-between gap-2 text-left hover:text-[#E6EDF3] ${
          isActive ? 'text-[#3FB950]' : 'text-[#8B949E]'
        }`}
        aria-label={`Sort players by ${label}`}
      >
        <span>{label}</span>
        <span className="text-[10px]">{isActive ? (sortConfig.direction === 'asc' ? 'asc' : 'desc') : '-'}</span>
      </button>
    </th>
  );
}

function comparePlayerRosterRows(
  a: PlayerRosterRow,
  b: PlayerRosterRow,
  sortConfig: PlayerRosterSortConfig
): number {
  const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;
  const primary = compareRosterSortValues(
    getPlayerRosterSortValue(a, sortConfig.key),
    getPlayerRosterSortValue(b, sortConfig.key)
  );

  if (primary !== 0) {
    return primary * directionMultiplier;
  }

  return a.player.name.localeCompare(b.player.name) || a.player.team.localeCompare(b.player.team);
}

function getPlayerRosterSortValue(row: PlayerRosterRow, sortKey: PlayerRosterSortKey): string | number {
  switch (sortKey) {
    case 'team':
      return row.player.team === 'USA' ? 0 : 1;
    case 'tier':
      return normalizePlayerTier(row.player.tier);
    case 'handicap':
      return row.player.current_cpi ?? Number.POSITIVE_INFINITY;
    case 'updated':
      return new Date(row.player.updated_at).getTime();
    case 'linked':
      return row.linkedProfiles.length > 0 ? 0 : 1;
    case 'name':
      return row.player.name.toLowerCase();
    case 'email':
      return row.linkedEmails.toLowerCase() || '~';
    default: {
      const exhaustive: never = sortKey;
      return exhaustive;
    }
  }
}

function compareRosterSortValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b));
}

function PlayerCorrectionRow({
  row,
  tierStats,
  players,
  playerStats,
  tournaments,
  onSaved,
}: {
  row: PlayerRosterRow;
  tierStats: TierStatsMap;
  players: PlayerRow[];
  playerStats: PlayerTournamentStatsRow[];
  tournaments: TournamentRow[];
  onSaved: () => Promise<void>;
}) {
  const { player, linkedProfiles } = row;
  const [isEditOpen, setIsEditOpen] = useState(false);

  const openEdit = () => setIsEditOpen(true);
  const closeEdit = () => setIsEditOpen(false);

  const playerHistory = useMemo(
    () => playerStats.filter((stat) => stat.player_id === player.id),
    [playerStats, player.id]
  );

  return (
    <tr
      className="group cursor-pointer border-t border-[#27272A] align-middle text-[#E6EDF3] hover:bg-[#0F1A12] focus-visible:bg-[#0F1A12] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950]"
      data-player-row-name={player.name}
      onClick={openEdit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openEdit();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${player.name}`}
    >
      <td className="sticky left-0 z-10 w-px whitespace-nowrap bg-[#050506] px-3 py-2 group-hover:bg-[#0F1A12] group-focus-visible:bg-[#0F1A12]">
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <PlayerHistoryTrigger player={player} className="font-bold tracking-[-0.03em] text-[#FAFAFA]">
            <PlayerIdentity player={player} showTeam={false} />
          </PlayerHistoryTrigger>
        </div>
      </td>
      <td className="px-3 py-2">
        <StatusPill tone={player.team === 'USA' ? 'warning' : 'muted'}>
          {player.team === 'USA' ? 'USA' : 'Europe'}
        </StatusPill>
      </td>
      <td className="px-3 py-2 text-[#A1A1AA]">{formatPlayerTier(player.tier)}</td>
      <td className="px-3 py-2 tabular-nums text-[#FAFAFA]">{player.current_cpi ?? '-'}</td>
      <td className="px-3 py-2 tabular-nums text-[#A1A1AA]">
        {formatCompactDateTime(player.updated_at)}
        <AdminActionDialog
          isOpen={isEditOpen}
          onClose={closeEdit}
          title={`Edit ${player.name}`}
          description="Correct roster details, linked profile, and history."
        >
          {(close) => (
            <PlayerEditForm
              player={player}
              tierStats={tierStats}
              linkedProfiles={linkedProfiles}
              players={players}
              tournaments={tournaments}
              playerHistory={playerHistory}
              onSaved={onSaved}
              onComplete={close}
            />
          )}
        </AdminActionDialog>
      </td>
    </tr>
  );
}

type PlayerEditField = 'name' | 'team' | 'cpi' | 'tier';

function PlayerEditForm({
  player,
  tierStats,
  linkedProfiles,
  players,
  tournaments,
  playerHistory,
  onSaved,
  onComplete,
}: {
  player: PlayerRow;
  tierStats: TierStatsMap;
  linkedProfiles: ProfileRow[];
  players: PlayerRow[];
  tournaments: TournamentRow[];
  playerHistory: PlayerTournamentStatsRow[];
  onSaved: () => Promise<void>;
  onComplete: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [team, setTeam] = useState<Team>(player.team);
  const [tier, setTier] = useState<PlayerTier>(normalizePlayerTier(player.tier));
  const [cpi, setCpi] = useState(player.current_cpi?.toString() ?? '');
  const [activeField, setActiveField] = useState<PlayerEditField | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanged =
    name !== player.name ||
    team !== player.team ||
    tier !== normalizePlayerTier(player.tier) ||
    cpi !== (player.current_cpi?.toString() ?? '');

  useEffect(() => {
    setName(player.name);
    setTeam(player.team);
    setTier(normalizePlayerTier(player.tier));
    setCpi(player.current_cpi?.toString() ?? '');
  }, [player]);

  const savePlayer = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updatePlayer2026({
        playerId: player.id,
        name,
        team,
        currentCpi: cpi ? Number(cpi) : null,
        tier,
      });
      track2026('player_updated', {
        player_id: player.id,
        tier,
        tier_changed: tier !== normalizePlayerTier(player.tier),
      });
      await onSaved();
      onComplete();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const closeField = () => setActiveField(null);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        <PlayerFieldTile
          label="Name"
          displayValue={name || '—'}
          active={activeField === 'name'}
          onActivate={() => setActiveField('name')}
          onDone={closeField}
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                event.preventDefault();
                closeField();
              }
            }}
            aria-label="Name"
            className="min-h-11 w-full rounded border border-[#3F3F46] bg-[#050506] px-2 text-base font-bold text-[#FAFAFA] outline-none focus:border-[#3FB950]"
          />
        </PlayerFieldTile>
        <PlayerFieldTile
          label="Team"
          displayValue={`${team === 'USA' ? '🇺🇸' : '🇪🇺'} ${team === 'USA' ? 'USA' : 'Europe'}`}
          active={activeField === 'team'}
          onActivate={() => setActiveField('team')}
          onDone={closeField}
        >
          <div className="grid grid-cols-2 gap-2">
            {(['USA', 'EUROPE'] as Team[]).map((option) => {
              const isActive = team === option;
              const emoji = option === 'USA' ? '🇺🇸' : '🇪🇺';
              const label = option === 'USA' ? 'USA' : 'Europe';
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setTeam(option);
                    closeField();
                  }}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded border px-2 py-2 text-xs font-bold tracking-[0.14em] ${
                    isActive
                      ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
                      : 'border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]'
                  }`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </PlayerFieldTile>
        <PlayerFieldTile
          label="CPI"
          displayValue={cpi || '—'}
          active={activeField === 'cpi'}
          onActivate={() => setActiveField('cpi')}
          onDone={closeField}
        >
          <input
            autoFocus
            value={cpi}
            onChange={(event) => setCpi(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                event.preventDefault();
                closeField();
              }
            }}
            aria-label="CPI"
            type="number"
            inputMode="numeric"
            className="min-h-11 w-full rounded border border-[#3F3F46] bg-[#050506] px-2 text-center text-lg font-bold tabular-nums text-[#FAFAFA] outline-none focus:border-[#3FB950]"
          />
        </PlayerFieldTile>
        <PlayerFieldTile
          label="Tier"
          displayValue={formatPlayerTier(tier)}
          active={activeField === 'tier'}
          onActivate={() => setActiveField('tier')}
          onDone={closeField}
        >
          <p className="mb-1 font-data text-[10px] tracking-[0.14em] text-[#8B949E]">CPI min · med · max</p>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as PlayerTier[]).map((option) => {
              const isActive = tier === option;
              const stats = tierStats[option];
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setTier(option);
                    closeField();
                  }}
                  className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded border px-1 py-2 text-xs font-bold tracking-[0.14em] ${
                    isActive
                      ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
                      : 'border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]'
                  }`}
                >
                  <span>Tier {option}</span>
                  <span className="font-data text-[10px] font-normal tabular-nums tracking-normal text-[#8B949E]">
                    {formatTierStat(stats.min)} · {formatTierStat(stats.median)} · {formatTierStat(stats.max)}
                  </span>
                </button>
              );
            })}
          </div>
        </PlayerFieldTile>
      </div>
      <button
        type="button"
        onClick={savePlayer}
        disabled={!hasChanged || isSaving}
        className="mt-3 min-h-11 w-full rounded-md bg-[#3FB950] px-3 py-2 font-data text-sm font-bold text-[#09090B] disabled:bg-transparent disabled:text-[#484F58] disabled:outline disabled:outline-1 disabled:outline-[#27272A]"
      >
        {isSaving ? 'Saving…' : hasChanged ? 'Save changes' : 'No changes'}
      </button>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
      <PlayerLinkedProfilePanel linkedProfiles={linkedProfiles} players={players} onSaved={onSaved} />
      <PlayerHistoryPanel
        player={player}
        playerHistory={playerHistory}
        tournaments={tournaments}
        onSaved={onSaved}
      />
    </div>
  );
}

function UnlinkedProfilesPanel({
  profiles,
  players,
  onSaved,
}: {
  profiles: ProfileRow[];
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  if (profiles.length === 0) {
    return null;
  }

  return (
    <details className="border-t border-[#27272A] open:bg-[#0F0F11]">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-3 font-data text-xs tracking-[0.16em] text-[#F59E0B] hover:text-[#FAFAFA]">
        <span>
          Unlinked profiles ({profiles.length}) — sign-ins not tied to any player
        </span>
        <span className="text-[10px] tracking-[0.12em] text-[#3FB950]">Tap to expand</span>
      </summary>
      <div className="border-t border-[#27272A]">
        {profiles.map((profile) => (
          <ProfileLinkRow key={profile.id} profile={profile} players={players} onSaved={onSaved} />
        ))}
      </div>
    </details>
  );
}

function PlayerLinkedProfilePanel({
  linkedProfiles,
  players,
  onSaved,
}: {
  linkedProfiles: ProfileRow[];
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  return (
    <details className="mt-4 rounded-md border border-[#27272A] bg-[#0F0F11] open:border-[#3F3F46]">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 font-data text-xs tracking-[0.14em] text-[#8B949E] hover:text-[#FAFAFA]">
        <span>Linked profile{linkedProfiles.length === 1 ? '' : 's'} ({linkedProfiles.length})</span>
        <span className="text-[10px] tracking-[0.12em] text-[#3FB950]">Tap to expand</span>
      </summary>
      <div className="border-t border-[#27272A]">
        {linkedProfiles.length === 0 ? (
          <p className="px-3 py-3 text-xs text-[#8B949E]">
            No signed-in profile is linked yet. Use the &ldquo;Unlinked profiles&rdquo; panel above the player table
            to link one.
          </p>
        ) : (
          linkedProfiles.map((profile) => (
            <ProfileLinkRow key={profile.id} profile={profile} players={players} onSaved={onSaved} />
          ))
        )}
      </div>
    </details>
  );
}

function PlayerHistoryPanel({
  player,
  playerHistory,
  tournaments,
  onSaved,
}: {
  player: PlayerRow;
  playerHistory: PlayerTournamentStatsRow[];
  tournaments: TournamentRow[];
  onSaved: () => Promise<void>;
}) {
  const sortedHistory = useMemo(
    () => [...playerHistory].sort((a, b) => b.completion_year - a.completion_year),
    [playerHistory]
  );
  const [isAdding, setIsAdding] = useState(false);

  return (
    <details className="mt-3 rounded-md border border-[#27272A] bg-[#0F0F11] open:border-[#3F3F46]">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 font-data text-xs tracking-[0.14em] text-[#8B949E] hover:text-[#FAFAFA]">
        <span>History ({sortedHistory.length})</span>
        <span className="text-[10px] tracking-[0.12em] text-[#3FB950]">Tap to expand</span>
      </summary>
      <div className="border-t border-[#27272A]">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="font-data text-[10px] tracking-[0.14em] text-[#8B949E]">
            App-generated and manual entries
          </p>
          <button
            type="button"
            onClick={() => setIsAdding((value) => !value)}
            className="rounded-md border border-[#3FB950] px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-[#3FB950] hover:bg-[#06170B]"
          >
            {isAdding ? 'Cancel' : 'Add row'}
          </button>
        </div>
        {isAdding ? (
          <PlayerStatCreateForm
            playerId={player.id}
            tournaments={tournaments}
            onSaved={async () => {
              await onSaved();
              setIsAdding(false);
            }}
          />
        ) : null}
        {sortedHistory.length === 0 ? (
          <p className="border-t border-[#27272A] px-3 py-3 text-xs text-[#8B949E]">
            No history rows yet.
          </p>
        ) : (
          <div className="border-t border-[#27272A] overflow-x-auto">
            <table className="w-full border-collapse text-left font-data text-xs">
              <thead className="bg-[#09090B] text-[#8B949E]">
                <tr className="border-b border-[#27272A]">
                  <th scope="col" className="whitespace-nowrap px-2 py-2 font-bold tracking-[0.12em]">Year</th>
                  <th scope="col" className="whitespace-nowrap px-2 py-2 font-bold tracking-[0.12em]">Source</th>
                  <th scope="col" className="whitespace-nowrap px-2 py-2 font-bold tracking-[0.12em]">Avg</th>
                  <th scope="col" className="whitespace-nowrap px-2 py-2 font-bold tracking-[0.12em]">W/H</th>
                  <th scope="col" className="whitespace-nowrap px-2 py-2 font-bold tracking-[0.12em]">CPI</th>
                  <th scope="col" className="whitespace-nowrap px-2 py-2 font-bold tracking-[0.12em]">Date</th>
                  <th scope="col" className="whitespace-nowrap px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((stat) => (
                  <PlayerHistoryTableRow
                    key={stat.id}
                    stat={stat}
                    tournaments={tournaments}
                    onSaved={onSaved}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

function PlayerHistoryTableRow({
  stat,
  tournaments,
  onSaved,
}: {
  stat: PlayerTournamentStatsRow;
  tournaments: TournamentRow[];
  onSaved: () => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sourceTone =
    stat.source === 'app' ? 'success' : stat.source === 'manual' ? 'warning' : 'muted';

  return (
    <>
      <tr className="border-t border-[#27272A] align-middle text-[#E6EDF3]">
        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#FAFAFA]">{stat.completion_year}</td>
        <td className="whitespace-nowrap px-2 py-2">
          <StatusPill tone={sourceTone}>{stat.source}</StatusPill>
        </td>
        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#A1A1AA]">
          {stat.singles_average ?? '-'}
        </td>
        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#A1A1AA]">
          {stat.holes_won}/{stat.holes_halved}
        </td>
        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#FAFAFA]">{stat.cpi_after ?? '-'}</td>
        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-[#8B949E]">
          {formatCompactDateTime(stat.completed_at)}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right">
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="rounded-md border border-[#3FB950] px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#3FB950] hover:bg-[#06170B]"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Close ${stat.completion_year} history row` : `Edit ${stat.completion_year} history row`}
          >
            {isExpanded ? 'Close' : 'Edit'}
          </button>
        </td>
      </tr>
      {isExpanded ? (
        <tr className="border-t border-[#27272A] bg-[#050506]">
          <td colSpan={7} className="px-3 py-3">
            <PlayerStatEditor
              stat={stat}
              tournaments={tournaments}
              onSaved={onSaved}
              onClose={() => setIsExpanded(false)}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function PlayerFieldTile({
  label,
  displayValue,
  active,
  onActivate,
  onDone,
  children,
}: {
  label: string;
  displayValue: string;
  active: boolean;
  onActivate: () => void;
  onDone: () => void;
  children: ReactNode;
}) {
  if (active) {
    return (
      <div className="min-w-0 rounded-md border border-[#3FB950] bg-[#06170B] p-2 font-data">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] tracking-[0.14em] text-[#3FB950]">{label}</span>
          <button
            type="button"
            onClick={onDone}
            className="rounded-sm border border-[#27272A] px-1.5 py-1 text-[10px] tracking-[0.12em] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950]"
            aria-label={`Done ${label}`}
          >
            Done
          </button>
        </div>
        <div className="mt-1">{children}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      className="min-h-[4.5rem] min-w-0 rounded-md border border-[#27272A] bg-[#0F0F11] p-2 text-left transition hover:border-[#3F3F46] hover:bg-[#18181B] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3FB950]"
      aria-label={`Edit ${label}`}
    >
      <span className="block text-[10px] tracking-[0.14em] text-[#8B949E]">{label}</span>
      <span className="mt-1 block truncate font-data text-base font-bold text-[#FAFAFA]">{displayValue}</span>
      <span className="mt-1 block text-[10px] tracking-[0.12em] text-[#3FB950]">Tap edit</span>
    </button>
  );
}

function PlayerTierSelect({
  value,
  onChange,
  label = 'Roster tier',
}: {
  value: PlayerTier;
  onChange: (tier: PlayerTier) => void;
  label?: string;
}) {
  return (
    <label className="font-data text-xs tracking-[0.14em] text-[#8B949E]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(normalizePlayerTier(Number(event.target.value)))}
        className="mt-1 w-full rounded-md border border-[#27272A] bg-[#050506] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
      >
        <option value={1}>Tier 1</option>
        <option value={2}>Tier 2</option>
        <option value={3}>Tier 3</option>
      </select>
    </label>
  );
}

function FixtureCorrections({
  tournament,
  fixtures,
  players,
  profileId,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  profileId: string;
  onSaved: () => Promise<void>;
}) {
  return (
    <div className="border-t border-[#27272A] pt-4">
      <div className="px-3 pb-3 sm:px-0">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Fixture repair</p>
        <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
          Rename fixtures, correct segment players, toggle CPI, or clear accidental scores.
        </p>
      </div>
      {fixtures.length === 0 ? (
        <p className="border-t border-[#27272A] px-3 py-3 text-sm text-[#8B949E] sm:px-0">No fixtures yet.</p>
      ) : (
        fixtures.map((fixture) => (
          <FixtureCorrectionRow
            key={fixture.id}
            tournament={tournament}
            fixture={fixture}
            players={players}
            profileId={profileId}
            onSaved={onSaved}
          />
        ))
      )}
    </div>
  );
}

function FixtureCorrectionRow({
  tournament,
  fixture,
  players,
  profileId,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixture: FixtureView;
  players: PlayerRow[];
  profileId: string;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(fixture.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scoreCount = fixture.segments.reduce(
    (total, segment) => total + segment.holeScores.length,
    0
  );
  const hasNameChanged = name !== (fixture.name ?? '');

  useEffect(() => {
    setName(fixture.name ?? '');
  }, [fixture]);

  const saveFixture = async () => {
    if (!tournament) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateFixture2026({
        tournament,
        fixtureId: fixture.id,
        name: name.trim() || null,
      });
      track2026('fixture_updated', { fixture_id: fixture.id });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const clearScores = async () => {
    if (!window.confirm(`Clear all saved scores for ${fixture.name ?? 'this fixture'}? This cannot be undone.`)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await clearFixtureScores2026(fixture);
      track2026('fixture_scores_cleared', { fixture_id: fixture.id });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFixture = async () => {
    if (!window.confirm(`Delete ${fixture.name ?? 'this fixture'} and all its scores? This cannot be undone.`)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await deleteFixture2026(fixture.id);
      track2026('fixture_deleted', { fixture_id: fixture.id });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-3 py-3">
      <div className="grid gap-3">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#3FB950]">
            Editing {fixture.name ?? `fixture ${fixture.sort_order + 1}`}
          </p>
          <TextField label="Fixture name" value={name} onChange={setName} />
          <p className="mt-1 text-xs text-[#8B949E]">
            {fixture.participants.length} players · {fixture.segments.length} segments · {scoreCount} saved holes
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={saveFixture}
            disabled={!tournament || !hasNameChanged || isSaving || tournament.is_complete}
            className="min-h-11 rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={clearScores}
            disabled={isSaving || scoreCount === 0}
            className="min-h-11 rounded-md border border-[#F59E0B] px-3 py-2 text-xs font-bold tracking-[0.12em] text-[#F59E0B] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            Clear scores
          </button>
          <button
            type="button"
            onClick={deleteFixture}
            disabled={isSaving}
            className="min-h-11 rounded-md border border-[#F85149] px-3 py-2 text-xs font-bold tracking-[0.12em] text-[#F85149] disabled:opacity-60"
          >
            Delete
          </button>
        </div>
        {fixture.segments.map((segment) => (
          <SegmentCorrectionRow
            key={segment.id}
            tournament={tournament}
            fixture={fixture}
            segment={segment}
            players={players}
            profileId={profileId}
            onSaved={onSaved}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

function SegmentCorrectionRow({
  tournament,
  fixture,
  segment,
  players,
  profileId,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixture: FixtureView;
  segment: FixtureView['segments'][number];
  players: PlayerRow[];
  profileId: string;
  onSaved: () => Promise<void>;
}) {
  const fixturePlayerIds = new Set(fixture.participants.map((participant) => participant.player_id));
  const fixturePlayers = players.filter((player) => fixturePlayerIds.has(player.id));
  const isSideBasedSingles = isFullCourseSinglesSegment(fixture, segment);
  const usaPlayers = fixturePlayers.filter((player) => player.team === 'USA');
  const europePlayers = fixturePlayers.filter((player) => player.team === 'EUROPE');
  const hasScores = segment.holeScores.length > 0;
  const [name, setName] = useState(segment.name ?? '');
  const [usaPlayerId, setUsaPlayerId] = useState(segment.usa_player_id ?? '');
  const [europePlayerId, setEuropePlayerId] = useState(segment.europe_player_id ?? '');
  const sideAPlayers = isSideBasedSingles
    ? filterSelectedPlayerOptions(fixturePlayers, [europePlayerId], usaPlayerId)
    : usaPlayers;
  const sideBPlayers = isSideBasedSingles
    ? filterSelectedPlayerOptions(fixturePlayers, [usaPlayerId], europePlayerId)
    : europePlayers;
  const [frontNinePlayerIds, setFrontNinePlayerIds] = useState<string[]>(
    segment.players.map((player) => player.player_id)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existingFrontNinePlayerIds = segment.players.map((player) => player.player_id).sort();
  const selectedFrontNinePlayerIds = [...frontNinePlayerIds].sort();
  const hasFrontNineMembershipChanged =
    existingFrontNinePlayerIds.join('|') !== selectedFrontNinePlayerIds.join('|');
  const hasSinglesMembershipChanged =
    usaPlayerId !== (segment.usa_player_id ?? '') || europePlayerId !== (segment.europe_player_id ?? '');
  const hasMembershipChanged = hasFrontNineMembershipChanged || hasSinglesMembershipChanged;
  const hasChanged =
    name !== (segment.name ?? '') ||
    hasSinglesMembershipChanged ||
    hasFrontNineMembershipChanged;

  useEffect(() => {
    setName(segment.name ?? '');
    setUsaPlayerId(segment.usa_player_id ?? '');
    setEuropePlayerId(segment.europe_player_id ?? '');
    setFrontNinePlayerIds(segment.players.map((player) => player.player_id));
  }, [segment]);

  const saveSegment = async () => {
    if (!tournament) return;

    if (
      hasScores &&
      hasMembershipChanged &&
      !window.confirm(
        `Clear ${segment.holeScores.length} saved score${segment.holeScores.length === 1 ? '' : 's'} for this segment and save the player changes?`
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateSegment2026({
        tournament,
        fixture,
        segment,
        name: name.trim() || null,
        usaPlayerId,
        europePlayerId,
        participantPlayerIds: frontNinePlayerIds,
        clearScoresOnPlayerChange: hasScores && hasMembershipChanged,
      });
      track2026('segment_updated', { segment_id: segment.id, fixture_id: fixture.id });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCpi = async () => {
    if (!tournament || segment.kind !== 'singles') return;

    setIsSaving(true);
    setError(null);

    try {
      await updateSegmentCpiEnabled({
        tournament,
        segment,
        players,
        enabled: !segment.cpi_enabled,
        updatedBy: profileId,
      });
      track2026('cpi_setting_changed', {
        segment_id: segment.id,
        enabled: !segment.cpi_enabled,
      });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] pt-3">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">
            {segment.kind} · Holes {segment.hole_start}-{segment.hole_end}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {segment.kind === 'singles' && (
              <button
                type="button"
                onClick={toggleCpi}
                disabled={!tournament || isSaving || tournament.is_complete}
                className={`rounded-md border px-2 py-1 text-[10px] font-bold tracking-[0.12em] disabled:border-[#27272A] disabled:text-[#484F58] ${
                  segment.cpi_enabled
                    ? 'border-[#F59E0B] text-[#F59E0B]'
                    : 'border-[#27272A] text-[#8B949E]'
                }`}
              >
                CPI {segment.cpi_enabled ? 'enabled' : 'disabled'}
              </button>
            )}
            {hasScores && (
              <span className="text-[10px] tracking-[0.14em] text-[#F59E0B]">
                {segment.holeScores.length} scores
              </span>
            )}
          </div>
        </div>
        <TextField label="Segment name" value={name} onChange={setName} />
        {segment.kind === 'singles' && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <PlayerSelect
                label={isSideBasedSingles ? 'Side A' : 'USA'}
                value={usaPlayerId}
                players={sideAPlayers}
                onChange={setUsaPlayerId}
              />
              <PlayerSelect
                label={isSideBasedSingles ? 'Side B' : 'Europe'}
                value={europePlayerId}
                players={sideBPlayers}
                onChange={setEuropePlayerId}
              />
            </div>
            {hasScores && (
              <p className="text-xs text-[#8B949E]">
                Changing singles players will clear this segment's saved scores when you save.
              </p>
            )}
          </>
        )}
        {segment.kind === 'foursomes' && (
          <>
            <FrontNinePicker
              players={fixturePlayers}
              selectedPlayerIds={frontNinePlayerIds}
              onChange={setFrontNinePlayerIds}
            />
            {hasScores && (
              <p className="text-xs text-[#8B949E]">
                Changing front-nine players will clear this segment's saved scores when you save.
              </p>
            )}
          </>
        )}
        <button
          type="button"
          onClick={saveSegment}
          disabled={
            !tournament ||
            !hasChanged ||
            isSaving ||
            tournament.is_complete
          }
          className="min-h-11 rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isSaving ? 'Saving' : hasScores && hasMembershipChanged ? 'Clear scores + save' : 'Save segment'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

interface SinglesPairDraft {
  usaPlayerId: string;
  europePlayerId: string;
  cpiEnabled: boolean;
}

interface FixtureTemplateConfig {
  template: FixtureTemplate;
  title: string;
  description: string;
  detail: string;
  teamSlotCount: number;
  singlesPairCount: number;
}

const DEFAULT_FIXTURE_TEMPLATE: FixtureTemplate = 'standard_4_player';

const FIXTURE_TEMPLATE_CONFIGS: Record<FixtureTemplate, FixtureTemplateConfig> = {
  full_18_singles: {
    template: 'full_18_singles',
    title: '2-player full 18',
    description: 'One full-course singles match.',
    detail:
      'Pick any two distinct players. USA vs USA, Europe vs Europe, and USA vs Europe all work; the app assigns scoring sides for this match.',
    teamSlotCount: 0,
    singlesPairCount: 1,
  },
  standard_4_player: {
    template: 'standard_4_player',
    title: '4-player standard match',
    description: 'Front-nine 2-ball foursomes, then two singles.',
    detail:
      'Pick 2 USA and 2 Europe players. All four play the front nine as alternate-shot foursomes, then split into two USA-vs-Europe singles matches on holes 10-18.',
    teamSlotCount: 2,
    singlesPairCount: 2,
  },
  flexible_6_player: {
    template: 'flexible_6_player',
    title: '6-player flexible match',
    description: 'Selected front-nine foursomes, then three singles.',
    detail:
      'Pick 3 USA and 3 Europe players. Choose the 2 USA and 2 Europe players who play front-nine foursomes, then set three back-nine singles matches from the full group.',
    teamSlotCount: 3,
    singlesPairCount: 3,
  },
};

const FIXTURE_TEMPLATE_OPTIONS = Object.values(FIXTURE_TEMPLATE_CONFIGS);

function FixtureSetupPanel({
  tournament,
  players,
  fixtures,
  fixtureCount,
  profileId,
  onSaved,
}: {
  tournament: TournamentRow | null;
  players: PlayerRow[];
  fixtures: FixtureView[];
  fixtureCount: number;
  profileId: string;
  onSaved: () => Promise<void>;
}) {
  return (
    <div className="border-y border-[#27272A] bg-[#050506] sm:rounded-md sm:border">
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Current fixtures</p>
          <p className="mt-1 text-xs leading-5 text-[#8B949E]">
            Review the groups already created for this tournament before adding the next one.
          </p>
        </div>
        <CreateFixtureButton
          tournament={tournament}
          players={players}
          fixtures={fixtures}
          fixtureCount={fixtureCount}
          onSaved={onSaved}
        />
      </div>
      {fixtures.length === 0 ? (
        <p className="border-t border-[#27272A] px-3 py-3 text-sm text-[#8B949E]">
          No fixtures have been created yet.
        </p>
      ) : (
        <div className="border-t border-[#27272A]">
          {fixtures.map((fixture) => (
            <FixtureSetupListRow
              key={fixture.id}
              tournament={tournament}
              fixture={fixture}
              players={players}
              profileId={profileId}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateFixtureButton({
  tournament,
  players,
  fixtures,
  fixtureCount,
  onSaved,
}: {
  tournament: TournamentRow | null;
  players: PlayerRow[];
  fixtures: FixtureView[];
  fixtureCount: number;
  onSaved: () => Promise<void>;
}) {
  return (
    <AdminActionPopover
      buttonLabel="Create fixture"
      title="Create fixture"
      description="Choose a fixture template, assign players, then set the back-nine singles pairings."
    >
      {(close) => (
        <CustomFixtureForm
          tournament={tournament}
          players={players}
          fixtures={fixtures}
          fixtureCount={fixtureCount}
          onSaved={onSaved}
          onComplete={close}
        />
      )}
    </AdminActionPopover>
  );
}

function FixtureSetupListRow({
  tournament,
  fixture,
  players,
  profileId,
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixture: FixtureView;
  players: PlayerRow[];
  profileId: string;
  onSaved: () => Promise<void>;
}) {
  const scoreCount = fixture.segments.reduce((total, segment) => total + segment.holeScores.length, 0);
  const participants = fixture.participants
    .slice()
    .sort((a, b) => {
      if (a.team === b.team) {
        return a.slot - b.slot;
      }

      return a.team === 'USA' ? -1 : 1;
    });

  return (
    <article className="border-t border-[#27272A] px-3 py-3 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <FixtureTitleTrigger
            fixture={fixture}
            players={players}
            tournament={tournament}
            canEdit
            updatedByProfileId={profileId}
            onSaved={onSaved}
            className="font-data text-sm font-bold tracking-[-0.03em] text-[#FAFAFA]"
          />
          {participants.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {participants.map((participant) => (
                <FixtureParticipantPill key={`${fixture.id}-${participant.player_id}`} participant={participant} />
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">No players assigned</p>
          )}
        </div>
        <span className="rounded border border-[#27272A] px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#8B949E]">
          #{fixture.sort_order + 1}
        </span>
      </div>
      <p className="mt-2 text-[10px] tracking-[0.14em] text-[#8B949E]">
        {fixture.participants.length} players · {fixture.segments.length} segments · {scoreCount} saved holes
      </p>
    </article>
  );
}

function FixtureParticipantPill({ participant }: { participant: FixtureView['participants'][number] }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-1 text-xs text-[#A1A1AA]">
      <PlayerHistoryTrigger player={participant.player} fallback="Unknown player" className="min-w-0 text-[#FAFAFA]">
        <PlayerIdentity player={participant.player} fallback="Unknown player" />
      </PlayerHistoryTrigger>
      <span className="shrink-0 text-[10px] tracking-[0.12em] text-[#8B949E]">
        HCP{' '}
        <span className="tabular-nums text-[#A1A1AA]">
          {participant.player?.current_cpi ?? '-'}
        </span>
      </span>
    </span>
  );
}

function CustomFixtureForm({
  tournament,
  players,
  fixtures,
  fixtureCount,
  onSaved,
  onComplete,
}: {
  tournament: TournamentRow | null;
  players: PlayerRow[];
  fixtures: FixtureView[];
  fixtureCount: number;
  onSaved: () => Promise<void>;
  onComplete?: () => void;
}) {
  const unavailablePlayerIds = useMemo(() => getAssignedFixturePlayerIds(fixtures), [fixtures]);
  const availablePlayers = useMemo(
    () => players.filter((player) => !unavailablePlayerIds.has(player.id)),
    [players, unavailablePlayerIds]
  );
  const availablePlayerIds = useMemo(
    () => new Set(availablePlayers.map((player) => player.id)),
    [availablePlayers]
  );
  const usaPlayers = useMemo(() => availablePlayers.filter((player) => player.team === 'USA'), [availablePlayers]);
  const europePlayers = useMemo(
    () => availablePlayers.filter((player) => player.team === 'EUROPE'),
    [availablePlayers]
  );
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<FixtureTemplate>(DEFAULT_FIXTURE_TEMPLATE);
  const templateConfig = FIXTURE_TEMPLATE_CONFIGS[template];
  const [usaSlots, setUsaSlots] = useState<string[]>(() =>
    createEmptySlots(FIXTURE_TEMPLATE_CONFIGS[DEFAULT_FIXTURE_TEMPLATE].teamSlotCount)
  );
  const [europeSlots, setEuropeSlots] = useState<string[]>(() =>
    createEmptySlots(FIXTURE_TEMPLATE_CONFIGS[DEFAULT_FIXTURE_TEMPLATE].teamSlotCount)
  );
  const [oneVsOneSideAPlayerId, setOneVsOneSideAPlayerId] = useState('');
  const [oneVsOneSideBPlayerId, setOneVsOneSideBPlayerId] = useState('');
  const [oneVsOneCpiEnabled, setOneVsOneCpiEnabled] = useState(true);
  const [frontNinePlayerIds, setFrontNinePlayerIds] = useState<string[]>([]);
  const [singlesPairs, setSinglesPairs] = useState<SinglesPairDraft[]>(() =>
    createEmptySinglesPairs(FIXTURE_TEMPLATE_CONFIGS[DEFAULT_FIXTURE_TEMPLATE].singlesPairCount)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFullCourseSingles = template === 'full_18_singles';
  const selectedUsaPlayerIds = useMemo(
    () => (isFullCourseSingles ? compactUnique([oneVsOneSideAPlayerId]) : compactUnique(usaSlots)),
    [isFullCourseSingles, oneVsOneSideAPlayerId, usaSlots]
  );
  const selectedEuropePlayerIds = useMemo(
    () =>
      isFullCourseSingles
        ? compactUnique([oneVsOneSideBPlayerId])
        : compactUnique(europeSlots),
    [europeSlots, isFullCourseSingles, oneVsOneSideBPlayerId]
  );
  const selectedPlayerIds = useMemo(
    () => [...selectedUsaPlayerIds, ...selectedEuropePlayerIds],
    [selectedEuropePlayerIds, selectedUsaPlayerIds]
  );
  const selectedPlayers = useMemo(
    () => selectedPlayerIds.map((playerId) => players.find((player) => player.id === playerId)).filter(isPlayerRow),
    [players, selectedPlayerIds]
  );
  const activeFrontNinePlayerIds = useMemo(() => {
    if (template === 'full_18_singles') {
      return [];
    }

    if (template === 'standard_4_player') {
      return selectedPlayerIds;
    }

    return frontNinePlayerIds;
  }, [frontNinePlayerIds, selectedPlayerIds, template]);
  const activeSinglesPairs = isFullCourseSingles
    ? [
        {
          usaPlayerId: oneVsOneSideAPlayerId,
          europePlayerId: oneVsOneSideBPlayerId,
          cpiEnabled: oneVsOneCpiEnabled,
        },
      ]
    : singlesPairs;
  const completeSinglesPairs = activeSinglesPairs.filter((pair) => pair.usaPlayerId && pair.europePlayerId);
  const validationError = getCustomFixtureValidationError({
    tournament,
    template,
    selectedUsaPlayerIds,
    selectedEuropePlayerIds,
    frontNinePlayerIds: activeFrontNinePlayerIds,
    singlesPairs: activeSinglesPairs,
  });
  const isReady = !validationError;

  useEffect(() => {
    setUsaSlots((current) => resizeSlots(current, templateConfig.teamSlotCount));
    setEuropeSlots((current) => resizeSlots(current, templateConfig.teamSlotCount));
  }, [templateConfig.teamSlotCount]);

  useEffect(() => {
    setUsaSlots((current) => clearUnavailablePlayerIds(current, availablePlayerIds));
    setEuropeSlots((current) => clearUnavailablePlayerIds(current, availablePlayerIds));
    setOneVsOneSideAPlayerId((current) => (availablePlayerIds.has(current) ? current : ''));
    setOneVsOneSideBPlayerId((current) => (availablePlayerIds.has(current) ? current : ''));
  }, [availablePlayerIds]);

  useEffect(() => {
    setFrontNinePlayerIds((current) => {
      if (template !== 'flexible_6_player') {
        return [];
      }

      return current.filter((playerId) => selectedPlayerIds.includes(playerId));
    });
  }, [selectedPlayerIds, template]);

  useEffect(() => {
    setSinglesPairs((current) =>
      resizeSinglesPairs(current, templateConfig.singlesPairCount).map((pair) => ({
        ...pair,
        usaPlayerId: selectedUsaPlayerIds.includes(pair.usaPlayerId) ? pair.usaPlayerId : '',
        europePlayerId: selectedEuropePlayerIds.includes(pair.europePlayerId) ? pair.europePlayerId : '',
      }))
    );
  }, [selectedEuropePlayerIds, selectedUsaPlayerIds, templateConfig.singlesPairCount]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tournament || validationError) return;

    setIsSaving(true);
    setError(null);

    try {
      await createCustomFixture2026({
        tournamentId: tournament.id,
        name: name || `Fixture ${fixtureCount + 1}`,
        template,
        usaPlayerIds: selectedUsaPlayerIds,
        europePlayerIds: selectedEuropePlayerIds,
        frontNinePlayerIds: activeFrontNinePlayerIds,
        singlesPairs: completeSinglesPairs,
        sortOrder: fixtureCount,
      });
      track2026('fixture_created', {
        fixture_template: template,
        player_count: selectedPlayerIds.length,
        singles_count: completeSinglesPairs.length,
      });
      setName('');
      setUsaSlots(createEmptySlots(templateConfig.teamSlotCount));
      setEuropeSlots(createEmptySlots(templateConfig.teamSlotCount));
      setFrontNinePlayerIds([]);
      setSinglesPairs(createEmptySinglesPairs(templateConfig.singlesPairCount));
      setOneVsOneSideAPlayerId('');
      setOneVsOneSideBPlayerId('');
      setOneVsOneCpiEnabled(true);
      await onSaved();
      onComplete?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div>
        <p className="text-xs font-bold tracking-[0.16em] text-[#8B949E]">Fixture builder</p>
        <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
          Pick the template, choose players, then confirm the scoring segments.
        </p>
      </div>
      {validationError && <StatusCard tone="warning">{validationError}</StatusCard>}
      <TextField label="Fixture name" value={name} onChange={setName} />
      <FixtureTemplatePicker template={template} onChange={setTemplate} />
      {isFullCourseSingles ? (
        <OneVsOnePicker
          players={availablePlayers}
          sideAPlayerId={oneVsOneSideAPlayerId}
          sideBPlayerId={oneVsOneSideBPlayerId}
          cpiEnabled={oneVsOneCpiEnabled}
          onSideAPlayerChange={setOneVsOneSideAPlayerId}
          onSideBPlayerChange={setOneVsOneSideBPlayerId}
          onCpiEnabledChange={setOneVsOneCpiEnabled}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TeamSlotPicker
              label="USA slots"
              players={usaPlayers}
              slots={usaSlots}
              selectedPlayerIds={selectedPlayerIds}
              onChange={setUsaSlots}
            />
            <TeamSlotPicker
              label="Europe slots"
              players={europePlayers}
              slots={europeSlots}
              selectedPlayerIds={selectedPlayerIds}
              onChange={setEuropeSlots}
            />
          </div>
          {template === 'standard_4_player' ? (
            <StatusCard>
              Front 9 uses all four selected players: USA pair alternate shot against Europe pair.
            </StatusCard>
          ) : (
            <FrontNinePicker
              players={selectedPlayers}
              selectedPlayerIds={frontNinePlayerIds}
              onChange={setFrontNinePlayerIds}
            />
          )}
        </>
      )}
      {isFullCourseSingles ? (
        <StatusCard>
          2-player full 18 selected. This creates one 18-hole singles match and skips front-nine foursomes.
        </StatusCard>
      ) : null}
      {!isFullCourseSingles && (
        <SinglesPairPicker
          usaPlayers={selectedPlayers.filter((player) => player.team === 'USA')}
          europePlayers={selectedPlayers.filter((player) => player.team === 'EUROPE')}
          pairs={singlesPairs}
          onChange={setSinglesPairs}
        />
      )}
      <FixturePreview
        templateConfig={templateConfig}
        selectedPlayers={selectedPlayers}
        frontNinePlayerIds={activeFrontNinePlayerIds}
        singlesPairs={completeSinglesPairs}
      />
      <SubmitButton isSaving={isSaving} disabled={!isReady}>
        Create fixture
      </SubmitButton>
      {error && <p className="text-sm text-[#F85149]">{error}</p>}
    </form>
  );
}

function FixtureTemplatePicker({
  template,
  onChange,
}: {
  template: FixtureTemplate;
  onChange: (template: FixtureTemplate) => void;
}) {
  return (
    <div className="grid gap-2">
      {FIXTURE_TEMPLATE_OPTIONS.map((option) => (
        <FixtureTemplateButton
          key={option.template}
          config={option}
          isSelected={template === option.template}
          onClick={() => onChange(option.template)}
        />
      ))}
    </div>
  );
}

function FixtureTemplateButton({
  config,
  isSelected,
  onClick,
}: {
  config: FixtureTemplateConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-3 text-left ${
        isSelected
          ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
          : 'border-[#27272A] bg-[#0C0C0E] text-[#A1A1AA]'
      }`}
    >
      <span className="block text-xs font-bold tracking-[0.14em]">{config.title}</span>
      <span className="mt-1 block text-xs leading-5 text-[#E6EDF3]">{config.description}</span>
      <span className="mt-1 block text-xs leading-5 text-[#8B949E]">{config.detail}</span>
    </button>
  );
}

function OneVsOnePicker({
  players,
  sideAPlayerId,
  sideBPlayerId,
  cpiEnabled,
  onSideAPlayerChange,
  onSideBPlayerChange,
  onCpiEnabledChange,
}: {
  players: PlayerRow[];
  sideAPlayerId: string;
  sideBPlayerId: string;
  cpiEnabled: boolean;
  onSideAPlayerChange: (playerId: string) => void;
  onSideBPlayerChange: (playerId: string) => void;
  onCpiEnabledChange: (enabled: boolean) => void;
}) {
  const sideAPlayers = filterSelectedPlayerOptions(players, [sideBPlayerId], sideAPlayerId);
  const sideBPlayers = filterSelectedPlayerOptions(players, [sideAPlayerId], sideBPlayerId);

  return (
    <div className="border-t border-[#27272A] pt-3">
      <p className="text-xs font-bold tracking-[0.14em] text-[#8B949E]">1v1 players</p>
      <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
        Pick any two players. Side A and Side B are the two scoring sides for this match.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PlayerSelect label="Side A" value={sideAPlayerId} players={sideAPlayers} onChange={onSideAPlayerChange} />
        <PlayerSelect label="Side B" value={sideBPlayerId} players={sideBPlayers} onChange={onSideBPlayerChange} />
      </div>
      <button
        type="button"
        onClick={() => onCpiEnabledChange(!cpiEnabled)}
        className={`mt-3 rounded-md border px-3 py-2 text-xs font-bold tracking-[0.12em] ${
          cpiEnabled ? 'border-[#F59E0B] text-[#F59E0B]' : 'border-[#27272A] text-[#8B949E]'
        }`}
      >
        CPI {cpiEnabled ? 'enabled' : 'disabled'}
      </button>
    </div>
  );
}

function TeamSlotPicker({
  label,
  players,
  slots,
  selectedPlayerIds,
  onChange,
}: {
  label: string;
  players: PlayerRow[];
  slots: string[];
  selectedPlayerIds: string[];
  onChange: (slots: string[]) => void;
}) {
  return (
    <div className="border-t border-[#27272A] pt-3">
      <p className="text-xs font-bold tracking-[0.14em] text-[#8B949E]">{label}</p>
      <div className="mt-2 space-y-2">
        {slots.map((playerId, index) => (
          <PlayerSelect
            key={index}
            label={`Slot ${index + 1}`}
            value={playerId}
            players={filterSelectedPlayerOptions(players, selectedPlayerIds, playerId)}
            onChange={(nextPlayerId) => {
              const nextSlots = [...slots];
              nextSlots[index] = nextPlayerId;
              onChange(nextSlots);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FrontNinePicker({
  players,
  selectedPlayerIds,
  onChange,
}: {
  players: PlayerRow[];
  selectedPlayerIds: string[];
  onChange: (playerIds: string[]) => void;
}) {
  const selectedPlayers = players.filter((player) => selectedPlayerIds.includes(player.id));
  const usaCount = selectedPlayers.filter((player) => player.team === 'USA').length;
  const europeCount = selectedPlayers.filter((player) => player.team === 'EUROPE').length;

  return (
    <div className="border-t border-[#27272A] pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#8B949E]">Front 9 foursomes</p>
          <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
            Pick 2 USA and 2 Europe players from the fixture group.
          </p>
        </div>
        <p className="font-data text-[10px] tracking-[0.14em] text-[#F59E0B]">
          USA {usaCount}/2 · Europe {europeCount}/2
        </p>
      </div>
      <div className="mt-2 grid gap-2">
        {players.map((player) => {
          const isSelected = selectedPlayerIds.includes(player.id);
          const wouldExceedTeam =
            !isSelected && ((player.team === 'USA' && usaCount >= 2) || (player.team === 'EUROPE' && europeCount >= 2));

          return (
            <button
              key={player.id}
              type="button"
              disabled={wouldExceedTeam}
              onClick={() =>
                onChange(
                  isSelected
                    ? selectedPlayerIds.filter((playerId) => playerId !== player.id)
                    : [...selectedPlayerIds, player.id]
                )
              }
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                isSelected
                  ? 'border-[#3FB950] bg-[#06170B] text-[#3FB950]'
                  : wouldExceedTeam
                    ? 'border-[#27272A] text-[#484F58]'
                  : 'border-[#27272A] text-[#A1A1AA]'
              }`}
            >
              {formatPlayerFixtureLabel(player)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SinglesPairPicker({
  usaPlayers,
  europePlayers,
  pairs,
  onChange,
}: {
  usaPlayers: PlayerRow[];
  europePlayers: PlayerRow[];
  pairs: SinglesPairDraft[];
  onChange: (pairs: SinglesPairDraft[]) => void;
}) {
  const selectedSinglesPlayerIds = pairs.flatMap((pair) => [pair.usaPlayerId, pair.europePlayerId]);

  return (
    <div className="border-t border-[#27272A] pt-3">
      <p className="text-xs font-bold tracking-[0.14em] text-[#8B949E]">Back 9 singles</p>
      <div className="mt-2 space-y-3">
        {pairs.map((pair, index) => (
          <div key={index} className="border-t border-[#27272A] pt-3 first:border-t-0 first:pt-0">
            <p className="text-xs font-bold tracking-[0.14em] text-[#A1A1AA]">
              Singles {String.fromCharCode(65 + index)}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <PlayerSelect
                label="USA"
                value={pair.usaPlayerId}
                players={filterSelectedPlayerOptions(usaPlayers, selectedSinglesPlayerIds, pair.usaPlayerId)}
                onChange={(usaPlayerId) => updatePair(pairs, index, { usaPlayerId }, onChange)}
              />
              <PlayerSelect
                label="Europe"
                value={pair.europePlayerId}
                players={filterSelectedPlayerOptions(europePlayers, selectedSinglesPlayerIds, pair.europePlayerId)}
                onChange={(europePlayerId) => updatePair(pairs, index, { europePlayerId }, onChange)}
              />
            </div>
            <button
              type="button"
              onClick={() => updatePair(pairs, index, { cpiEnabled: !pair.cpiEnabled }, onChange)}
              className={`mt-3 rounded-md border px-3 py-2 text-xs font-bold tracking-[0.12em] ${
                pair.cpiEnabled
                  ? 'border-[#F59E0B] text-[#F59E0B]'
                  : 'border-[#27272A] text-[#8B949E]'
              }`}
            >
              CPI {pair.cpiEnabled ? 'enabled' : 'disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FixturePreview({
  templateConfig,
  selectedPlayers,
  frontNinePlayerIds,
  singlesPairs,
}: {
  templateConfig: FixtureTemplateConfig;
  selectedPlayers: PlayerRow[];
  frontNinePlayerIds: string[];
  singlesPairs: SinglesPairDraft[];
}) {
  const playerLookup = new Map(selectedPlayers.map((player) => [player.id, player]));

  return (
    <div className="border-t border-[#27272A] pt-3">
      <p className="text-xs font-bold tracking-[0.14em] text-[#8B949E]">Preview</p>
      <p className="mt-2 text-sm text-[#E6EDF3]">
        {templateConfig.title} · {selectedPlayers.length} players ·{' '}
        {templateConfig.template === 'full_18_singles'
          ? '18-hole singles'
          : `${frontNinePlayerIds.length} front-nine players`}{' '}
        · {singlesPairs.length} singles
      </p>
      <div className="mt-2 space-y-1 text-xs text-[#A1A1AA]">
        {singlesPairs.map((pair, index) => (
          <p key={`${pair.usaPlayerId}-${pair.europePlayerId}-${index}`}>
            {String.fromCharCode(65 + index)}: {formatPlayerFixtureLabel(playerLookup.get(pair.usaPlayerId))} vs{' '}
            {formatPlayerFixtureLabel(playerLookup.get(pair.europePlayerId))} · CPI{' '}
            {pair.cpiEnabled ? 'on' : 'off'}
          </p>
        ))}
      </div>
    </div>
  );
}

function updatePair(
  pairs: SinglesPairDraft[],
  index: number,
  patch: Partial<SinglesPairDraft>,
  onChange: (pairs: SinglesPairDraft[]) => void
) {
  onChange(pairs.map((pair, pairIndex) => (pairIndex === index ? { ...pair, ...patch } : pair)));
}

function createEmptySlots(count: number): string[] {
  return Array.from({ length: count }, () => '');
}

function resizeSlots(currentSlots: string[], count: number): string[] {
  return [...currentSlots.slice(0, count), ...createEmptySlots(Math.max(count - currentSlots.length, 0))];
}

function createEmptySinglesPairs(count: number): SinglesPairDraft[] {
  return Array.from({ length: count }, () => ({
    usaPlayerId: '',
    europePlayerId: '',
    cpiEnabled: true,
  }));
}

function resizeSinglesPairs(currentPairs: SinglesPairDraft[], count: number): SinglesPairDraft[] {
  return [
    ...currentPairs.slice(0, count),
    ...createEmptySinglesPairs(Math.max(count - currentPairs.length, 0)),
  ];
}

function getAssignedFixturePlayerIds(fixtures: FixtureView[]): Set<string> {
  return new Set(
    fixtures.flatMap((fixture) =>
      fixture.participants.map((participant) => participant.player_id)
    )
  );
}

function filterSelectedPlayerOptions(
  players: PlayerRow[],
  selectedPlayerIds: string[],
  currentPlayerId: string
): PlayerRow[] {
  const selectedIds = new Set(selectedPlayerIds.filter((playerId) => playerId && playerId !== currentPlayerId));

  return players.filter((player) => !selectedIds.has(player.id));
}

function isFullCourseSinglesSegment(
  fixture: FixtureView,
  segment: FixtureView['segments'][number]
): boolean {
  return (
    segment.kind === 'singles' &&
    segment.hole_start === 1 &&
    segment.hole_end === 18 &&
    fixture.participants.length === 2
  );
}

function formatPlayerFixtureLabel(player: PlayerRow | undefined): string {
  if (!player) {
    return 'Select player';
  }

  return `${player.team} · ${player.name} · HCP ${player.current_cpi ?? '-'} · ${formatPlayerTier(player.tier)}`;
}

function clearUnavailablePlayerIds(playerIds: string[], availablePlayerIds: Set<string>): string[] {
  return playerIds.map((playerId) => (playerId && availablePlayerIds.has(playerId) ? playerId : ''));
}

function compactUnique(playerIds: string[]): string[] {
  return Array.from(new Set(playerIds.filter(Boolean)));
}

function isPlayerRow(player: PlayerRow | undefined): player is PlayerRow {
  return Boolean(player);
}

function getCustomFixtureValidationError({
  tournament,
  template,
  selectedUsaPlayerIds,
  selectedEuropePlayerIds,
  frontNinePlayerIds,
  singlesPairs,
}: {
  tournament: TournamentRow | null;
  template: FixtureTemplate;
  selectedUsaPlayerIds: string[];
  selectedEuropePlayerIds: string[];
  frontNinePlayerIds: string[];
  singlesPairs: SinglesPairDraft[];
}): string | null {
  if (!tournament) return 'Create an active tournament before creating fixtures.';
  const selectedPlayerIds = [...selectedUsaPlayerIds, ...selectedEuropePlayerIds];
  const completePairs = singlesPairs.filter((pair) => pair.usaPlayerId && pair.europePlayerId);

  if (new Set(selectedPlayerIds).size !== selectedPlayerIds.length) {
    return 'A player can only appear once in a fixture.';
  }

  switch (template) {
    case 'full_18_singles':
      if (selectedUsaPlayerIds.length !== 1 || selectedEuropePlayerIds.length !== 1) {
        return 'Select two players for the full-18 singles match.';
      }

      {
        const singlesError = getSinglesPairValidationError(
          selectedUsaPlayerIds,
          selectedEuropePlayerIds,
          singlesPairs
        );
        if (singlesError) return singlesError;
      }

      if (completePairs.length !== 1) {
        return 'The full-18 singles fixture needs one match.';
      }

      return null;
    case 'standard_4_player':
      if (selectedUsaPlayerIds.length !== 2 || selectedEuropePlayerIds.length !== 2) {
        return 'Select exactly 2 USA players and 2 Europe players.';
      }

      {
        const singlesError = getSinglesPairValidationError(
          selectedUsaPlayerIds,
          selectedEuropePlayerIds,
          singlesPairs
        );
        if (singlesError) return singlesError;
      }

      if (completePairs.length !== 2) {
        return 'Add exactly two back-nine singles matches.';
      }

      return null;
    case 'flexible_6_player': {
      if (selectedUsaPlayerIds.length !== 3 || selectedEuropePlayerIds.length !== 3) {
        return 'Fixture group needs exactly 3 USA players and 3 Europe players.';
      }

      if (frontNinePlayerIds.length !== 4) {
        return 'Pick the front-nine foursomes subset: 2 USA and 2 Europe from this group.';
      }

      const frontNineUsaCount = frontNinePlayerIds.filter((playerId) =>
        selectedUsaPlayerIds.includes(playerId)
      ).length;
      const frontNineEuropeCount = frontNinePlayerIds.filter((playerId) =>
        selectedEuropePlayerIds.includes(playerId)
      ).length;

      if (frontNineUsaCount !== 2 || frontNineEuropeCount !== 2) {
        return 'Front-nine foursomes need exactly 2 USA and 2 Europe players.';
      }

      {
        const singlesError = getSinglesPairValidationError(
          selectedUsaPlayerIds,
          selectedEuropePlayerIds,
          singlesPairs
        );
        if (singlesError) return singlesError;
      }

      if (completePairs.length !== 3) {
        return 'Add exactly three back-nine singles matches.';
      }

      return null;
    }
    default: {
      const exhaustiveCheck: never = template;
      return exhaustiveCheck;
    }
  }

  return null;
}

function getSinglesPairValidationError(
  selectedUsaPlayerIds: string[],
  selectedEuropePlayerIds: string[],
  singlesPairs: SinglesPairDraft[]
): string | null {
  if (singlesPairs.some((pair) => Boolean(pair.usaPlayerId) !== Boolean(pair.europePlayerId))) {
    return 'Complete or clear each singles pairing.';
  }

  const completePairs = singlesPairs.filter((pair) => pair.usaPlayerId && pair.europePlayerId);
  const singlesPlayerIds = completePairs.flatMap((pair) => [pair.usaPlayerId, pair.europePlayerId]);

  if (
    completePairs.some(
      (pair) =>
        !selectedUsaPlayerIds.includes(pair.usaPlayerId) ||
        !selectedEuropePlayerIds.includes(pair.europePlayerId)
    )
  ) {
    return 'Singles players must be selected in this fixture.';
  }

  if (new Set(singlesPlayerIds).size !== singlesPlayerIds.length) {
    return 'A player can only appear in one singles match.';
  }

  return null;
}
