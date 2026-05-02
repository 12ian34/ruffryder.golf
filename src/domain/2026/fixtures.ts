import type { Database } from '../../types/supabase';
import type { SegmentKind, Team } from './scoring';

type FixtureInsert = Database['public']['Tables']['fixtures']['Insert'];
type FixturePlayerInsert = Database['public']['Tables']['fixture_players']['Insert'];
type SegmentInsert = Database['public']['Tables']['segments']['Insert'];
type SegmentPlayerInsert = Database['public']['Tables']['segment_players']['Insert'];

export interface FixtureParticipant {
  playerId: string;
  team: Team;
  slot: number;
}

export interface SegmentParticipant {
  playerId: string;
  team: Team;
  slot?: number;
}

export interface BaseSegmentSetup {
  id?: string;
  name?: string;
  sortOrder: number;
  holeStart: number;
  holeEnd: number;
}

export interface FoursomesSegmentSetup extends BaseSegmentSetup {
  kind: 'foursomes';
  participants: SegmentParticipant[];
}

export interface SinglesSegmentSetup extends BaseSegmentSetup {
  kind: 'singles';
  usaPlayerId: string;
  europePlayerId: string;
}

export type SegmentSetup = FoursomesSegmentSetup | SinglesSegmentSetup;

export interface FixtureSetupInput {
  tournamentId: string;
  fixtureId?: string;
  fixtureName?: string;
  sortOrder?: number;
  participants: FixtureParticipant[];
  segments: SegmentSetup[];
  idFactory?: () => string;
}

export interface FixtureSetupPayload {
  fixture: FixtureInsert;
  fixturePlayers: FixturePlayerInsert[];
  segments: SegmentInsert[];
  segmentPlayers: SegmentPlayerInsert[];
}

export function buildFixtureSetupPayload(input: FixtureSetupInput): FixtureSetupPayload {
  const idFactory = input.idFactory ?? createRandomId;
  const fixtureId = input.fixtureId ?? idFactory();

  validateFixtureParticipants(input.participants);
  validateSegmentSortOrders(input.segments);

  const participantLookup = createParticipantLookup(input.participants);
  const segments = input.segments.map((segment) =>
    buildSegmentInsert(fixtureId, segment, idFactory, participantLookup)
  );

  return {
    fixture: {
      id: fixtureId,
      tournament_id: input.tournamentId,
      name: input.fixtureName ?? null,
      sort_order: input.sortOrder ?? 0,
      status: 'not_started',
    },
    fixturePlayers: input.participants.map((participant) => ({
      fixture_id: fixtureId,
      player_id: participant.playerId,
      team: participant.team,
      slot: participant.slot,
    })),
    segments: segments.map((segment) => segment.row),
    segmentPlayers: segments.flatMap((segment) => segment.players),
  };
}

function buildSegmentInsert(
  fixtureId: string,
  segment: SegmentSetup,
  idFactory: () => string,
  participantLookup: Map<string, FixtureParticipant>
): { row: SegmentInsert; players: SegmentPlayerInsert[] } {
  validateHoleRange(segment);

  switch (segment.kind) {
    case 'foursomes':
      return buildFoursomesSegmentInsert(fixtureId, segment, idFactory, participantLookup);
    case 'singles':
      return buildSinglesSegmentInsert(fixtureId, segment, idFactory, participantLookup);
    default: {
      const exhaustiveCheck: never = segment;
      return exhaustiveCheck;
    }
  }
}

function buildFoursomesSegmentInsert(
  fixtureId: string,
  segment: FoursomesSegmentSetup,
  idFactory: () => string,
  participantLookup: Map<string, FixtureParticipant>
): { row: SegmentInsert; players: SegmentPlayerInsert[] } {
  validateSegmentParticipants(segment.participants, participantLookup);
  validateSegmentHasBothTeams(segment.participants, segment.kind);
  const segmentId = segment.id ?? idFactory();

  return {
    row: {
      id: segmentId,
      fixture_id: fixtureId,
      kind: segment.kind,
      name: segment.name ?? null,
      hole_start: segment.holeStart,
      hole_end: segment.holeEnd,
      sort_order: segment.sortOrder,
      usa_player_id: null,
      europe_player_id: null,
    },
    players: segment.participants.map((participant) =>
      buildSegmentPlayerInsert(segmentId, participant, participantLookup)
    ),
  };
}

function buildSinglesSegmentInsert(
  fixtureId: string,
  segment: SinglesSegmentSetup,
  idFactory: () => string,
  participantLookup: Map<string, FixtureParticipant>
): { row: SegmentInsert; players: SegmentPlayerInsert[] } {
  const usaParticipant = getParticipantForTeam(segment.usaPlayerId, 'USA', participantLookup);
  const europeParticipant = getParticipantForTeam(segment.europePlayerId, 'EUROPE', participantLookup);
  const segmentId = segment.id ?? idFactory();

  return {
    row: {
      id: segmentId,
      fixture_id: fixtureId,
      kind: segment.kind,
      name: segment.name ?? null,
      hole_start: segment.holeStart,
      hole_end: segment.holeEnd,
      sort_order: segment.sortOrder,
      usa_player_id: usaParticipant.playerId,
      europe_player_id: europeParticipant.playerId,
    },
    players: [
      buildSegmentPlayerInsert(segmentId, usaParticipant, participantLookup),
      buildSegmentPlayerInsert(segmentId, europeParticipant, participantLookup),
    ],
  };
}

