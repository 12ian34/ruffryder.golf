import type { SupabaseClient, User } from '@supabase/supabase-js';
import { buildTournamentFinalizationDraft } from '../domain/2026/finalization';
import { buildHoleScorePayload } from '../domain/2026/persistence';
import type { FixtureParticipant, FixtureSetupInput, SegmentSetup } from '../domain/2026/fixtures';
import { createFixtureSetup, createSupabaseFixtureSetupRepository } from './tournament2026Service';
import {
  DEFAULT_COURSE_HOLES,
  getCourseStrokeIndex,
  type CourseHoleMetadata,
} from '../domain/2026/course';
import { getSupabaseClient } from '../lib/supabase';
import type { Database, Json } from '../types/supabase';

export type Team = Database['public']['Enums']['app_team'];
export type PlayerRow = Database['public']['Tables']['players']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type TournamentRow = Database['public']['Tables']['tournaments']['Row'];
export type FixtureRow = Database['public']['Tables']['fixtures']['Row'];
export type FixturePlayerRow = Database['public']['Tables']['fixture_players']['Row'];
export type SegmentRow = Database['public']['Tables']['segments']['Row'];
export type SegmentPlayerRow = Database['public']['Tables']['segment_players']['Row'];
export type HoleScoreRow = Database['public']['Tables']['hole_scores']['Row'];
export type CourseHoleRow = Database['public']['Tables']['course_holes']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
export type TournamentActivityRow =
  Database['public']['Functions']['get_tournament_activity']['Returns'][number];
export type AiPlayerOverviewRow = Database['public']['Tables']['ai_player_overviews']['Row'];
export type AiTournamentOverviewRow =
  Database['public']['Tables']['ai_tournament_overviews']['Row'];
export type AiNewsroomArtifactRow =
  Database['public']['Tables']['ai_newsroom_artifacts']['Row'];
export type LegacyTournamentRow = Database['public']['Tables']['legacy_tournaments']['Row'];
export type LegacyGameRow = Database['public']['Tables']['legacy_games']['Row'];
export type PlayerTournamentStatsInsert =
  Database['public']['Tables']['player_tournament_stats']['Insert'];
export type PlayerTournamentStatsRow =
  Database['public']['Tables']['player_tournament_stats']['Row'];

export interface LegacyTournamentView extends LegacyTournamentRow {
  games: LegacyGameRow[];
}

export interface FixturePlayerView extends FixturePlayerRow {
  player: PlayerRow | null;
}

export interface SegmentPlayerView extends SegmentPlayerRow {
  player: PlayerRow | null;
}

export interface ScoreEditorProfile {
  id: string;
  display_name: string;
}

export interface HoleScoreView extends HoleScoreRow {
  updatedByProfile: ScoreEditorProfile | null;
}

export interface SegmentView extends SegmentRow {
  holeScores: HoleScoreView[];
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
  tournaments: TournamentRow[];
  players: PlayerRow[];
  playerStats: PlayerTournamentStatsRow[];
  aiPlayerOverviews: AiPlayerOverviewRow[];
  aiTournamentOverview: AiTournamentOverviewRow | null;
  aiNewsroomArtifacts: AiNewsroomArtifactRow[];
  auditLogs: AuditLogRow[];
  activity: TournamentActivityRow[];
  courseHoles: CourseHoleMetadata[];
  activeTournament: TournamentRow | null;
  fixtures: FixtureView[];
  history: LegacyTournamentView[];
}

export interface CreateProfileInput {
  displayName: string;
  customEmoji?: string | null;
}

export interface UpdateOwnProfileInput {
  displayName: string;
  customEmoji: string | null;
}

export interface UpdateProfileAdminInput {
  profileId: string;
  displayName: string;
  isAdmin: boolean;
  customEmoji: string | null;
  playerId: string | null;
  players: PlayerRow[];
}

