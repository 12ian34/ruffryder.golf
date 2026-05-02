import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  clearFixtureScores2026,
  createCustomFixture2026,
  createPlayer2026,
  createTournament2026,
  deleteFixture2026,
  updatePlayer2026,
  type FixtureView,
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
        <CustomFixtureForm
          tournament={data.activeTournament}
          players={data.players}
          fixtureCount={data.fixtures.length}
          onSaved={onSaved}
        />
      </div>
      <CorrectionPanel players={data.players} fixtures={data.fixtures} onSaved={onSaved} />
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

function CorrectionPanel({
  players,
  fixtures,
  onSaved,
}: {
  players: PlayerRow[];
  fixtures: FixtureView[];
  onSaved: () => Promise<void>;
}) {
  return (
    <div className="mt-5 border-t border-[#27272A] pt-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#3FB950]">Corrections</p>
      <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
        Fix setup mistakes from mobile without opening Supabase. Destructive fixture actions require confirmation.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PlayerCorrections players={players} onSaved={onSaved} />
        <FixtureCorrections fixtures={fixtures} onSaved={onSaved} />
      </div>
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
  fixtures,
  onSaved,
}: {
  fixtures: FixtureView[];
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
          <FixtureCorrectionRow key={fixture.id} fixture={fixture} onSaved={onSaved} />
        ))
      )}
    </div>
  );
}

