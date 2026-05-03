import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import type { CourseHoleMetadata } from '../../../domain/2026/course';
import {
  clearFixtureScores2026,
  completeTournament2026,
  createCustomFixture2026,
  createPlayer2026,
  createTournament2026,
  deleteFixture2026,
  reopenTournament2026,
  updateCourseHole2026,
  updateFixture2026,
  updatePlayer2026,
  updateSegment2026,
  updateTournament2026,
  type FixtureView,
  type PlayerRow,
  type Team,
  type Tournament2026Data,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
import { getErrorMessage } from '../viewUtils';
import { PlayerSelect, SubmitButton, TextField } from './FormControls';
import { Panel, SetupForm, StatusCard } from './Layout';

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
    <Panel title="Admin" eyebrow="Tournament operations">
      <p className="text-sm leading-6 text-[#A1A1AA]">
        Work top-to-bottom: create or edit the tournament, keep players tidy, build fixtures, then use corrections only when setup mistakes need fixing.
      </p>
      <div className="-mx-4 mt-4 sm:mx-0">
        <AdminTaskSection
          title="Tournament"
          description="Create the active event, edit CPI settings, and finalize or reopen when scoring is done."
          defaultOpen
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <TournamentForm onSaved={onSaved} />
            <TournamentCorrections
              tournament={data.activeTournament}
              fixtures={data.fixtures}
              players={data.players}
              profileId={data.profile.id}
              onSaved={onSaved}
            />
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
          description="Add players and correct names, teams, or current CPI values. Profile links live in Profile."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <PlayerForm onSaved={onSaved} />
            <PlayerCorrections players={data.players} onSaved={onSaved} />
          </div>
        </AdminTaskSection>
        <AdminTaskSection
          title="Fixtures"
          description="Create the next scoring group. Choose 1v1 for a full-course singles match or team fixture for front-nine foursomes plus back-nine singles."
          defaultOpen={Boolean(data.activeTournament) && data.fixtures.length === 0}
        >
        <CustomFixtureForm
          tournament={data.activeTournament}
          players={data.players}
          fixtureCount={data.fixtures.length}
          onSaved={onSaved}
        />
        </AdminTaskSection>
        <AdminTaskSection
          title="Course"
          description="Maintain hole par and yardage metadata used by score entry."
        >
          <CourseMetadataCorrections courseHoles={data.courseHoles} onSaved={onSaved} />
        </AdminTaskSection>
        <AdminTaskSection
          title="Corrections"
          description="Fix fixture mistakes, clear accidental score rows, or delete bad fixtures. Destructive actions ask for confirmation."
        >
          <CorrectionPanel
            tournament={data.activeTournament}
            fixtures={data.fixtures}
            players={data.players}
            onSaved={onSaved}
          />
        </AdminTaskSection>
      </div>
    </Panel>
  );
}

function AdminTaskSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="border-t border-[#27272A] bg-[#050505] first:border-t-0">
      <summary className="cursor-pointer list-none px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold tracking-[-0.06em] text-[#FAFAFA]">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">{description}</p>
          </div>
          <span className="shrink-0 border border-[#27272A] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#8B949E]">
            Open
          </span>
        </div>
      </summary>
      <div className="border-t border-[#27272A] px-4 py-4">{children}</div>
    </details>
  );
}

function TournamentForm({ onSaved }: { onSaved: () => Promise<void> }) {
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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SetupForm title="Create Active Tournament" onSubmit={handleSubmit} error={error}>
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Year" value={year} onChange={setYear} type="number" />
      <TextField label="CPI threshold" value={threshold} onChange={setThreshold} type="number" />
      <SubmitButton isSaving={isSaving}>Create tournament</SubmitButton>
    </SetupForm>
  );
}

function PlayerForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState<Team>('USA');
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
      });
      track2026('player_created', { team });
      setName('');
      setCpi('');
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SetupForm title="Add Player" onSubmit={handleSubmit} error={error}>
      <TextField label="Name" value={name} onChange={setName} />
      <label className="font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
        Team
        <select
          value={team}
          onChange={(event) => setTeam(event.target.value as Team)}
          className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
        >
          <option value="USA">USA</option>
          <option value="EUROPE">Europe</option>
        </select>
      </label>
      <TextField label="Current CPI" value={cpi} onChange={setCpi} type="number" />
      <SubmitButton isSaving={isSaving}>Add player</SubmitButton>
    </SetupForm>
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
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#3FB950]">Finalization</p>
      <div className="mt-3 border-y border-[#27272A] bg-[#050505] px-3 py-3 sm:rounded-md sm:border">
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
              className="min-h-11 rounded-md border border-[#F59E0B] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#F59E0B] disabled:border-[#27272A] disabled:text-[#484F58]"
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
              className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
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

