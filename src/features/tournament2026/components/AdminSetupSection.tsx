import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createPlayer2026,
  createQuickFourBallFixture,
  createTournament2026,
  type PlayerRow,
  type Team,
  type Tournament2026Data,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
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