function FixtureCorrectionRow({
  fixture,
  onSaved,
}: {
  fixture: FixtureView;
  onSaved: () => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scoreCount = fixture.segments.reduce(
    (total, segment) => total + segment.holeScores.length,
    0
  );

  const clearScores = async () => {
    if (!window.confirm(`Clear all saved scores for ${fixture.name ?? 'this fixture'}?`)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await clearFixtureScores2026(fixture);
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
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
            {fixture.name ?? `Fixture ${fixture.sort_order + 1}`}
          </p>
          <p className="mt-1 text-xs text-[#8B949E]">
            {fixture.participants.length} players · {fixture.segments.length} segments · {scoreCount} saved holes
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
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
  const [usaSlots, setUsaSlots] = useState<string[]>(['', '', '']);
  const [europeSlots, setEuropeSlots] = useState<string[]>(['', '', '']);
  const [frontNinePlayerIds, setFrontNinePlayerIds] = useState<string[]>([]);
  const [singlesPairs, setSinglesPairs] = useState<SinglesPairDraft[]>([
    { usaPlayerId: '', europePlayerId: '', cpiEnabled: true },
    { usaPlayerId: '', europePlayerId: '', cpiEnabled: true },
    { usaPlayerId: '', europePlayerId: '', cpiEnabled: true },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedUsaPlayerIds = useMemo(() => compactUnique(usaSlots), [usaSlots]);
  const selectedEuropePlayerIds = useMemo(() => compactUnique(europeSlots), [europeSlots]);
  const selectedPlayerIds = useMemo(
    () => [...selectedUsaPlayerIds, ...selectedEuropePlayerIds],
    [selectedEuropePlayerIds, selectedUsaPlayerIds]
  );
  const selectedPlayers = useMemo(
    () => selectedPlayerIds.map((playerId) => players.find((player) => player.id === playerId)).filter(isPlayerRow),
    [players, selectedPlayerIds]
  );
  const completeSinglesPairs = singlesPairs.filter((pair) => pair.usaPlayerId && pair.europePlayerId);
  const validationError = getCustomFixtureValidationError({
    tournament,
    selectedUsaPlayerIds,
    selectedEuropePlayerIds,
    frontNinePlayerIds,
    singlesPairs,
  });
  const isReady = !validationError;

  useEffect(() => {
    setUsaSlots((current) => fillEmptySlots(current, usaPlayers));
    setEuropeSlots((current) => fillEmptySlots(current, europePlayers));
  }, [europePlayers, usaPlayers]);

  useEffect(() => {
    setFrontNinePlayerIds((current) => {
      const retained = current.filter((playerId) => selectedPlayerIds.includes(playerId));
      const added = selectedPlayerIds.filter((playerId) => !retained.includes(playerId));

      return [...retained, ...added];
    });
  }, [selectedPlayerIds]);

  useEffect(() => {
    setSinglesPairs((current) =>
      current.map((pair, index) => ({
        ...pair,
        usaPlayerId: pair.usaPlayerId || selectedUsaPlayerIds[index] || '',
        europePlayerId: pair.europePlayerId || selectedEuropePlayerIds[index] || '',
      }))
    );
  }, [selectedEuropePlayerIds, selectedUsaPlayerIds]);

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
        frontNinePlayerIds,
        singlesPairs: completeSinglesPairs,
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
    <SetupForm title="Mobile Fixture Builder" onSubmit={handleSubmit} error={error}>
      {validationError && <StatusCard tone="warning">{validationError}</StatusCard>}
      <TextField label="Fixture name" value={name} onChange={setName} />
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
      <FrontNinePicker
        players={selectedPlayers}
        selectedPlayerIds={frontNinePlayerIds}
        onChange={setFrontNinePlayerIds}
      />
      <SinglesPairPicker
        usaPlayers={selectedPlayers.filter((player) => player.team === 'USA')}
        europePlayers={selectedPlayers.filter((player) => player.team === 'EUROPE')}
        pairs={singlesPairs}
        onChange={setSinglesPairs}
      />
      <FixturePreview
        selectedPlayers={selectedPlayers}
        frontNinePlayerIds={frontNinePlayerIds}
        singlesPairs={completeSinglesPairs}
      />
      <SubmitButton isSaving={isSaving} disabled={!isReady}>
        Create fixture
      </SubmitButton>
    </SetupForm>
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
}: {
  selectedPlayers: PlayerRow[];
  frontNinePlayerIds: string[];
  singlesPairs: SinglesPairDraft[];
}) {
  const playerLookup = new Map(selectedPlayers.map((player) => [player.id, player]));

  return (
    <div className="rounded-md border border-[#27272A] bg-[#0C0C0E] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B949E]">Preview</p>
      <p className="mt-2 text-sm text-[#E6EDF3]">
        {selectedPlayers.length} players · {frontNinePlayerIds.length} front-nine players · {singlesPairs.length} singles
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
  selectedUsaPlayerIds,
  selectedEuropePlayerIds,
  frontNinePlayerIds,
  singlesPairs,
}: {
  tournament: TournamentRow | null;
  selectedUsaPlayerIds: string[];
  selectedEuropePlayerIds: string[];
  frontNinePlayerIds: string[];
  singlesPairs: SinglesPairDraft[];
}): string | null {
  if (!tournament) return 'Create an active tournament before creating fixtures.';
  if (selectedUsaPlayerIds.length === 0 || selectedEuropePlayerIds.length === 0) {
    return 'Select at least one player per team.';
  }
  if (selectedUsaPlayerIds.length + selectedEuropePlayerIds.length > 6) {
    return 'A fixture can have at most six players.';
  }
  if (frontNinePlayerIds.length < 2) {
    return 'Select at least two front-nine players.';
  }

  const frontNineTeams = new Set([
    ...frontNinePlayerIds.filter((playerId) => selectedUsaPlayerIds.includes(playerId)).map(() => 'USA'),
    ...frontNinePlayerIds.filter((playerId) => selectedEuropePlayerIds.includes(playerId)).map(() => 'EUROPE'),
  ]);

  if (!frontNineTeams.has('USA') || !frontNineTeams.has('EUROPE')) {
    return 'Front-nine scoring needs at least one player from each team.';
  }

  const completePairs = singlesPairs.filter((pair) => pair.usaPlayerId && pair.europePlayerId);

  if (completePairs.length === 0) {
    return 'Add at least one back-nine singles match.';
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

  return null;
}