export interface CreateTournamentInput {
  name: string;
  year: number;
  cpiThreshold: number;
  isActive: boolean;
}

export interface UpdateTournamentInput {
  tournament: TournamentRow;
  fixtures: FixtureView[];
  players: PlayerRow[];
  name: string;
  year: number;
  cpiThreshold: number;
  updatedBy: string | null;
}

export interface SetTournamentActiveInput {
  tournamentId: string;
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

export interface UpdateFixtureInput {
  tournament: TournamentRow;
  fixtureId: string;
  name: string | null;
}

export interface UpdateCourseHoleInput {
  holeNumber: number;
  strokeIndex: number;
  par: number | null;
  yardage: number | null;
}

export interface UpdateSegmentInput {
  tournament: TournamentRow;
  fixture: FixtureView;
  segment: SegmentView;
  name: string | null;
  usaPlayerId?: string;
  europePlayerId?: string;
  participantPlayerIds?: string[];
  clearScoresOnPlayerChange?: boolean;
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

export interface CompleteTournamentInput {
  tournament: TournamentRow;
  fixtures: FixtureView[];
  players: PlayerRow[];
}

export interface ReopenTournamentInput {
  tournament: TournamentRow;
}

export interface ClearHoleScoreInput {
  tournament: TournamentRow;
  scoreId: string;
}

export interface PlayerTournamentStatFields {
  playerId: string;
  tournamentId: string | null;
  source: string;
  completionYear: number;
  singlesHolesPlayed: number;
  singlesStrokes: number;
  singlesAverage: number | null;
  holesWon: number;
  holesHalved: number;
  cpiAfter: number | null;
  completedAt: string;
  legacyPayload?: Json;
}

export interface CreatePlayerTournamentStatInput extends PlayerTournamentStatFields {}

export interface UpdatePlayerTournamentStatInput extends PlayerTournamentStatFields {
  statId: string;
}

export async function fetchTournament2026Data(
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<Tournament2026Data> {
  const [
    { data: userData },
    players,
    playerStats,
    aiPlayerOverviews,
    aiNewsroomArtifacts,
    courseHoles,
    activeTournament,
    history,
  ] =
    await Promise.all([
      client.auth.getUser(),
      fetchPlayers(client),
      fetchPlayerTournamentStats(client),
      fetchAiPlayerOverviews(client),
      fetchAiNewsroomArtifacts(client),
      fetchCourseHoles(client),
      fetchActiveTournament(client),
      fetchLegacyHistory(client),
    ]);

  const user = userData.user;
  const profile = user ? await fetchProfile(client, user.id) : null;
  const profiles = profile?.is_admin ? await fetchProfiles(client) : [];
  const tournaments = profile?.is_admin
    ? await fetchTournaments(client)
    : activeTournament
      ? [activeTournament]
      : [];
  const auditLogs = profile?.is_admin ? await fetchAuditLogs(client) : [];
  const activity = activeTournament
    ? await fetchTournamentActivity(client, activeTournament.id)
    : [];
  const fixtures = activeTournament
    ? await fetchFixturesForTournament(client, activeTournament.id, players)
    : [];
  const aiTournamentOverview = activeTournament
    ? await fetchAiTournamentOverview(client, activeTournament.id)
    : null;

  return {
    user,
    profile,
    profiles,
    tournaments,
    players,
    playerStats,
    aiPlayerOverviews,
    aiTournamentOverview,
    aiNewsroomArtifacts,
    auditLogs,
    activity,
    courseHoles,
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
    'course_holes',
    'tournaments',
    'fixtures',
    'fixture_players',
    'segments',
    'segment_players',
    'hole_scores',
    'audit_logs',
    'ai_player_overviews',
    'ai_tournament_overviews',
    'ai_newsroom_artifacts',
    'player_tournament_stats',
    'legacy_tournaments',
    'legacy_games',
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
    custom_emoji: input.customEmoji ?? null,
  });

  if (isDuplicateKeyError(error)) {
    return;
  }

  throwIfSupabaseError(error, 'Failed to create profile');
}

export async function updateOwnProfile2026(
  input: UpdateOwnProfileInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client.rpc('update_own_profile', {
    display_name_input: input.displayName,
    custom_emoji_input: input.customEmoji ?? '',
  });

  throwIfSupabaseError(error, 'Failed to update profile');
}

export async function updateProfileAdmin2026(
  input: UpdateProfileAdminInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const linkedPlayer = input.playerId
    ? input.players.find((player) => player.id === input.playerId)
    : null;
  const { error } = await client
    .from('profiles')
    .update({
      display_name: input.displayName,
      custom_emoji: input.customEmoji,
      is_admin: input.isAdmin,
      linked_player_id: input.playerId,
      team: linkedPlayer?.team ?? null,
    })
    .eq('id', input.profileId);

  throwIfSupabaseError(error, 'Failed to update profile');
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

export async function updateTournament2026(
  input: UpdateTournamentInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  if (input.tournament.is_complete) {
    throw new Error('Tournament is complete. Tournament details are locked.');
  }

  const { error } = await client
    .from('tournaments')
    .update({
      name: input.name,
      year: input.year,
      cpi_threshold: input.cpiThreshold,
    })
    .eq('id', input.tournament.id);

  throwIfSupabaseError(error, 'Failed to update tournament');

  if (input.cpiThreshold !== input.tournament.cpi_threshold) {
    await recalculateTournamentScoresForCpiThreshold(input, client);
  }
}

export async function setTournamentActive2026(
  input: SetTournamentActiveInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  if (input.isActive) {
    const { error: deactivateError } = await client
      .from('tournaments')
      .update({ is_active: false })
      .eq('is_active', true);

    throwIfSupabaseError(deactivateError, 'Failed to deactivate existing tournaments');
  }

  const { error } = await client
    .from('tournaments')
    .update({ is_active: input.isActive })
    .eq('id', input.tournamentId);

  throwIfSupabaseError(
    error,
    input.isActive ? 'Failed to activate tournament' : 'Failed to deactivate tournament'
  );
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

export async function createPlayerTournamentStat2026(
  input: CreatePlayerTournamentStatInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client
    .from('player_tournament_stats')
    .insert(buildPlayerTournamentStatPayload(input));

  throwIfSupabaseError(error, 'Failed to create player history row');
}

export async function updatePlayerTournamentStat2026(
  input: UpdatePlayerTournamentStatInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client
    .from('player_tournament_stats')
    .update(buildPlayerTournamentStatPayload(input))
    .eq('id', input.statId);

  throwIfSupabaseError(error, 'Failed to update player history row');
}

export async function deletePlayerTournamentStat2026(
  statId: string,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client.from('player_tournament_stats').delete().eq('id', statId);

  throwIfSupabaseError(error, 'Failed to delete player history row');
}

export async function updateFixture2026(
  input: UpdateFixtureInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  if (input.tournament.is_complete) {
    throw new Error('Tournament is complete. Fixture details are locked.');
  }

  const { error } = await client
    .from('fixtures')
    .update({ name: input.name })
    .eq('id', input.fixtureId);

  throwIfSupabaseError(error, 'Failed to update fixture');
}

export async function updateCourseHole2026(
  input: UpdateCourseHoleInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  const { error } = await client
    .from('course_holes')
    .upsert(
      {
        hole_number: input.holeNumber,
        stroke_index: input.strokeIndex,
        par: input.par,
        yardage: input.yardage,
      },
      { onConflict: 'hole_number' }
    );

  throwIfSupabaseError(error, 'Failed to update course hole');
}

export async function updateSegment2026(
  input: UpdateSegmentInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  if (input.tournament.is_complete) {
    throw new Error('Tournament is complete. Segment details are locked.');
  }

  const isSinglesPlayerChange =
    input.segment.kind === 'singles' &&
    (input.usaPlayerId !== input.segment.usa_player_id ||
      input.europePlayerId !== input.segment.europe_player_id);

  if (
    isSinglesPlayerChange &&
    input.segment.holeScores.length > 0 &&
    !input.clearScoresOnPlayerChange
  ) {
    throw new Error('Clear scores before changing singles players.');
  }

  if (input.segment.kind === 'singles') {
    const usaParticipant = getFixturePlayerForTeam(input.fixture, input.usaPlayerId, 'USA');
    const europeParticipant = getFixturePlayerForTeam(input.fixture, input.europePlayerId, 'EUROPE');

    if (isSinglesPlayerChange && input.clearScoresOnPlayerChange) {
      await clearSegmentScores(input.segment.id, client);
    }

    const { error } = await client
      .from('segments')
      .update({
        name: input.name,
        usa_player_id: usaParticipant.player_id,
        europe_player_id: europeParticipant.player_id,
      })
      .eq('id', input.segment.id);

    throwIfSupabaseError(error, 'Failed to update segment');

    if (isSinglesPlayerChange) {
      const { error: deleteError } = await client
        .from('segment_players')
        .delete()
        .eq('segment_id', input.segment.id);

      throwIfSupabaseError(deleteError, 'Failed to replace segment players');

      const { error: insertError } = await client.from('segment_players').insert([
        {
          segment_id: input.segment.id,
          player_id: usaParticipant.player_id,
          team: usaParticipant.team,
          slot: usaParticipant.slot,
        },
        {
          segment_id: input.segment.id,
          player_id: europeParticipant.player_id,
          team: europeParticipant.team,
          slot: europeParticipant.slot,
        },
      ]);

      throwIfSupabaseError(insertError, 'Failed to save segment players');
    }

    return;
  }

  const existingFoursomesPlayerIds = input.segment.players
    .map((segmentPlayer) => segmentPlayer.player_id)
    .sort();
  const nextFoursomesPlayerIds = [...(input.participantPlayerIds ?? existingFoursomesPlayerIds)].sort();
  const isFoursomesPlayerChange =
    existingFoursomesPlayerIds.join('|') !== nextFoursomesPlayerIds.join('|');

  if (
    isFoursomesPlayerChange &&
    input.segment.holeScores.length > 0 &&
    !input.clearScoresOnPlayerChange
  ) {
    throw new Error('Clear scores before changing foursomes players.');
  }

  if (isFoursomesPlayerChange && input.clearScoresOnPlayerChange) {
    await clearSegmentScores(input.segment.id, client);
  }

  const { error } = await client
    .from('segments')
    .update({ name: input.name })
    .eq('id', input.segment.id);

  throwIfSupabaseError(error, 'Failed to update segment');

  if (!isFoursomesPlayerChange) {
    return;
  }

  const nextSegmentPlayers = getFixturePlayersForFoursomes(input.fixture, nextFoursomesPlayerIds).map(
    (participant) => ({
      segment_id: input.segment.id,
      player_id: participant.player_id,
      team: participant.team,
      slot: participant.slot,
    })
  );

  const { error: deleteError } = await client
    .from('segment_players')
    .delete()
    .eq('segment_id', input.segment.id);

  throwIfSupabaseError(deleteError, 'Failed to replace segment players');

  const { error: insertError } = await client.from('segment_players').insert(nextSegmentPlayers);

  throwIfSupabaseError(insertError, 'Failed to save segment players');
}

async function clearSegmentScores(
  segmentId: string,
  client: SupabaseClient<Database>
): Promise<void> {
  const { error } = await client.from('hole_scores').delete().eq('segment_id', segmentId);

  throwIfSupabaseError(error, 'Failed to clear segment scores');
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

export async function clearHoleScore2026(
  input: ClearHoleScoreInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  if (input.tournament.is_complete) {
    throw new Error('Tournament is complete. Scores are locked.');
  }

  const { error } = await client.from('hole_scores').delete().eq('id', input.scoreId);

  throwIfSupabaseError(error, 'Failed to clear hole score');
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
  const frontNineParticipants = buildFrontNineParticipants(input.frontNinePlayerIds, participantLookup);
  const singlesPairs = input.singlesPairs.filter(
    (pair) => pair.usaPlayerId && pair.europePlayerId
  );
  const usedSinglesPlayers = new Set<string>();

  if (singlesPairs.length === 0) {
    throw new Error('Add at least one back-nine singles match.');
  }

  for (const pair of singlesPairs) {
    for (const playerId of [pair.usaPlayerId, pair.europePlayerId]) {
      if (usedSinglesPlayers.has(playerId)) {
        throw new Error(`Duplicate singles player: ${playerId}`);
      }

      usedSinglesPlayers.add(playerId);
    }
  }

  const segments: SegmentSetup[] = [];
  const hasFrontNineSegment = frontNineParticipants.length > 0;

  if (hasFrontNineSegment) {
    segments.push({
      kind: 'foursomes',
      name: 'Front 9 Foursomes',
      sortOrder: 1,
      holeStart: 1,
      holeEnd: 9,
      participants: frontNineParticipants,
    });
  }

  const singlesSortOrderOffset = segments.length;

  segments.push(
    ...singlesPairs.map<SegmentSetup>((pair, index) => ({
      kind: 'singles',
      name: `Singles ${String.fromCharCode(65 + index)}`,
      sortOrder: index + singlesSortOrderOffset + 1,
      holeStart: hasFrontNineSegment ? 10 : 1,
      holeEnd: 18,
      usaPlayerId: pair.usaPlayerId,
      europePlayerId: pair.europePlayerId,
      cpiEnabled: pair.cpiEnabled,
    }))
  );

  return {
    tournamentId: input.tournamentId,
    fixtureName: input.name,
    sortOrder: input.sortOrder,
    participants,
    segments,
  };
}

function buildFrontNineParticipants(
  playerIds: string[],
  participantLookup: Map<string, FixtureParticipant>
): FixtureParticipant[] {
  return playerIds.map((playerId) => {
    const participant = participantLookup.get(playerId);

    if (!participant) {
      throw new Error(`Front-nine player ${playerId} is not assigned to this fixture`);
    }

    return participant;
  });
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
  if (input.tournament.is_complete) {
    throw new Error('Tournament is complete. Scores are locked.');
  }

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
  if (input.tournament.is_complete) {
    throw new Error('Tournament is complete. CPI settings are locked.');
  }

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

async function recalculateTournamentScoresForCpiThreshold(
  input: UpdateTournamentInput,
  client: SupabaseClient<Database>
): Promise<void> {
  const effectiveTournament = { ...input.tournament, cpi_threshold: input.cpiThreshold };
  const rows = input.fixtures.flatMap((fixture) =>
    fixture.segments.flatMap((segment) =>
      segment.holeScores.map((score) =>
        buildHoleScorePayload({
          segmentId: segment.id,
          segmentKind: segment.kind,
          hole: {
            holeNumber: score.hole_number,
            strokeIndex: getCourseStrokeIndex(score.hole_number),
            usaScore: score.usa_score,
            europeScore: score.europe_score,
          },
          cpi:
            segment.kind === 'singles' && segment.cpi_enabled
              ? getSegmentCpiInput(effectiveTournament, segment, input.players)
              : undefined,
          updatedBy: input.updatedBy,
        }).row
      )
    )
  );

  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from('hole_scores').upsert(rows, {
    onConflict: 'segment_id,hole_number',
  });

  throwIfSupabaseError(error, 'Failed to recalculate scores after tournament update');
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

export async function reopenTournament2026(
  input: ReopenTournamentInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  if (!input.tournament.is_complete) {
    throw new Error('Tournament is not complete.');
  }

  const { data: stats, error: statsError } = await client
    .from('player_tournament_stats')
    .select('*')
    .eq('tournament_id', input.tournament.id)
    .eq('source', 'app');

  throwIfSupabaseError(statsError, 'Failed to load player stats for rollback');

  for (const stat of stats ?? []) {
    const cpiBefore = getCpiBefore(stat);

    const { error: playerError } = await client
      .from('players')
      .update({ current_cpi: cpiBefore })
      .eq('id', stat.player_id);

    throwIfSupabaseError(playerError, 'Failed to restore player CPI');
  }

  const { error: deleteStatsError } = await client
    .from('player_tournament_stats')
    .delete()
    .eq('tournament_id', input.tournament.id)
    .eq('source', 'app');

  throwIfSupabaseError(deleteStatsError, 'Failed to remove generated player stats');

  const { error: tournamentError } = await client
    .from('tournaments')
    .update({ is_complete: false, completed_at: null })
    .eq('id', input.tournament.id);

  throwIfSupabaseError(tournamentError, 'Failed to reopen tournament');
}

export async function completeTournament2026(
  input: CompleteTournamentInput,
  client: SupabaseClient<Database> = getSupabaseClient()
): Promise<void> {
  if (input.tournament.is_complete) {
    throw new Error('Tournament is already complete.');
  }

  const completedAt = new Date().toISOString();
  const finalization = buildTournamentFinalizationDraft({
    tournament: input.tournament,
    players: input.players,
    fixtures: input.fixtures,
    completedAt,
  });

  if (finalization.missingScores.length > 0) {
    throw new Error(
      `Cannot complete tournament. Missing scores: ${finalization.missingScores
        .slice(0, 5)
        .join(', ')}${finalization.missingScores.length > 5 ? '...' : ''}`
    );
  }

  const { error: deleteStatsError } = await client
    .from('player_tournament_stats')
    .delete()
    .eq('tournament_id', input.tournament.id)
    .eq('source', 'app');

  throwIfSupabaseError(deleteStatsError, 'Failed to replace player stats');

  if (finalization.stats.length > 0) {
    const { error: insertStatsError } = await client
      .from('player_tournament_stats')
      .insert(finalization.stats satisfies PlayerTournamentStatsInsert[]);

    throwIfSupabaseError(insertStatsError, 'Failed to save player stats');
  }

  for (const update of finalization.playerCpiUpdates) {
    const { error: playerError } = await client
      .from('players')
      .update({ current_cpi: update.currentCpi })
      .eq('id', update.playerId);

    throwIfSupabaseError(playerError, 'Failed to update player CPI');
  }

  const { error: tournamentError } = await client
    .from('tournaments')
    .update({ is_complete: true, completed_at: completedAt })
    .eq('id', input.tournament.id);

  throwIfSupabaseError(tournamentError, 'Failed to complete tournament');
}

function getCpiBefore(stat: PlayerTournamentStatsRow): number | null {
  if (
    stat.legacy_payload &&
    typeof stat.legacy_payload === 'object' &&
    !Array.isArray(stat.legacy_payload) &&
    'cpi_before' in stat.legacy_payload
  ) {
    const value = stat.legacy_payload.cpi_before;

    return typeof value === 'number' ? value : null;
  }

  return null;
}

function buildPlayerTournamentStatPayload(
  input: PlayerTournamentStatFields
): PlayerTournamentStatsInsert {
  return {
    player_id: input.playerId,
    tournament_id: input.tournamentId,
    source: input.source.trim() || 'manual',
    completion_year: input.completionYear,
    singles_holes_played: input.singlesHolesPlayed,
    singles_strokes: input.singlesStrokes,
    singles_average: input.singlesAverage,
    holes_won: input.holesWon,
    holes_halved: input.holesHalved,
    cpi_after: input.cpiAfter,
    completed_at: input.completedAt,
    legacy_payload: input.legacyPayload ?? { manual_editor: true },
  };
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

function getFixturePlayerForTeam(
  fixture: FixtureView,
  playerId: string | undefined,
  team: Team
): FixturePlayerView {
  const participant = fixture.participants.find(
    (fixturePlayer) => fixturePlayer.player_id === playerId && fixturePlayer.team === team
  );

  if (!participant) {
    throw new Error(`Select a ${team} player assigned to this fixture.`);
  }

  return participant;
}

function getFixturePlayersForFoursomes(
  fixture: FixtureView,
  playerIds: string[]
): FixturePlayerView[] {
  const playerIdSet = new Set(playerIds);
  const participants = fixture.participants.filter((participant) =>
    playerIdSet.has(participant.player_id)
  );

  if (participants.length !== playerIdSet.size) {
    throw new Error('Select only players assigned to this fixture.');
  }

  const teams = new Set(participants.map((participant) => participant.team));

  if (!teams.has('USA') || !teams.has('EUROPE')) {
    throw new Error('Foursomes segment must include at least one USA player and one Europe player.');
  }

  return participants;
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

async function fetchTournaments(client: SupabaseClient<Database>): Promise<TournamentRow[]> {
  const { data, error } = await client
    .from('tournaments')
    .select('*')
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  throwIfSupabaseError(error, 'Failed to load tournaments');

  return data ?? [];
}

async function fetchPlayerTournamentStats(
  client: SupabaseClient<Database>
): Promise<PlayerTournamentStatsRow[]> {
  const { data, error } = await client
    .from('player_tournament_stats')
    .select('*')
    .order('completion_year', { ascending: false });

  throwIfSupabaseError(error, 'Failed to load player stats');

  return data ?? [];
}

async function fetchAiPlayerOverviews(client: SupabaseClient<Database>): Promise<AiPlayerOverviewRow[]> {
  const { data, error } = await client
    .from('ai_player_overviews')
    .select('*')
    .order('generated_at', { ascending: false });

  if (isMissingTableError(error, 'ai_player_overviews')) {
    return [];
  }

  throwIfSupabaseError(error, 'Failed to load AI player overviews');

  return data ?? [];
}

async function fetchAiNewsroomArtifacts(
  client: SupabaseClient<Database>
): Promise<AiNewsroomArtifactRow[]> {
  const { data, error } = await client
    .from('ai_newsroom_artifacts')
    .select('*')
    .order('generated_at', { ascending: false });

  if (isMissingTableError(error, 'ai_newsroom_artifacts')) {
    return [];
  }

  throwIfSupabaseError(error, 'Failed to load AI newsroom artifacts');

  return data ?? [];
}

async function fetchAiTournamentOverview(
  client: SupabaseClient<Database>,
  tournamentId: string
): Promise<AiTournamentOverviewRow | null> {
  const { data, error } = await client
    .from('ai_tournament_overviews')
    .select('*')
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  if (isMissingTableError(error, 'ai_tournament_overviews')) {
    return null;
  }

  throwIfSupabaseError(error, 'Failed to load AI tournament overview');

  return data;
}

async function fetchAuditLogs(client: SupabaseClient<Database>): Promise<AuditLogRow[]> {
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80);

  if (isMissingTableError(error, 'audit_logs')) {
    return [];
  }

  throwIfSupabaseError(error, 'Failed to load audit logs');

  return data ?? [];
}

async function fetchTournamentActivity(
  client: SupabaseClient<Database>,
  tournamentId: string
): Promise<TournamentActivityRow[]> {
  const { data, error } = await client.rpc('get_tournament_activity', {
    p_tournament_id: tournamentId,
    p_limit: 1000,
  });

  if (isMissingFunctionError(error)) {
    return [];
  }

  throwIfSupabaseError(error, 'Failed to load tournament activity');

  return data ?? [];
}

async function fetchCourseHoles(client: SupabaseClient<Database>): Promise<CourseHoleMetadata[]> {
  const { data, error } = await client.from('course_holes').select('*').order('hole_number');

  if (isMissingTableError(error, 'course_holes')) {
    return DEFAULT_COURSE_HOLES;
  }

  throwIfSupabaseError(error, 'Failed to load course metadata');

  if (!data?.length) {
    return DEFAULT_COURSE_HOLES;
  }

  const rowsByHole = new Map(data.map((row) => [row.hole_number, row]));

  return DEFAULT_COURSE_HOLES.map((defaultHole) => {
    const row = rowsByHole.get(defaultHole.holeNumber);

    if (!row) {
      return defaultHole;
    }

    return {
      holeNumber: row.hole_number,
      strokeIndex: row.stroke_index,
      par: row.par,
      yardage: row.yardage,
    };
  });
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
): Promise<LegacyTournamentView[]> {
  const { data, error } = await client
    .from('legacy_tournaments')
    .select('*')
    .order('year', { ascending: false });

  throwIfSupabaseError(error, 'Failed to load historical tournaments');

  if (!data?.length) {
    return [];
  }

  const tournamentIds = data.map((tournament) => tournament.id);
  const { data: games, error: gamesError } = await client
    .from('legacy_games')
    .select('*')
    .in('legacy_tournament_id', tournamentIds)
    .order('legacy_firebase_id');

  throwIfSupabaseError(gamesError, 'Failed to load historical games');

  const gamesByTournament = groupBy(games ?? [], (game) => game.legacy_tournament_id);

  return data.map((tournament) => ({
    ...tournament,
    games: gamesByTournament.get(tournament.id) ?? [],
  }));
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

  const scoreEditorLookup = await fetchScoreEditorLookup(
    client,
    (holeScoresResult.data ?? []).flatMap((score) => (score.updated_by ? [score.updated_by] : []))
  );
  const playerLookup = new Map(players.map((player) => [player.id, player]));
  const fixturePlayersByFixture = groupBy(fixturePlayers ?? [], (row) => row.fixture_id);
  const segmentsByFixture = groupBy(segments ?? [], (row) => row.fixture_id);
  const segmentPlayersBySegment = groupBy(segmentPlayersResult.data ?? [], (row) => row.segment_id);
  const holeScoresBySegment = groupBy(
    (holeScoresResult.data ?? []).map((score) => ({
      ...score,
      updatedByProfile: score.updated_by ? (scoreEditorLookup.get(score.updated_by) ?? null) : null,
    })),
    (row) => row.segment_id
  );

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

async function fetchScoreEditorLookup(
  client: SupabaseClient<Database>,
  profileIds: string[]
): Promise<Map<string, ScoreEditorProfile>> {
  const uniqueProfileIds = [...new Set(profileIds)];

  if (uniqueProfileIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from('profiles')
    .select('id, display_name')
    .in('id', uniqueProfileIds);

  throwIfSupabaseError(error, 'Failed to load score editor profiles');

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
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

function isMissingTableError(error: { message: string } | null, tableName: string): boolean {
  const message = error?.message ?? '';

  return Boolean(
    message.includes(`Could not find the table 'public.${tableName}'`) ||
      message.includes(`relation "public.${tableName}" does not exist`)
  );
}

function isMissingFunctionError(error: { message: string } | null): boolean {
  const message = error?.message.toLowerCase() ?? '';

  return Boolean(
    message.includes('could not find the function public.get_tournament_activity') ||
      (message.includes('function public.get_tournament_activity') && message.includes('does not exist')) ||
      (message.includes('function get_tournament_activity') && message.includes('does not exist'))
  );
}

function isDuplicateKeyError(error: { message: string } | null): boolean {
  return Boolean(error?.message.includes('duplicate key value violates unique constraint "profiles_pkey"'));
}
