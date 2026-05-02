import type { SupabaseClient, User } from '@supabase/supabase-js';
import { buildHoleScorePayload } from '../domain/2026/persistence';
import type { FixtureParticipant, FixtureSetupInput, SegmentSetup } from '../domain/2026/fixtures';
import { createFixtureSetup, createSupabaseFixtureSetupRepository } from './tournament2026Service';
import { getCourseStrokeIndex } from '../domain/2026/course';
import { getSupabaseClient } from '../lib/supabase';
import type { Database } from '../types/supabase';

export type Team = Database['public']['Enums']['app_team'];
export type PlayerRow = Database['public']['Tables']['players']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type TournamentRow = Database['public']['Tables']['tournaments']['Row'];
export type FixtureRow = Database['public']['Tables']['fixtures']['Row'];
export type FixturePlayerRow = Database['public']['Tables']['fixture_players']['Row'];
export type SegmentRow = Database['public']['Tables']['segments']['Row'];
export type SegmentPlayerRow = Database['public']['Tables']['segment_players']['Row'];
export type HoleScoreRow = Database['public']['Tables']['hole_scores']['Row'];
export type LegacyTournamentRow = Database['public']['Tables']['legacy_tournaments']['Row'];

export interface FixturePlayerView extends FixturePlayerRow {
  player: PlayerRow | null;
}

export interface SegmentPlayerView extends SegmentPlayerRow {
  player: PlayerRow | null;
}

export interface SegmentView extends SegmentRow {
  holeScores: HoleScoreRow[];
  players: SegmentPlayerView[];
}

export interface FixtureView extends FixtureRow {
  participants: FixturePlayerView[];
  segments: SegmentView[];
}

export interface Tournament2026Data {
  user: User | null;
  profile: ProfileRow | null;
  profiles: ProfileRow[];
  players: PlayerRow[];
  activeTournament: TournamentRow | null;
  fixtures: FixtureView[];
  history: LegacyTournamentRow[];
}

export interface CreateProfileInput {
  displayName: string;
}

export interface CreateTournamentInput {
  name: string;
  year: number;
  cpiThreshold: number;
  isActive: boolean;
}

export interface CreatePlayerInput {
  name: string;
  team: Team;
  currentCpi: number | null;
}

export interface UpdatePlayerInput {
  playerId: string;
  name: string;
  team: Team;
  currentCpi: number | null;
}

export interface CreateQuickFixtureInput {
  tournamentId: string;
  name: string;
  usaPlayerIds: [string, string];
  europePlayerIds: [string, string];
  sortOrder: number;
}

export interface CustomSinglesPairInput {
  usaPlayerId: string;
  europePlayerId: string;
  cpiEnabled: boolean;
}

export interface CreateCustomFixtureInput {
  tournamentId: string;
  name: string;
  sortOrder: number;
  usaPlayerIds: string[];
  europePlayerIds: string[];
  frontNinePlayerIds: string[];
  singlesPairs: CustomSinglesPairInput[];
}

export interface SaveHoleScoreInput {
  tournament: TournamentRow;
  segment: SegmentRow;
  players: PlayerRow[];
  holeNumber: number;
  strokeIndex: number;
  usaScore: number | null;
  europeScore: number | null;
  updatedBy: string | null;
}

export interface UpdateSegmentCpiInput {
  tournament: TournamentRow;
  segment: SegmentView;
  players: PlayerRow[];
  enabled: boolean;
  updatedBy: string | null;
}

export interface UpdateProfilePlayerLinkInput {
  profileId: string;
  playerId: string | null;
  players: PlayerRow[];
}