function CorrectionPanel({
  tournament,
  players,
  fixtures,
  onSaved,
}: {
  tournament: TournamentRow | null;
  players: PlayerRow[];
  fixtures: FixtureView[];
  onSaved: () => Promise<void>;
}) {
  return (
    <FixtureCorrections tournament={tournament} fixtures={fixtures} players={players} onSaved={onSaved} />
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
    <div className="border-y border-[#27272A] bg-[#050505] sm:rounded-md sm:border">
      <div className="px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B949E]">Course</p>
        <p className="mt-1 text-xs leading-5 text-[#8B949E]">Set par and yardage for score-entry context.</p>
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanged = par !== (hole.par?.toString() ?? '') || yardage !== (hole.yardage?.toString() ?? '');

  useEffect(() => {
    setPar(hole.par?.toString() ?? '');
    setYardage(hole.yardage?.toString() ?? '');
  }, [hole]);

  const saveHole = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateCourseHole2026({
        holeNumber: hole.holeNumber,
        strokeIndex: hole.strokeIndex,
        par: par ? Number(par) : null,
        yardage: yardage ? Number(yardage) : null,
      });
      track2026('course_hole_updated', { hole_number: hole.holeNumber });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-3 py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-data text-sm font-bold text-[#FAFAFA]">H{hole.holeNumber}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8B949E]">SI {hole.strokeIndex}</p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <TextField label="Par" value={par} onChange={setPar} type="number" />
          <TextField label="Yards" value={yardage} onChange={setYardage} type="number" />
        </div>
        <button
          type="button"
          onClick={saveHole}
          disabled={!hasChanged || isSaving}
          className="min-h-10 rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-y border-[#27272A] bg-[#050505] sm:rounded-md sm:border">
      <div className="px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B949E]">Tournament</p>
      </div>
      {!tournament ? (
        <p className="border-t border-[#27272A] px-3 py-3 text-sm text-[#8B949E]">
          No active tournament yet.
        </p>
      ) : (
        <div className="border-t border-[#27272A] px-3 py-3">
          {tournament.is_complete && (
            <p className="mb-3 text-xs text-[#F59E0B]">Tournament is complete, so details are locked.</p>
          )}
          <div className="grid gap-2">
            <TextField label="Name" value={name} onChange={setName} />
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <TextField label="Year" value={year} onChange={setYear} type="number" />
              <TextField label="CPI threshold" value={threshold} onChange={setThreshold} type="number" />
              <button
                type="button"
                onClick={saveTournament}
                disabled={!hasChanged || isSaving || tournament.is_complete}
                className="min-h-10 rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
              >
                {isSaving ? 'Saving' : 'Save'}
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
        </div>
      )}
    </div>
  );
}

function PlayerCorrections({
  players,
  onSaved,
}: {
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  return (
    <div className="border-y border-[#27272A] bg-[#050505] sm:rounded-md sm:border">
      <div className="px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B949E]">Players</p>
      </div>
      {players.length === 0 ? (
        <p className="border-t border-[#27272A] px-3 py-3 text-sm text-[#8B949E]">No players yet.</p>
      ) : (
        players.map((player) => (
          <PlayerCorrectionRow key={player.id} player={player} onSaved={onSaved} />
        ))
      )}
    </div>
  );
}

function PlayerCorrectionRow({
  player,
  onSaved,
}: {
  player: PlayerRow;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(player.name);
  const [team, setTeam] = useState<Team>(player.team);
  const [cpi, setCpi] = useState(player.current_cpi?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanged =
    name !== player.name ||
    team !== player.team ||
    cpi !== (player.current_cpi?.toString() ?? '');

  useEffect(() => {
    setName(player.name);
    setTeam(player.team);
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
      });
      track2026('player_updated', { player_id: player.id });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-3 py-3">
      <div className="grid gap-2">
        <TextField label="Name" value={name} onChange={setName} />
        <div className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
          <label className="font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
            Team
            <select
              value={team}
              onChange={(event) => setTeam(event.target.value as Team)}
              className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
            >
              <option value="USA">USA</option>
              <option value="EUROPE">Europe</option>
            </select>
          </label>
          <TextField label="CPI" value={cpi} onChange={setCpi} type="number" />
          <button
            type="button"
            onClick={savePlayer}
            disabled={!hasChanged || isSaving}
            className="min-h-10 rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            {isSaving ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

function FixtureCorrections({
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
  return (
    <div className="border-y border-[#27272A] bg-[#050505] sm:rounded-md sm:border">
      <div className="px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B949E]">Fixtures</p>
      </div>
      {fixtures.length === 0 ? (
        <p className="border-t border-[#27272A] px-3 py-3 text-sm text-[#8B949E]">No fixtures yet.</p>
      ) : (
        fixtures.map((fixture) => (
          <FixtureCorrectionRow
            key={fixture.id}
            tournament={tournament}
            fixture={fixture}
            players={players}
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
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixture: FixtureView;
  players: PlayerRow[];
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
    if (!window.confirm(`Clear all saved scores for ${fixture.name ?? 'this fixture'}?`)) {
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
    if (!window.confirm(`Delete ${fixture.name ?? 'this fixture'} and all its scores?`)) {
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
            className="min-h-10 rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={clearScores}
            disabled={isSaving || scoreCount === 0}
            className="min-h-10 rounded-md border border-[#F59E0B] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#F59E0B] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            Clear scores
          </button>
          <button
            type="button"
            onClick={deleteFixture}
            disabled={isSaving}
            className="min-h-10 rounded-md border border-[#F85149] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#F85149] disabled:opacity-60"
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
  onSaved,
}: {
  tournament: TournamentRow | null;
  fixture: FixtureView;
  segment: FixtureView['segments'][number];
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  const fixturePlayerIds = new Set(fixture.participants.map((participant) => participant.player_id));
  const fixturePlayers = players.filter((player) => fixturePlayerIds.has(player.id));
  const usaPlayers = fixturePlayers.filter((player) => player.team === 'USA');
  const europePlayers = fixturePlayers.filter((player) => player.team === 'EUROPE');
  const hasScores = segment.holeScores.length > 0;
  const [name, setName] = useState(segment.name ?? '');
  const [usaPlayerId, setUsaPlayerId] = useState(segment.usa_player_id ?? '');
  const [europePlayerId, setEuropePlayerId] = useState(segment.europe_player_id ?? '');
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

  return (
    <div className="border-t border-[#27272A] pt-3">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B949E]">
            {segment.kind} · Holes {segment.hole_start}-{segment.hole_end}
          </p>
          {hasScores && (
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#F59E0B]">
              {segment.holeScores.length} scores
            </span>
          )}
        </div>
        <TextField label="Segment name" value={name} onChange={setName} />
        {segment.kind === 'singles' && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <PlayerSelect
                label="USA"
                value={usaPlayerId}
                players={usaPlayers}
                onChange={setUsaPlayerId}
              />
              <PlayerSelect
                label="Europe"
                value={europePlayerId}
                players={europePlayers}
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
          className="min-h-10 rounded-md border border-[#3FB950] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
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

type FixtureBuilderMode = 'team_fixture' | 'one_vs_one';

function CustomFixtureForm({
  tournament,
  players,
  fixtureCount,
  onSaved,
}: {
  tournament: TournamentRow | null;
  players: PlayerRow[];
  fixtureCount: number;
  onSaved: () => Promise<void>;
}) {
  const usaPlayers = useMemo(() => players.filter((player) => player.team === 'USA'), [players]);
  const europePlayers = useMemo(
    () => players.filter((player) => player.team === 'EUROPE'),
    [players]
  );
  const [name, setName] = useState('');
  const [mode, setMode] = useState<FixtureBuilderMode>('team_fixture');
  const [usaSlots, setUsaSlots] = useState<string[]>(['', '', '']);
  const [europeSlots, setEuropeSlots] = useState<string[]>(['', '', '']);
  const [oneVsOneSideAPlayerId, setOneVsOneSideAPlayerId] = useState('');
  const [oneVsOneSideBPlayerId, setOneVsOneSideBPlayerId] = useState('');
  const [oneVsOneCpiEnabled, setOneVsOneCpiEnabled] = useState(true);
  const [frontNinePlayerIds, setFrontNinePlayerIds] = useState<string[]>([]);
  const [singlesPairs, setSinglesPairs] = useState<SinglesPairDraft[]>([
    { usaPlayerId: '', europePlayerId: '', cpiEnabled: true },
    { usaPlayerId: '', europePlayerId: '', cpiEnabled: true },
    { usaPlayerId: '', europePlayerId: '', cpiEnabled: true },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOneVsOneFixture = mode === 'one_vs_one';
  const selectedUsaPlayerIds = useMemo(
    () => (isOneVsOneFixture ? compactUnique([oneVsOneSideAPlayerId]) : compactUnique(usaSlots)),
    [isOneVsOneFixture, oneVsOneSideAPlayerId, usaSlots]
  );
  const selectedEuropePlayerIds = useMemo(
    () =>
      isOneVsOneFixture
        ? compactUnique([oneVsOneSideBPlayerId])
        : compactUnique(europeSlots),
    [europeSlots, isOneVsOneFixture, oneVsOneSideBPlayerId]
  );
  const selectedPlayerIds = useMemo(
    () => [...selectedUsaPlayerIds, ...selectedEuropePlayerIds],
    [selectedEuropePlayerIds, selectedUsaPlayerIds]
  );
  const selectedPlayers = useMemo(
    () => selectedPlayerIds.map((playerId) => players.find((player) => player.id === playerId)).filter(isPlayerRow),
    [players, selectedPlayerIds]
  );
  const activeSinglesPairs = isOneVsOneFixture
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
    mode,
    selectedUsaPlayerIds,
    selectedEuropePlayerIds,
    frontNinePlayerIds: isOneVsOneFixture ? [] : frontNinePlayerIds,
    singlesPairs: activeSinglesPairs,
  });
  const isReady = !validationError;

  useEffect(() => {
    setUsaSlots((current) => fillEmptySlots(current, usaPlayers));
    setEuropeSlots((current) => fillEmptySlots(current, europePlayers));
  }, [europePlayers, usaPlayers]);

  useEffect(() => {
    setFrontNinePlayerIds((current) => {
      if (isOneVsOneFixture) {
        return [];
      }

      const retained = current.filter((playerId) => selectedPlayerIds.includes(playerId));
      const added = selectedPlayerIds.filter((playerId) => !retained.includes(playerId));

      return [...retained, ...added];
    });
  }, [isOneVsOneFixture, selectedPlayerIds]);

  useEffect(() => {
    if (isOneVsOneFixture) {
      return;
    }

    setSinglesPairs((current) =>
      current.map((pair, index) => ({
        ...pair,
        usaPlayerId: selectedUsaPlayerIds.includes(pair.usaPlayerId)
          ? pair.usaPlayerId
          : selectedUsaPlayerIds[index] || '',
        europePlayerId: selectedEuropePlayerIds.includes(pair.europePlayerId)
          ? pair.europePlayerId
          : selectedEuropePlayerIds[index] || '',
      }))
    );
  }, [isOneVsOneFixture, selectedEuropePlayerIds, selectedUsaPlayerIds]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tournament || validationError) return;

    setIsSaving(true);
    setError(null);

    try {
      await createCustomFixture2026({
        tournamentId: tournament.id,
        name: name || `Fixture ${fixtureCount + 1}`,
        usaPlayerIds: selectedUsaPlayerIds,
        europePlayerIds: selectedEuropePlayerIds,
        frontNinePlayerIds: isOneVsOneFixture ? [] : frontNinePlayerIds,
        singlesPairs: completeSinglesPairs,
        sortOrder: fixtureCount,
      });
      track2026('fixture_created', {
        fixture_mode: mode,
        player_count: selectedPlayerIds.length,
        singles_count: completeSinglesPairs.length,
      });
      setName('');
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SetupForm title="Mobile Fixture Builder" onSubmit={handleSubmit} error={error}>
      {validationError && <StatusCard tone="warning">{validationError}</StatusCard>}
      <TextField label="Fixture name" value={name} onChange={setName} />
      <FixtureModePicker mode={mode} onChange={setMode} />
      {isOneVsOneFixture ? (
        <OneVsOnePicker
          players={players}
          sideAPlayerId={oneVsOneSideAPlayerId}
          sideBPlayerId={oneVsOneSideBPlayerId}
          cpiEnabled={oneVsOneCpiEnabled}
          onSideAPlayerChange={setOneVsOneSideAPlayerId}
          onSideBPlayerChange={setOneVsOneSideBPlayerId}
          onCpiEnabledChange={setOneVsOneCpiEnabled}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <TeamSlotPicker
            label="USA slots"
            players={usaPlayers}
            slots={usaSlots}
            onChange={setUsaSlots}
          />
          <TeamSlotPicker
            label="Europe slots"
            players={europePlayers}
            slots={europeSlots}
            onChange={setEuropeSlots}
          />
        </div>
      )}
      {isOneVsOneFixture ? (
        <StatusCard>
          1v1 full course selected. This creates one 18-hole singles match and skips front-nine foursomes.
        </StatusCard>
      ) : (
        <FrontNinePicker
          players={selectedPlayers}
          selectedPlayerIds={frontNinePlayerIds}
          onChange={setFrontNinePlayerIds}
        />
      )}
      {!isOneVsOneFixture && (
        <SinglesPairPicker
          usaPlayers={selectedPlayers.filter((player) => player.team === 'USA')}
          europePlayers={selectedPlayers.filter((player) => player.team === 'EUROPE')}
          pairs={singlesPairs}
          onChange={setSinglesPairs}
        />
      )}
      <FixturePreview
        selectedPlayers={selectedPlayers}
        frontNinePlayerIds={isOneVsOneFixture ? [] : frontNinePlayerIds}
        singlesPairs={completeSinglesPairs}
        isOneVsOneFixture={isOneVsOneFixture}
      />
      <SubmitButton isSaving={isSaving} disabled={!isReady}>
        Create fixture
      </SubmitButton>
    </SetupForm>
  );
}

function FixtureModePicker({
  mode,
  onChange,
}: {
  mode: FixtureBuilderMode;
  onChange: (mode: FixtureBuilderMode) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <FixtureModeButton
        label="Team fixture"
        description="Front-nine foursomes plus back-nine singles"
        isSelected={mode === 'team_fixture'}
        onClick={() => onChange('team_fixture')}
      />
      <FixtureModeButton
        label="1v1 full course"
        description="Any two players, one 18-hole singles match"
        isSelected={mode === 'one_vs_one'}
        onClick={() => onChange('one_vs_one')}
      />
    </div>
  );
}

function FixtureModeButton({
  label,
  description,
  isSelected,
  onClick,
}: {
  label: string;
  description: string;
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
      <span className="block text-xs font-bold uppercase tracking-[0.14em]">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-[#8B949E]">{description}</span>
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
  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B949E]">1v1 players</p>
      <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
        Pick any two players. Side A and Side B are the two scoring sides for this match.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PlayerSelect label="Side A" value={sideAPlayerId} players={players} onChange={onSideAPlayerChange} />
        <PlayerSelect label="Side B" value={sideBPlayerId} players={players} onChange={onSideBPlayerChange} />
      </div>
      <button
        type="button"
        onClick={() => onCpiEnabledChange(!cpiEnabled)}
        className={`mt-3 rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
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
  onChange,
}: {
  label: string;
  players: PlayerRow[];
  slots: string[];
  onChange: (slots: string[]) => void;
}) {
  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B949E]">{label}</p>
      <div className="mt-2 space-y-2">
        {slots.map((playerId, index) => (
          <PlayerSelect
            key={index}
            label={`Slot ${index + 1}`}
            value={playerId}
            players={players}
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
  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B949E]">Front 9 players</p>
      <div className="mt-2 grid gap-2">
        {players.map((player) => {
          const isSelected = selectedPlayerIds.includes(player.id);

          return (
            <button
              key={player.id}
              type="button"
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
                  : 'border-[#27272A] text-[#A1A1AA]'
              }`}
            >
              {player.team} · {player.name}
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
  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B949E]">Back 9 singles</p>
      <div className="mt-2 space-y-3">
        {pairs.map((pair, index) => (
          <div key={index} className="rounded-md border border-[#27272A] bg-[#18181B] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A1A1AA]">
              Singles {String.fromCharCode(65 + index)}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <PlayerSelect
                label="USA"
                value={pair.usaPlayerId}
                players={usaPlayers}
                onChange={(usaPlayerId) => updatePair(pairs, index, { usaPlayerId }, onChange)}
              />
              <PlayerSelect
                label="Europe"
                value={pair.europePlayerId}
                players={europePlayers}
                onChange={(europePlayerId) => updatePair(pairs, index, { europePlayerId }, onChange)}
              />
            </div>
            <button
              type="button"
              onClick={() => updatePair(pairs, index, { cpiEnabled: !pair.cpiEnabled }, onChange)}
              className={`mt-3 rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
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
  selectedPlayers,
  frontNinePlayerIds,
  singlesPairs,
  isOneVsOneFixture,
}: {
  selectedPlayers: PlayerRow[];
  frontNinePlayerIds: string[];
  singlesPairs: SinglesPairDraft[];
  isOneVsOneFixture?: boolean;
}) {
  const playerLookup = new Map(selectedPlayers.map((player) => [player.id, player]));

  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B949E]">Preview</p>
      <p className="mt-2 text-sm text-[#E6EDF3]">
        {selectedPlayers.length} players ·{' '}
        {isOneVsOneFixture
          ? '18-hole singles'
          : frontNinePlayerIds.length > 0
          ? `${frontNinePlayerIds.length} front-nine players`
          : 'singles-only'}{' '}
        · {singlesPairs.length} singles
      </p>
      <div className="mt-2 space-y-1 text-xs text-[#A1A1AA]">
        {singlesPairs.map((pair, index) => (
          <p key={`${pair.usaPlayerId}-${pair.europePlayerId}-${index}`}>
            {String.fromCharCode(65 + index)}: {playerLookup.get(pair.usaPlayerId)?.name ?? 'USA'} vs{' '}
            {playerLookup.get(pair.europePlayerId)?.name ?? 'Europe'} · CPI{' '}
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

function fillEmptySlots(currentSlots: string[], players: PlayerRow[]): string[] {
  return currentSlots.map((playerId, index) => playerId || players[index]?.id || '');
}

function compactUnique(playerIds: string[]): string[] {
  return Array.from(new Set(playerIds.filter(Boolean)));
}

function isPlayerRow(player: PlayerRow | undefined): player is PlayerRow {
  return Boolean(player);
}

function getCustomFixtureValidationError({
  tournament,
  mode,
  selectedUsaPlayerIds,
  selectedEuropePlayerIds,
  frontNinePlayerIds,
  singlesPairs,
}: {
  tournament: TournamentRow | null;
  mode: FixtureBuilderMode;
  selectedUsaPlayerIds: string[];
  selectedEuropePlayerIds: string[];
  frontNinePlayerIds: string[];
  singlesPairs: SinglesPairDraft[];
}): string | null {
  if (!tournament) return 'Create an active tournament before creating fixtures.';
  if (selectedUsaPlayerIds.length === 0 || selectedEuropePlayerIds.length === 0) {
    return mode === 'one_vs_one'
      ? 'Select two players for the 1v1 match.'
      : 'Select at least one player per team.';
  }
  if (selectedUsaPlayerIds.length + selectedEuropePlayerIds.length > 6) {
    return 'A fixture can have at most six players.';
  }

  const completePairs = singlesPairs.filter((pair) => pair.usaPlayerId && pair.europePlayerId);

  if (completePairs.length === 0) {
    return mode === 'one_vs_one'
      ? 'Select two players for the 1v1 match.'
      : 'Add at least one back-nine singles match.';
  }

  if (singlesPairs.some((pair) => Boolean(pair.usaPlayerId) !== Boolean(pair.europePlayerId))) {
    return 'Complete or clear each singles pairing.';
  }

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

  const isOneVsOneFixture = mode === 'one_vs_one';

  if (!isOneVsOneFixture && frontNinePlayerIds.length < 2) {
    return 'Select at least two front-nine players.';
  }

  const frontNineTeams = new Set([
    ...frontNinePlayerIds.filter((playerId) => selectedUsaPlayerIds.includes(playerId)).map(() => 'USA'),
    ...frontNinePlayerIds.filter((playerId) => selectedEuropePlayerIds.includes(playerId)).map(() => 'EUROPE'),
  ]);

  if (!isOneVsOneFixture && (!frontNineTeams.has('USA') || !frontNineTeams.has('EUROPE'))) {
    return 'Front-nine scoring needs at least one player from each team.';
  }

  return null;
}
