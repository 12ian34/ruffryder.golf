import type { Database, Json } from '../../types/supabase';

type PlayerInsert = Database['public']['Tables']['players']['Insert'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type LegacyTournamentInsert = Database['public']['Tables']['legacy_tournaments']['Insert'];
type LegacyGameInsert = Database['public']['Tables']['legacy_games']['Insert'];
type PlayerTournamentStatsInsert = Database['public']['Tables']['player_tournament_stats']['Insert'];
type Team = Database['public']['Enums']['app_team'];

export interface FirebaseDocument<T> {
  id: string;
  data: T;
}

export interface LegacyHistoricalScore {
  year?: number;
  score?: number;
  scoreAdjusted?: number;
  tournamentName?: string;
  tournamentId?: string;
  gamesPlayed?: number;
  totalStrokes?: number;
  totalStrokesAdjusted?: number;
  holesWon?: number;
  holesWonAdjusted?: number;
  pointsEarned?: number;
  pointsEarnedAdjusted?: number;
  completedAt?: unknown;
}

export interface LegacyPlayer {
  name?: string;
  team?: Team;
  averageScore?: number;
  customEmoji?: string;
  historicalScores?: LegacyHistoricalScore[];
}

export interface LegacyUser {
  email?: string;
  name?: string;
  isAdmin?: boolean;
  linkedPlayerId?: string | null;
  team?: Team | null;
  customEmoji?: string;
  createdAt?: unknown;
}

export interface LegacyTournament {
  name?: string;
  year?: number;
  isComplete?: boolean;
  completedAt?: unknown;
  totalScore?: LegacyTeamScores;
  projectedScore?: LegacyTeamScores;
}

export interface LegacyGame {
  usaPlayerId?: string;
  europePlayerId?: string;
  usaPlayerName?: string;
  europePlayerName?: string;
  status?: string;
  useHandicaps?: boolean;
  handicapStrokes?: number;
  higherHandicapTeam?: Team;
  strokePlayScore?: {
    USA?: number;
    EUROPE?: number;
    adjustedUSA?: number;
    adjustedEUROPE?: number;
  };
  matchPlayScore?: {
    USA?: number;
    EUROPE?: number;
    adjustedUSA?: number;
    adjustedEUROPE?: number;
  };
  points?: LegacyTeamScores;
  holes?: unknown[];
}

export interface LegacyTeamScores {
  raw?: {
    USA?: number;
    EUROPE?: number;
  };
  adjusted?: {
    USA?: number;
    EUROPE?: number;
  };
}

export interface MigrationValidationResult {
  errors: string[];
  warnings: string[];
}

export function mapFirebasePlayer(doc: FirebaseDocument<LegacyPlayer>): PlayerInsert {
  if (!doc.data.name) {
    throw new Error(`Player ${doc.id} is missing a name`);
  }

  if (!doc.data.team) {
    throw new Error(`Player ${doc.id} is missing a team`);
  }

  return {
    legacy_firebase_id: doc.id,
    name: doc.data.name,
    team: doc.data.team,
    current_cpi: doc.data.averageScore ?? null,
    custom_emoji: doc.data.customEmoji ?? null,
  };
}

export function mapFirebaseUserToProfile(
  doc: FirebaseDocument<LegacyUser>,
  authUserIdByFirebaseUid: Map<string, string>,
  playerIdByLegacyId: Map<string, string>
): ProfileInsert {
  const authUserId = authUserIdByFirebaseUid.get(doc.id);

  if (!authUserId) {
    throw new Error(`User ${doc.id} does not have a Supabase auth user id`);
  }

  if (!doc.data.email) {
    throw new Error(`User ${doc.id} is missing an email`);
  }

  return {
    id: authUserId,
    firebase_uid: doc.id,
    email: doc.data.email,
    display_name: doc.data.name ?? doc.data.email,
    is_admin: doc.data.isAdmin ?? false,
    linked_player_id: doc.data.linkedPlayerId ? playerIdByLegacyId.get(doc.data.linkedPlayerId) ?? null : null,
    team: doc.data.team ?? null,
    custom_emoji: doc.data.customEmoji ?? null,
    created_at: toIsoString(doc.data.createdAt) ?? undefined,
  };
}

export function mapFirebaseTournament(doc: FirebaseDocument<LegacyTournament>): LegacyTournamentInsert {
  if (!doc.data.name) {
    throw new Error(`Tournament ${doc.id} is missing a name`);
  }

  if (typeof doc.data.year !== 'number') {
    throw new Error(`Tournament ${doc.id} is missing a numeric year`);
  }

  return {
    legacy_firebase_id: doc.id,
    name: doc.data.name,
    year: doc.data.year,
    is_complete: doc.data.isComplete ?? false,
    completed_at: toIsoString(doc.data.completedAt) ?? null,
    total_raw_usa: doc.data.totalScore?.raw?.USA ?? 0,
    total_raw_europe: doc.data.totalScore?.raw?.EUROPE ?? 0,
    total_legacy_adjusted_usa: doc.data.totalScore?.adjusted?.USA ?? 0,
    total_legacy_adjusted_europe: doc.data.totalScore?.adjusted?.EUROPE ?? 0,
    projected_raw_usa: doc.data.projectedScore?.raw?.USA ?? 0,
    projected_raw_europe: doc.data.projectedScore?.raw?.EUROPE ?? 0,
    projected_legacy_adjusted_usa: doc.data.projectedScore?.adjusted?.USA ?? 0,
    projected_legacy_adjusted_europe: doc.data.projectedScore?.adjusted?.EUROPE ?? 0,
    source_payload: toJson(doc.data),
  };
}

export function mapFirebaseGame(
  doc: FirebaseDocument<LegacyGame>,
  legacyTournamentId: string,
  playerIdByLegacyId: Map<string, string>
): LegacyGameInsert {
  if (!doc.data.usaPlayerName || !doc.data.europePlayerName) {
    throw new Error(`Game ${doc.id} is missing player names`);
  }

  return {
    legacy_firebase_id: doc.id,
    legacy_tournament_id: legacyTournamentId,
    usa_player_legacy_id: doc.data.usaPlayerId ?? null,
    europe_player_legacy_id: doc.data.europePlayerId ?? null,
    usa_player_id: doc.data.usaPlayerId ? playerIdByLegacyId.get(doc.data.usaPlayerId) ?? null : null,
    europe_player_id: doc.data.europePlayerId ? playerIdByLegacyId.get(doc.data.europePlayerId) ?? null : null,
    usa_player_name: doc.data.usaPlayerName,
    europe_player_name: doc.data.europePlayerName,
    status: doc.data.status ?? 'unknown',
    use_legacy_handicap: doc.data.useHandicaps ?? false,
    legacy_handicap_strokes: doc.data.handicapStrokes ?? 0,
    legacy_higher_handicap_team: doc.data.higherHandicapTeam ?? null,
    stroke_raw_usa: doc.data.strokePlayScore?.USA ?? 0,
    stroke_raw_europe: doc.data.strokePlayScore?.EUROPE ?? 0,
    stroke_legacy_adjusted_usa: doc.data.strokePlayScore?.adjustedUSA ?? 0,
    stroke_legacy_adjusted_europe: doc.data.strokePlayScore?.adjustedEUROPE ?? 0,
    match_raw_usa: doc.data.matchPlayScore?.USA ?? 0,
    match_raw_europe: doc.data.matchPlayScore?.EUROPE ?? 0,
    match_legacy_adjusted_usa: doc.data.matchPlayScore?.adjustedUSA ?? 0,
    match_legacy_adjusted_europe: doc.data.matchPlayScore?.adjustedEUROPE ?? 0,
    points_raw_usa: doc.data.points?.raw?.USA ?? 0,
    points_raw_europe: doc.data.points?.raw?.EUROPE ?? 0,
    points_legacy_adjusted_usa: doc.data.points?.adjusted?.USA ?? 0,
    points_legacy_adjusted_europe: doc.data.points?.adjusted?.EUROPE ?? 0,
    holes: toJson(doc.data.holes ?? []),
    source_payload: toJson(doc.data),
  };
}

export function mapHistoricalScoresToStats(
  playerDoc: FirebaseDocument<LegacyPlayer>,
  playerId: string,
  _tournamentIdByLegacyId: Map<string, string>
): PlayerTournamentStatsInsert[] {
  return (playerDoc.data.historicalScores ?? [])
    .filter((score) => typeof score.year === 'number' && typeof score.score === 'number')
    .map((score, index) => ({
      id: createDeterministicUuid(
        `player-stat:${playerDoc.id}:${index}:${score.year}:${score.tournamentId ?? 'none'}`
      ),
      player_id: playerId,
      tournament_id: null,
      source: 'migrated_firestore',
      completion_year: score.year as number,
      singles_holes_played: 0,
      singles_strokes: score.totalStrokes ?? 0,
      singles_average: score.score ?? null,
      holes_won: score.holesWon ?? 0,
      holes_halved: 0,
      cpi_after: score.score ?? null,
      legacy_payload: toJson(score),
      completed_at: getHistoricalScoreCompletedAt(score),
    }));
}

export function validateFirebaseExportCounts(input: {
  players: FirebaseDocument<LegacyPlayer>[];
  tournaments: FirebaseDocument<LegacyTournament>[];
  gamesByTournamentId: Record<string, FirebaseDocument<LegacyGame>[]>;
}): MigrationValidationResult {
  const result: MigrationValidationResult = { errors: [], warnings: [] };

  if (input.players.length === 0) {
    result.warnings.push('No players found in Firebase export');
  }

  if (input.tournaments.length === 0) {
    result.warnings.push('No tournaments found in Firebase export');
  }

  for (const tournament of input.tournaments) {
    const games = input.gamesByTournamentId[tournament.id] ?? [];

    if (games.length === 0) {
      result.warnings.push(`Tournament ${tournament.id} has no exported games`);
    }
  }

  return result;
}

function toIsoString(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const timestamp = value as { seconds: number; nanoseconds?: number };
    const milliseconds = timestamp.seconds * 1000 + Math.floor((timestamp.nanoseconds ?? 0) / 1_000_000);
    return new Date(milliseconds).toISOString();
  }

  return null;
}

function getHistoricalScoreCompletedAt(score: LegacyHistoricalScore): string {
  return toIsoString(score.completedAt) ?? `${score.year}-12-31T00:00:00.000Z`;
}

function createDeterministicUuid(value: string): string {
  const encoder = new TextEncoder();
  const bytes = Array.from(encoder.encode(value));
  const hash = bytes.reduce((parts, byte, index) => {
    parts[index % parts.length] = (parts[index % parts.length] + byte + index) % 256;
    return parts;
  }, Array.from({ length: 16 }, () => 0));

  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.map((byte) => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