export async function fetchTournament2026Data(
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<Tournament2026Data> {
  const [{ data: userData }, players, activeTournament, history] = await Promise.all([
    client.auth.getUser(),
    fetchPlayers(client),
    fetchActiveTournament(client),
    fetchLegacyHistory(client),
  ]);

  const user = userData.user;
  const profile = user ? await fetchProfile(client, user.id) : null;
  const profiles = profile?.is_admin ? await fetchProfiles(client) : [];
  const fixtures = activeTournament
    ? await fetchFixturesForTournament(client, activeTournament.id, players)
    : [];

  return {
    user,
    profile,
    profiles,
    players,
    activeTournament,
    fixtures,
    history,
  };
}

export function subscribeToTournament2026Changes(
  onChange: () => void,
  client: SupabaseClient<Database> = getSupabaseClient()
): () => void {
  const channel = client.channel('ruff-ryders-2026-dashboard');
  const tables = [
    'players',
    'profiles',
    'tournaments',
    'fixtures',
    'fixture_players',
    'segments',
    'segment_players',
    'hole_scores',
    'legacy_tournaments',
  ];

  for (const table of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
  }

  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function createOwnProfile(
  input: CreateProfileInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { data, error: userError } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!data.user) {
    throw new Error('Sign in with Supabase before creating a profile');
  }

  const { error } = await client.from('profiles').insert({
    id: data.user.id,
    email: data.user.email ?? '',
    display_name: input.displayName,
  });

  throwIfSupabaseError(error, 'Failed to create profile');
}

export async function createTournament2026(
  input: CreateTournamentInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  if (input.isActive) {
    const { error: deactivateError } = await client
      .from('tournaments')
      .update({ is_active: false })
      .eq('is_active', true);

    throwIfSupabaseError(deactivateError, 'Failed to deactivate existing tournaments');
  }

  const { error } = await client.from('tournaments').insert({
    name: input.name,
    year: input.year,
    cpi_threshold: input.cpiThreshold,
    is_active: input.isActive,
  });

  throwIfSupabaseError(error, 'Failed to create tournament');
}

export async function createPlayer2026(
  input: CreatePlayerInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client.from('players').insert({
    name: input.name,
    team: input.team,
    current_cpi: input.currentCpi,
  });

  throwIfSupabaseError(error, 'Failed to create player');
}

export async function updatePlayer2026(
  input: UpdatePlayerInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client
    .from('players')
    .update({
      name: input.name,
      team: input.team,
      current_cpi: input.currentCpi,
    })
    .eq('id', input.playerId);

  throwIfSupabaseError(error, 'Failed to update player');

  const { error: profileError } = await client
    .from('profiles')
    .update({ team: input.team })
    .eq('linked_player_id', input.playerId);

  throwIfSupabaseError(profileError, 'Failed to update linked profile teams');
}

export async function deleteFixture2026(
  fixtureId: string,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client.from('fixtures').delete().eq('id', fixtureId);

  throwIfSupabaseError(error, 'Failed to delete fixture');
}

export async function clearFixtureScores2026(
  fixture: FixtureView,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const segmentIds = fixture.segments.map((segment) => segment.id);

  if (segmentIds.length === 0) {
    return;
  }

  const { error } = await client.from('hole_scores').delete().in('segment_id', segmentIds);

  throwIfSupabaseError(error, 'Failed to clear fixture scores');
}

export async function createQuickFourBallFixture(
  input: CreateQuickFixtureInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const participants: FixtureParticipant[] = [
    { playerId: input.usaPlayerIds[0], team: 'USA', slot: 1 },
    { playerId: input.usaPlayerIds[1], team: 'USA', slot: 2 },
    { playerId: input.europePlayerIds[0], team: 'EUROPE', slot: 1 },
    { playerId: input.europePlayerIds[1], team: 'EUROPE', slot: 2 },
  ];
  const segments: SegmentSetup[] = [
    {
      kind: 'foursomes',
      name: 'Front 9 Foursomes',
      sortOrder: 1,
      holeStart: 1,
      holeEnd: 9,
      participants,
    },
    {
      kind: 'singles',
      name: 'Singles A',
      sortOrder: 2,
      holeStart: 10,
      holeEnd: 18,
      usaPlayerId: input.usaPlayerIds[0],
      europePlayerId: input.europePlayerIds[0],
    },
    {
      kind: 'singles',
      name: 'Singles B',
      sortOrder: 3,
      holeStart: 10,
      holeEnd: 18,
      usaPlayerId: input.usaPlayerIds[1],
      europePlayerId: input.europePlayerIds[1],
    },
  ];

  await createFixtureSetup(
    {
      tournamentId: input.tournamentId,
      fixtureName: input.name,
      sortOrder: input.sortOrder,
      participants,
      segments,
    },
    createSupabaseFixtureSetupRepository(client)
  );
}

export async function createCustomFixture2026(
  input: CreateCustomFixtureInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  await createFixtureSetup(
    buildCustomFixtureSetupInput(input),
    createSupabaseFixtureSetupRepository(client)
  );
}

export function buildCustomFixtureSetupInput(input: CreateCustomFixtureInput): FixtureSetupInput {
  const participants = buildFixtureParticipants(input);
  const participantLookup = new Map(participants.map((participant) => [participant.playerId, participant]));
  const frontNineParticipants = input.frontNinePlayerIds.map((playerId) => {
    const participant = participantLookup.get(playerId);

    if (!participant) {
      throw new Error(`Front-nine player ${playerId} is not assigned to this fixture`);
    }

    return participant;
  });
  const singlesPairs = input.singlesPairs.filter(
    (pair) => pair.usaPlayerId && pair.europePlayerId
  );
  const usedSinglesPlayers = new Set<string>();

  for (const pair of singlesPairs) {
    for (const playerId of [pair.usaPlayerId, pair.europePlayerId]) {
      if (usedSinglesPlayers.has(playerId)) {
        throw new Error(`Duplicate singles player: ${playerId}`);
      }

      usedSinglesPlayers.add(playerId);
    }
  }

  const segments: SegmentSetup[] = [
    {
      kind: 'foursomes',
      name: 'Front 9 Foursomes',
      sortOrder: 1,
      holeStart: 1,
      holeEnd: 9,
      participants: frontNineParticipants,
    },
    ...singlesPairs.map<SegmentSetup>((pair, index) => ({
      kind: 'singles',
      name: `Singles ${String.fromCharCode(65 + index)}`,
      sortOrder: index + 2,
      holeStart: 10,
      holeEnd: 18,
      usaPlayerId: pair.usaPlayerId,
      europePlayerId: pair.europePlayerId,
      cpiEnabled: pair.cpiEnabled,
    })),
  ];

  return {
    tournamentId: input.tournamentId,
    fixtureName: input.name,
    sortOrder: input.sortOrder,
    participants,
    segments,
  };
}

function buildFixtureParticipants(input: CreateCustomFixtureInput): FixtureParticipant[] {
  return [
    ...input.usaPlayerIds.map((playerId, index) => ({
      playerId,
      team: 'USA' as const,
      slot: index + 1,
    })),
    ...input.europePlayerIds.map((playerId, index) => ({
      playerId,
      team: 'EUROPE' as const,
      slot: index + 1,
    })),
  ];
}

export async function saveHoleScore2026(
  input: SaveHoleScoreInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const payload = buildHoleScorePayload({
    segmentId: input.segment.id,
    segmentKind: input.segment.kind,
    hole: {
      holeNumber: input.holeNumber,
      strokeIndex: input.strokeIndex,
      usaScore: input.usaScore,
      europeScore: input.europeScore,
    },
    cpi:
      input.segment.kind === 'singles' && input.segment.cpi_enabled
        ? getSegmentCpiInput(input.tournament, input.segment, input.players)
        : undefined,
    updatedBy: input.updatedBy,
  });

  const { error } = await client
    .from('hole_scores')
    .upsert(payload.row, { onConflict: 'segment_id,hole_number' });

  throwIfSupabaseError(error, 'Failed to save score');
}

export async function updateSegmentCpiEnabled(
  input: UpdateSegmentCpiInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client
    .from('segments')
    .update({ cpi_enabled: input.enabled })
    .eq('id', input.segment.id);

  throwIfSupabaseError(error, 'Failed to update CPI setting');

  if (input.segment.holeScores.length === 0) {
    return;
  }

  const effectiveSegment = { ...input.segment, cpi_enabled: input.enabled };
  const rows = input.segment.holeScores.map((score) =>
    buildHoleScorePayload({
      segmentId: input.segment.id,
      segmentKind: input.segment.kind,
      hole: {
        holeNumber: score.hole_number,
        strokeIndex: getCourseStrokeIndex(score.hole_number),
        usaScore: score.usa_score,
        europeScore: score.europe_score,
      },
      cpi:
        effectiveSegment.kind === 'singles' && effectiveSegment.cpi_enabled
          ? getSegmentCpiInput(input.tournament, effectiveSegment, input.players)
          : undefined,
      updatedBy: input.updatedBy,
    }).row
  );

  const { error: scoresError } = await client
    .from('hole_scores')
    .upsert(rows, { onConflict: 'segment_id,hole_number' });

  throwIfSupabaseError(scoresError, 'Failed to recalculate scores after CPI update');
}

export async function updateProfilePlayerLink2026(
  input: UpdateProfilePlayerLinkInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const linkedPlayer = input.playerId
    ? input.players.find((player) => player.id === input.playerId)
    : null;
  const { error } = await client
    .from('profiles')
    .update({
      linked_player_id: input.playerId,
      team: linkedPlayer?.team ?? null,
    })
    .eq('id', input.profileId);

  throwIfSupabaseError(error, 'Failed to update profile player link');
}

function getSegmentCpiInput(
  tournament: TournamentRow,
  segment: SegmentRow,
  players: PlayerRow[]
) {
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const usaPlayer = segment.usa_player_id
    ? playerLookup.get(segment.usa_player_id)
    : undefined;
  const europePlayer = segment.europe_player_id
    ? playerLookup.get(segment.europe_player_id)
    : undefined;

  return {
    usaCpi: usaPlayer?.current_cpi,
    europeCpi: europePlayer?.current_cpi,
    threshold: tournament.cpi_threshold,
  };
}

async function fetchProfile(
  client: SupabaseClient<Database>,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();

  throwIfSupabaseError(error, 'Failed to load profile');

  return data;
}

async function fetchProfiles(client: SupabaseClient<Database>): Promise<ProfileRow[]> {
  const { data, error } = await client.from('profiles').select('*').order('display_name');

  throwIfSupabaseError(error, 'Failed to load profiles');

  return data ?? [];
}

async function fetchPlayers(client: SupabaseClient<Database>): Promise<PlayerRow[]> {
  const { data, error } = await client.from('players').select('*').order('name');

  throwIfSupabaseError(error, 'Failed to load players');

  return data ?? [];
}

async function fetchActiveTournament(
  client: SupabaseClient<Database>
): Promise<TournamentRow | null> {
  const { data, error } = await client
    .from('tournaments')
    .select('*')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfSupabaseError(error, 'Failed to load active tournament');

  return data;
}

async function fetchLegacyHistory(
  client: SupabaseClient<Database>
): Promise<LegacyTournamentRow[]> {
  const { data, error } = await client
    .from('legacy_tournaments')
    .select('*')
    .order('year', { ascending: false });

  throwIfSupabaseError(error, 'Failed to load historical tournaments');

  return data ?? [];
}

async function fetchFixturesForTournament(
  client: SupabaseClient<Database>,
  tournamentId: string,
  players: PlayerRow[]
): Promise<FixtureView[]> {
  const { data: fixtures, error: fixturesError } = await client
    .from('fixtures')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('sort_order');

  throwIfSupabaseError(fixturesError, 'Failed to load fixtures');

  if (!fixtures?.length) {
    return [];
  }

  const fixtureIds = fixtures.map((fixture) => fixture.id);
  const [
    { data: fixturePlayers, error: fixturePlayersError },
    { data: segments, error: segmentsError },
  ] = await Promise.all([
    client.from('fixture_players').select('*').in('fixture_id', fixtureIds).order('slot'),
    client.from('segments').select('*').in('fixture_id', fixtureIds).order('sort_order'),
  ]);

  throwIfSupabaseError(fixturePlayersError, 'Failed to load fixture players');
  throwIfSupabaseError(segmentsError, 'Failed to load fixture segments');

  const segmentIds = (segments ?? []).map((segment) => segment.id);
  const [segmentPlayersResult, holeScoresResult] = segmentIds.length
    ? await Promise.all([
        client.from('segment_players').select('*').in('segment_id', segmentIds).order('slot'),
        client.from('hole_scores').select('*').in('segment_id', segmentIds).order('hole_number'),
      ])
    : [
        { data: [] as SegmentPlayerRow[], error: null },
        { data: [] as HoleScoreRow[], error: null },
      ];

  throwIfSupabaseError(segmentPlayersResult.error, 'Failed to load segment players');
  throwIfSupabaseError(holeScoresResult.error, 'Failed to load hole scores');

  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const fixturePlayersByFixture = groupBy(fixturePlayers ?? [], (row) => row.fixture_id);
  const segmentsByFixture = groupBy(segments ?? [], (row) => row.fixture_id);
  const segmentPlayersBySegment = groupBy(segmentPlayersResult.data ?? [], (row) => row.segment_id);
  const holeScoresBySegment = groupBy(holeScoresResult.data ?? [], (row) => row.segment_id);

  return fixtures.map((fixture) => ({
    ...fixture,
    participants: (fixturePlayersByFixture.get(fixture.id) ?? []).map((participant) => ({
      ...participant,
      player: playerLookup.get(participant.player_id) ?? null,
    })),
    segments: (segmentsByFixture.get(fixture.id) ?? []).map((segment) => ({
      ...segment,
      players: (segmentPlayersBySegment.get(segment.id) ?? []).map((segmentPlayer) => ({
        ...segmentPlayer,
        player: playerLookup.get(segmentPlayer.player_id) ?? null,
      })),
      holeScores: holeScoresBySegment.get(segment.id) ?? [],
    })),
  }));
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const values = grouped.get(key) ?? [];
    values.push(item);
    grouped.set(key, values);
  }

  return grouped;
}

function throwIfSupabaseError(error: { message: string } | null, message: string): void {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
}
