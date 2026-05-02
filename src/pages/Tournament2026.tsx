import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase';
import {
  createOwnProfile,
  createPlayer2026,
  createQuickFourBallFixture,
  createTournament2026,
  fetchTournament2026Data,
  saveHoleScore2026,
  subscribeToTournament2026Changes,
} from '../services/tournament2026Queries';
import type {
  FixtureView,
  HoleScoreRow,
  PlayerRow,
  ProfileRow,
  SegmentView,
  Team,
  Tournament2026Data,
  TournamentRow,
} from '../services/tournament2026Queries';

interface TeamScore {
  USA: number;
  EUROPE: number;
  halved: number;
  unplayed: number;
}

export default function Tournament2026() {
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Tournament2026Data | null>(null);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configStatus.isConfigured);

  const refreshData = useCallback(async () => {
    if (!configStatus.isConfigured) return;

    try {
      setError(null);
      const nextData = await fetchTournament2026Data();
      setData(nextData);
      setUser(nextData.user);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [configStatus.isConfigured]);

  useEffect(() => {
    if (!configStatus.isConfigured) {
      setIsLoading(false);
      return;
    }

    const client = getSupabaseClient();

    client.auth.getUser().then(({ data: userData }) => {
      setUser(userData.user);
      void refreshData();
    });

    const { data: authListener } = client.auth.onAuthStateChange(() => {
      void refreshData();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [configStatus.isConfigured, refreshData]);

  useEffect(() => {
    if (!configStatus.isConfigured || !user) return undefined;

    return subscribeToTournament2026Changes(() => {
      void refreshData();
    });
  }, [configStatus.isConfigured, refreshData, user]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);

    try {
      const { error: signInError } = await getSupabaseClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/2026`,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setNotice('Check your email for the Supabase sign-in link.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    setData(null);
    setUser(null);
  };

  if (!configStatus.isConfigured) {
    return (
      <PageShell>
        <StatusCard tone="warning">
          Missing Supabase environment variables: {configStatus.missingKeys.join(', ')}.
        </StatusCard>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <StatusCard>Loading the 2026 tournament console...</StatusCard>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <Panel title="Supabase Sign In" eyebrow="2026 rebuild">
          <p className="text-sm text-chalk-300">
            The 2026 screens use Supabase Auth and Supabase RLS. Sign in here before using the
            new admin, scoring, leaderboard, or history views.
          </p>
          <form onSubmit={handleSignIn} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-xl border border-chalk-700 bg-ink-950 px-3 py-2 text-chalk-50"
            />
            <button type="submit" className="rounded-xl bg-fairway-500 px-4 py-2 font-semibold text-ink-950">
              Send Link
            </button>
          </form>
          {notice && <StatusCard tone="success">{notice}</StatusCard>}
          {error && <StatusCard tone="error">{error}</StatusCard>}
        </Panel>
      </PageShell>
    );
  }

  if (!data?.profile) {
    return (
      <PageShell userEmail={user.email} onSignOut={handleSignOut}>
        <CreateProfilePanel onSaved={refreshData} />
        {error && <StatusCard tone="error">{error}</StatusCard>}
      </PageShell>
    );
  }

  return (
    <PageShell userEmail={user.email} onSignOut={handleSignOut}>
      {error && <StatusCard tone="error">{error}</StatusCard>}
      <Hero tournament={data.activeTournament} profile={data.profile} />
      <LeaderboardSection fixtures={data.fixtures} />
      <ScoreEntrySection
        tournament={data.activeTournament}
        fixtures={data.fixtures}
        players={data.players}
        profile={data.profile}
        onSaved={refreshData}
      />
      <AdminSetupSection data={data} onSaved={refreshData} />
      <HistorySection history={data.history} />
    </PageShell>
  );
}

function PageShell({
  children,
  userEmail,
  onSignOut,
}: {
  children: ReactNode;
  userEmail?: string | null;
  onSignOut?: () => void;
}) {
  return (
    <div className="min-h-screen bg-ink-950 text-chalk-50">
      <header className="border-b border-chalk-800 bg-ink-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-fairway-300">Ruff Ryders Cup</p>
            <h1 className="font-display text-2xl font-bold">2026 Tournament Console</h1>
          </div>
          {userEmail && (
            <div className="flex items-center gap-3 text-sm text-chalk-300">
              <span className="hidden sm:inline">{userEmail}</span>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-full border border-chalk-700 px-3 py-1 text-chalk-100 hover:border-fairway-400"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}

function Hero({
  tournament,
  profile,
}: {
  tournament: TournamentRow | null;
  profile: ProfileRow;
}) {
  return (
    <section className="rounded-3xl border border-fairway-700/60 bg-gradient-to-br from-fairway-950 to-ink-900 p-6 shadow-xl">
      <p className="text-sm uppercase tracking-[0.28em] text-fairway-300">
        {profile.is_admin ? 'Admin access' : 'Player access'}
      </p>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold">
            {tournament ? tournament.name : 'No Active Tournament'}
          </h2>
          <p className="mt-2 max-w-2xl text-chalk-300">
            Foursomes on holes 1-9, singles on holes 10-18, match play only. CPI only applies
            to qualifying back-nine singles.
          </p>
        </div>
        {tournament && (
          <div className="rounded-2xl border border-chalk-700 bg-ink-950/60 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-chalk-400">CPI threshold</p>
            <p className="font-data text-3xl font-bold text-pin-300">{tournament.cpi_threshold}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function LeaderboardSection({ fixtures }: { fixtures: FixtureView[] }) {
  const totals = calculateTotals(fixtures);

  return (
    <Panel title="Live Leaderboard" eyebrow="Supabase realtime">
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreTile label="Overall" score={totals.overall} />
        <ScoreTile label="Foursomes" score={totals.foursomes} />
        <ScoreTile label="Singles" score={totals.singles} />
      </div>
    </Panel>
  );
}

function ScoreTile({ label, score }: { label: string; score: TeamScore }) {
  return (
    <div className="rounded-2xl border border-chalk-800 bg-ink-950 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-chalk-400">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <TeamTotal label="USA" value={score.USA} className="text-team-usa-300" />
        <TeamTotal label="Europe" value={score.EUROPE} className="text-team-europe-300" />
      </div>
      <p className="mt-3 text-xs text-chalk-400">
        {score.halved} halved, {score.unplayed} unplayed
      </p>
    </div>
  );
}

function TeamTotal({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-chalk-500">{label}</p>
      <p className={`font-data text-4xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

function ScoreEntrySection({
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
            <h3 className="font-display text-xl font-semibold">{fixture.name ?? `Fixture ${fixture.sort_order + 1}`}</h3>
            <p className="mt-1 text-sm text-chalk-400">{formatParticipants(fixture.participants)}</p>
            <div className="mt-4 space-y-4">
              {fixture.segments.map((segment) => (
                <SegmentScoreCard
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
  onSaved,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  profile: ProfileRow;
  onSaved: () => Promise<void>;
}) {
  const holes = createHoleRange(segment.hole_start, segment.hole_end);

  return (
    <div className="rounded-xl border border-chalk-800 bg-ink-900 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-semibold">{segment.name ?? formatSegmentKind(segment.kind)}</h4>
          <p className="text-sm text-chalk-400">{formatSegmentMatchup(segment, players)}</p>
        </div>
        <span className="rounded-full border border-chalk-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-chalk-300">
          Holes {segment.hole_start}-{segment.hole_end}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {holes.map((holeNumber) => {
          const score = segment.holeScores.find((row) => row.hole_number === holeNumber) ?? null;

          return (
            <HoleScoreForm
              key={holeNumber}
              tournament={tournament}
              segment={segment}
              players={players}
              profile={profile}
              holeNumber={holeNumber}
              score={score}
              onSaved={onSaved}
            />
          );
        })}
      </div>
    </div>
  );
}

function HoleScoreForm({
  tournament,
  segment,
  players,
  profile,
  holeNumber,
  score,
  onSaved,
}: {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  profile: ProfileRow;
  holeNumber: number;
  score: HoleScoreRow | null;
  onSaved: () => Promise<void>;
}) {
  const [usaScore, setUsaScore] = useState(score?.usa_score?.toString() ?? '');
  const [europeScore, setEuropeScore] = useState(score?.europe_score?.toString() ?? '');
  const [strokeIndex, setStrokeIndex] = useState((score?.stroke_index ?? holeNumber).toString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsaScore(score?.usa_score?.toString() ?? '');
    setEuropeScore(score?.europe_score?.toString() ?? '');
    setStrokeIndex((score?.stroke_index ?? holeNumber).toString());
  }, [holeNumber, score]);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      await saveHoleScore2026({
        tournament,
        segment,
        players,
        holeNumber,
        strokeIndex: Number(strokeIndex),
        usaScore: parseOptionalPositiveInteger(usaScore),
        europeScore: parseOptionalPositiveInteger(europeScore),
        updatedBy: profile.id,
      });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-chalk-800 bg-ink-950 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[4rem_1fr_1fr_6rem_auto] sm:items-center">
        <div className="font-data text-lg font-semibold text-chalk-200">H{holeNumber}</div>
        <ScoreInput label="USA" value={usaScore} onChange={setUsaScore} />
        <ScoreInput label="Europe" value={europeScore} onChange={setEuropeScore} />
        <ScoreInput label="SI" value={strokeIndex} onChange={setStrokeIndex} />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="col-span-2 rounded-lg bg-fairway-500 px-3 py-2 text-sm font-semibold text-ink-950 disabled:opacity-60 sm:col-span-1"
        >
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
      {score && (
        <p className="mt-2 text-xs text-chalk-400">
          Result: {formatOutcome(score.outcome)}
          {score.cpi_applied ? `, CPI ${score.cpi_difference} applied` : ''}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-pin-300">{error}</p>}
    </div>
  );
}

function AdminSetupSection({
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
    <Panel title="Admin Setup" eyebrow="Tournament setup">
      <div className="grid gap-4 lg:grid-cols-3">
        <TournamentForm onSaved={onSaved} />
        <PlayerForm onSaved={onSaved} />
        <QuickFixtureForm
          tournament={data.activeTournament}
          players={data.players}
          fixtureCount={data.fixtures.length}
          onSaved={onSaved}
        />
      </div>
    </Panel>
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
      <label className="text-sm text-chalk-300">
        Team
        <select
          value={team}
          onChange={(event) => setTeam(event.target.value as Team)}
          className="mt-1 w-full rounded-lg border border-chalk-700 bg-ink-950 px-3 py-2 text-chalk-50"
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

function QuickFixtureForm({
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
  const [usaOne, setUsaOne] = useState('');
  const [usaTwo, setUsaTwo] = useState('');
  const [europeOne, setEuropeOne] = useState('');
  const [europeTwo, setEuropeTwo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isReady = tournament && usaPlayers.length >= 2 && europePlayers.length >= 2;

  useEffect(() => {
    setUsaOne((current) => current || usaPlayers[0]?.id || '');
    setUsaTwo((current) => current || usaPlayers[1]?.id || '');
    setEuropeOne((current) => current || europePlayers[0]?.id || '');
    setEuropeTwo((current) => current || europePlayers[1]?.id || '');
  }, [europePlayers, usaPlayers]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tournament) return;

    setIsSaving(true);
    setError(null);

    try {
      await createQuickFourBallFixture({
        tournamentId: tournament.id,
        name: name || `Fixture ${fixtureCount + 1}`,
        usaPlayerIds: [usaOne, usaTwo],
        europePlayerIds: [europeOne, europeTwo],
        sortOrder: fixtureCount,
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
    <SetupForm title="Quick 4-Ball Fixture" onSubmit={handleSubmit} error={error}>
      {!isReady && <StatusCard tone="warning">Create an active tournament and at least two players per team.</StatusCard>}
      <TextField label="Fixture name" value={name} onChange={setName} />
      <PlayerSelect label="USA 1" value={usaOne} players={usaPlayers} onChange={setUsaOne} />
      <PlayerSelect label="USA 2" value={usaTwo} players={usaPlayers} onChange={setUsaTwo} />
      <PlayerSelect label="Europe 1" value={europeOne} players={europePlayers} onChange={setEuropeOne} />
      <PlayerSelect label="Europe 2" value={europeTwo} players={europePlayers} onChange={setEuropeTwo} />
      <SubmitButton isSaving={isSaving} disabled={!isReady}>
        Create fixture
      </SubmitButton>
    </SetupForm>
  );
}

function CreateProfilePanel({ onSaved }: { onSaved: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await createOwnProfile({ displayName });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel title="Create Supabase Profile" eyebrow="First-time setup">
      <SetupForm title="Profile" onSubmit={handleSubmit} error={error}>
        <TextField label="Display name" value={displayName} onChange={setDisplayName} />
        <SubmitButton isSaving={isSaving}>Create profile</SubmitButton>
      </SetupForm>
    </Panel>
  );
}

function HistorySection({ history }: { history: Tournament2026Data['history'] }) {
  return (
    <Panel title="Historical Results" eyebrow="Legacy Firebase archive">
      {history.length === 0 ? (
        <StatusCard>No historical tournaments have been imported yet.</StatusCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {history.map((tournament) => (
            <div key={tournament.id} className="rounded-2xl border border-chalk-800 bg-ink-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-chalk-500">{tournament.year}</p>
              <h3 className="mt-1 font-display text-xl font-semibold">{tournament.name}</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <HistoryScore
                  label="Raw"
                  usa={tournament.total_raw_usa}
                  europe={tournament.total_raw_europe}
                />
                <HistoryScore
                  label="Legacy adjusted"
                  usa={tournament.total_legacy_adjusted_usa}
                  europe={tournament.total_legacy_adjusted_europe}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function HistoryScore({ label, usa, europe }: { label: string; usa: number; europe: number }) {
  return (
    <div className="rounded-xl border border-chalk-800 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-chalk-500">{label}</p>
      <p className="mt-1 font-data text-lg text-chalk-100">
        USA {usa} - EUR {europe}
      </p>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-chalk-800 bg-ink-900 p-5 shadow-lg">
      <p className="text-xs uppercase tracking-[0.24em] text-fairway-300">{eyebrow}</p>
      <h2 className="mt-1 font-display text-2xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SetupForm({
  title,
  children,
  error,
  onSubmit,
}: {
  title: string;
  children: ReactNode;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-chalk-800 bg-ink-950 p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
      {error && <p className="mt-3 text-sm text-pin-300">{error}</p>}
    </form>
  );
}

function TextField({
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
    <label className="block text-sm text-chalk-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required
        className="mt-1 w-full rounded-lg border border-chalk-700 bg-ink-950 px-3 py-2 text-chalk-50"
      />
    </label>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs uppercase tracking-[0.14em] text-chalk-500">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        min="1"
        className="mt-1 w-full rounded-lg border border-chalk-700 bg-ink-950 px-3 py-2 text-sm text-chalk-50"
      />
    </label>
  );
}

function PlayerSelect({
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
    <label className="block text-sm text-chalk-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-chalk-700 bg-ink-950 px-3 py-2 text-chalk-50"
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

function SubmitButton({
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
      className="w-full rounded-lg bg-fairway-500 px-3 py-2 font-semibold text-ink-950 disabled:opacity-60"
    >
      {isSaving ? 'Saving...' : children}
    </button>
  );
}

function StatusCard({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
}) {
  const toneClass = {
    neutral: 'border-chalk-700 bg-ink-950 text-chalk-200',
    success: 'border-fairway-500/60 bg-fairway-950 text-fairway-200',
    warning: 'border-pin-400/60 bg-pin-950 text-pin-200',
    error: 'border-red-400/60 bg-red-950 text-red-200',
  }[tone];

  return <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${toneClass}`}>{children}</div>;
}

function calculateTotals(fixtures: FixtureView[]): {
  overall: TeamScore;
  foursomes: TeamScore;
  singles: TeamScore;
} {
  const totals = {
    overall: createEmptyScore(),
    foursomes: createEmptyScore(),
    singles: createEmptyScore(),
  };

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      const target = segment.kind === 'foursomes' ? totals.foursomes : totals.singles;

      for (const score of segment.holeScores) {
        applyOutcome(target, score.outcome);
        applyOutcome(totals.overall, score.outcome);
      }
    }
  }

  return totals;
}

function createEmptyScore(): TeamScore {
  return { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 };
}

function applyOutcome(score: TeamScore, outcome: HoleScoreRow['outcome']): void {
  if (outcome === 'USA') {
    score.USA += 1;
  } else if (outcome === 'EUROPE') {
    score.EUROPE += 1;
  } else if (outcome === 'halved') {
    score.halved += 1;
  } else {
    score.unplayed += 1;
  }
}

function createHoleRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function parseOptionalPositiveInteger(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  return Number(value);
}

function formatParticipants(participants: FixtureView['participants']): string {
  return participants
    .map((participant) => `${participant.team}: ${participant.player?.name ?? 'Unknown player'}`)
    .join(' | ');
}

function formatSegmentKind(kind: SegmentView['kind']): string {
  return kind === 'foursomes' ? 'Front 9 Foursomes' : 'Singles Match';
}

function formatSegmentMatchup(segment: SegmentView, players: PlayerRow[]): string {
  if (segment.kind === 'foursomes') {
    const usaPlayers = segment.players
      .filter((player) => player.team === 'USA')
      .map((player) => player.player?.name ?? 'Unknown USA')
      .join(' + ');
    const europePlayers = segment.players
      .filter((player) => player.team === 'EUROPE')
      .map((player) => player.player?.name ?? 'Unknown Europe')
      .join(' + ');

    return `${usaPlayers} vs ${europePlayers}`;
  }

  const playerLookup = new Map(players.map((player) => [player.id, player.name]));
  const usaPlayer = segment.usa_player_id ? playerLookup.get(segment.usa_player_id) : 'USA player';
  const europePlayer = segment.europe_player_id
    ? playerLookup.get(segment.europe_player_id)
    : 'Europe player';

  return `${usaPlayer} vs ${europePlayer}`;
}

function formatOutcome(outcome: HoleScoreRow['outcome']): string {
  if (outcome === 'halved') {
    return 'Halved';
  }

  if (outcome === 'unplayed') {
    return 'Unplayed';
  }

  return `${outcome} wins`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