function buildSegmentPlayerInsert(
  segmentId: string,
  segmentParticipant: SegmentParticipant,
  participantLookup: Map<string, FixtureParticipant>
): SegmentPlayerInsert {
  const fixtureParticipant = getFixtureParticipant(segmentParticipant.playerId, participantLookup);

  if (fixtureParticipant.team !== segmentParticipant.team) {
    throw new Error(`Player ${segmentParticipant.playerId} is not on team ${segmentParticipant.team}`);
  }

  return {
    segment_id: segmentId,
    player_id: fixtureParticipant.playerId,
    team: fixtureParticipant.team,
    slot: segmentParticipant.slot ?? fixtureParticipant.slot,
  };
}

function createParticipantLookup(participants: FixtureParticipant[]): Map<string, FixtureParticipant> {
  return new Map(participants.map((participant) => [participant.playerId, participant]));
}

function validateFixtureParticipants(participants: FixtureParticipant[]): void {
  if (participants.length < 2 || participants.length > 6) {
    throw new Error('A fixture must have between 2 and 6 players');
  }

  const playerIds = new Set<string>();
  const teamSlots = new Set<string>();

  for (const participant of participants) {
    if (participant.slot < 1 || participant.slot > 6) {
      throw new Error(`Invalid fixture slot for player ${participant.playerId}: ${participant.slot}`);
    }

    if (playerIds.has(participant.playerId)) {
      throw new Error(`Duplicate fixture player: ${participant.playerId}`);
    }

    const teamSlot = `${participant.team}:${participant.slot}`;

    if (teamSlots.has(teamSlot)) {
      throw new Error(`Duplicate fixture team slot: ${teamSlot}`);
    }

    playerIds.add(participant.playerId);
    teamSlots.add(teamSlot);
  }
}

function validateSegmentSortOrders(segments: SegmentSetup[]): void {
  const sortOrders = new Set<number>();

  for (const segment of segments) {
    if (sortOrders.has(segment.sortOrder)) {
      throw new Error(`Duplicate segment sort order: ${segment.sortOrder}`);
    }

    sortOrders.add(segment.sortOrder);
  }
}

function validateSegmentParticipants(
  participants: SegmentParticipant[],
  participantLookup: Map<string, FixtureParticipant>
): void {
  if (participants.length < 2) {
    throw new Error('A segment must have at least 2 players');
  }

  const playerIds = new Set<string>();
  const teamSlots = new Set<string>();

  for (const participant of participants) {
    const fixtureParticipant = getFixtureParticipant(participant.playerId, participantLookup);
    const slot = participant.slot ?? fixtureParticipant.slot;
    const teamSlot = `${participant.team}:${slot}`;

    if (playerIds.has(participant.playerId)) {
      throw new Error(`Duplicate segment player: ${participant.playerId}`);
    }

    if (teamSlots.has(teamSlot)) {
      throw new Error(`Duplicate segment team slot: ${teamSlot}`);
    }

    playerIds.add(participant.playerId);
    teamSlots.add(teamSlot);
  }
}

function validateSegmentHasBothTeams(participants: SegmentParticipant[], kind: SegmentKind): void {
  const teams = new Set(participants.map((participant) => participant.team));

  if (!teams.has('USA') || !teams.has('EUROPE')) {
    throw new Error(`${kind} segment must include at least one USA player and one EUROPE player`);
  }
}

function validateHoleRange(segment: SegmentSetup): void {
  if (segment.holeStart < 1 || segment.holeEnd > 18 || segment.holeStart > segment.holeEnd) {
    throw new Error(`Invalid hole range for ${segment.kind} segment: ${segment.holeStart}-${segment.holeEnd}`);
  }
}

function getParticipantForTeam(
  playerId: string,
  team: Team,
  participantLookup: Map<string, FixtureParticipant>
): FixtureParticipant {
  const participant = getFixtureParticipant(playerId, participantLookup);

  if (participant.team !== team) {
    throw new Error(`Player ${playerId} is not on team ${team}`);
  }

  return participant;
}

function getFixtureParticipant(
  playerId: string,
  participantLookup: Map<string, FixtureParticipant>
): FixtureParticipant {
  const participant = participantLookup.get(playerId);

  if (!participant) {
    throw new Error(`Player ${playerId} is not assigned to this fixture`);
  }

  return participant;
}

function createRandomId(): string {
  return crypto.randomUUID();
}
