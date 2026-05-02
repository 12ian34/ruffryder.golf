import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const exportPath = args.find((arg) => !arg.startsWith('--'));
const shouldApply = args.includes('--apply');

if (!exportPath) {
  console.error('Usage: node scripts/migrate-firebase-export.mjs <firebase-export.json> [--apply]');
  process.exit(1);
}

const env = readEnvFile('.env');
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const rawExport = JSON.parse(readFileSync(exportPath, 'utf8'));
const exportData = normalizeExport(rawExport);
const counts = {
  players: exportData.players.length,
  users: exportData.users.length,
  tournaments: exportData.tournaments.length,
  games: Object.values(exportData.gamesByTournamentId).reduce((sum, games) => sum + games.length, 0),
};

console.log('Firebase export counts:', counts);

const warnings = validateExport(exportData);
for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

if (!shouldApply) {
  console.log('Dry run only. Re-run with --apply to write to Supabase.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const playerRows = exportData.players.map(mapPlayer);
const { data: insertedPlayers, error: playersError } = await supabase
  .from('players')
  .upsert(playerRows, { onConflict: 'legacy_firebase_id' })
  .select('id, legacy_firebase_id');

throwIfError(playersError, 'Failed to import players');

const playerIdByLegacyId = new Map(
  (insertedPlayers ?? [])
    .filter((player) => player.legacy_firebase_id)
    .map((player) => [player.legacy_firebase_id, player.id])
);

const tournamentRows = exportData.tournaments.map(mapTournament);
const { data: insertedTournaments, error: tournamentsError } = await supabase
  .from('legacy_tournaments')
  .upsert(tournamentRows, { onConflict: 'legacy_firebase_id' })
  .select('id, legacy_firebase_id');

throwIfError(tournamentsError, 'Failed to import legacy tournaments');

const tournamentIdByLegacyId = new Map(
  (insertedTournaments ?? [])
    .filter((tournament) => tournament.legacy_firebase_id)
    .map((tournament) => [tournament.legacy_firebase_id, tournament.id])
);

const gameRows = exportData.tournaments.flatMap((tournament) => {
  const legacyTournamentId = tournamentIdByLegacyId.get(tournament.id);
  if (!legacyTournamentId) return [];

  return (exportData.gamesByTournamentId[tournament.id] ?? []).map((game) =>
    mapGame(game, legacyTournamentId, playerIdByLegacyId)
  );
});

if (gameRows.length > 0) {
  const { error: gamesError } = await supabase
    .from('legacy_games')
    .upsert(gameRows, { onConflict: 'legacy_tournament_id,legacy_firebase_id' });

  throwIfError(gamesError, 'Failed to import legacy games');
}

const statsRows = exportData.players.flatMap((player) => {
  const playerId = playerIdByLegacyId.get(player.id);
  if (!playerId) return [];

  return mapHistoricalScores(player, playerId, tournamentIdByLegacyId);
});

if (statsRows.length > 0) {
  const { error: statsError } = await supabase
    .from('player_tournament_stats')
    .upsert(statsRows, { onConflict: 'id' });
  throwIfError(statsError, 'Failed to import player tournament stats');
}

if (exportData.users.length > 0) {
  console.log(
    'User profile import skipped. Create/import Supabase Auth users first, then map Firebase UIDs to auth user IDs.'
  );
}

console.log('Migration import complete:', {
  players: playerRows.length,
  legacyTournaments: tournamentRows.length,
  legacyGames: gameRows.length,
  playerTournamentStats: statsRows.length,
});

function normalizeExport(raw) {
  return {
    players: normalizeCollection(raw.players),
    users: normalizeCollection(raw.users),
    tournaments: normalizeCollection(raw.tournaments),
    gamesByTournamentId: normalizeGamesByTournament(raw.gamesByTournamentId ?? raw.games ?? {}),
  };
}

function normalizeCollection(value) {
  if (Array.isArray(value)) {
    return value.map((item) => ('data' in item ? item : { id: item.id, data: item }));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).map(([id, data]) => ({ id, data }));
  }

  return [];
}

function normalizeGamesByTournament(value) {
  const entries = Object.entries(value);
  return Object.fromEntries(entries.map(([tournamentId, games]) => [tournamentId, normalizeCollection(games)]));
}

function validateExport(exportData) {
  const warnings = [];

  if (exportData.players.length === 0) warnings.push('No players found');
  if (exportData.tournaments.length === 0) warnings.push('No tournaments found');

  for (const tournament of exportData.tournaments) {
    if ((exportData.gamesByTournamentId[tournament.id] ?? []).length === 0) {
      warnings.push(`Tournament ${tournament.id} has no games`);
    }
  }

  return warnings;
}

function mapPlayer(doc) {
  if (!doc.data.name || !doc.data.team) {
    throw new Error(`Player ${doc.id} is missing name or team`);
  }

  return {
    legacy_firebase_id: doc.id,
    name: doc.data.name,
    team: doc.data.team,
    current_cpi: doc.data.averageScore ?? null,
    custom_emoji: doc.data.customEmoji ?? null,
  };
}

function mapTournament(doc) {
  if (!doc.data.name || typeof doc.data.year !== 'number') {
    throw new Error(`Tournament ${doc.id} is missing name or year`);
  }

  return {
    legacy_firebase_id: doc.id,
    name: doc.data.name,
    year: doc.data.year,
    is_complete: doc.data.isComplete ?? false,
    completed_at: toIsoString(doc.data.completedAt),
    total_raw_usa: doc.data.totalScore?.raw?.USA ?? 0,
    total_raw_europe: doc.data.totalScore?.raw?.EUROPE ?? 0,
    total_legacy_adjusted_usa: doc.data.totalScore?.adjusted?.USA ?? 0,
    total_legacy_adjusted_europe: doc.data.totalScore?.adjusted?.EUROPE ?? 0,
    projected_raw_usa: doc.data.projectedScore?.raw?.USA ?? 0,
    projected_raw_europe: doc.data.projectedScore?.raw?.EUROPE ?? 0,
    projected_legacy_adjusted_usa: doc.data.projectedScore?.adjusted?.USA ?? 0,
    projected_legacy_adjusted_europe: doc.data.projectedScore?.adjusted?.EUROPE ?? 0,
    source_payload: doc.data,
  };
}

function mapGame(doc, legacyTournamentId, playerIdByLegacyId) {
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
    holes: doc.data.holes ?? [],
    source_payload: doc.data,
  };
}

function mapHistoricalScores(playerDoc, playerId, tournamentIdByLegacyId) {
  return (playerDoc.data.historicalScores ?? [])
    .filter((score) => typeof score.year === 'number' && typeof score.score === 'number')
    .map((score, index) => ({
      id: createDeterministicUuid(
        `player-stat:${playerDoc.id}:${index}:${score.year}:${score.tournamentId ?? 'none'}`
      ),
      player_id: playerId,
      tournament_id: null,
      source: 'migrated_firestore',
      completion_year: score.year,
      singles_strokes: score.totalStrokes ?? 0,
      singles_average: score.score,
      holes_won: score.holesWon ?? 0,
      cpi_after: score.score,
      legacy_payload: score,
      completed_at: getHistoricalScoreCompletedAt(score),
    }));
}

function getHistoricalScoreCompletedAt(score) {
  return toIsoString(score.completedAt) ?? `${score.year}-12-31T00:00:00.000Z`;
}

function createDeterministicUuid(value) {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);

  return [
    hex.slice(0, 8).join(''),
    hex.slice(8, 12).join(''),
    hex.slice(12, 16).join(''),
    hex.slice(16, 20).join(''),
    hex.slice(20, 32).join(''),
  ].join('-');
}

function toIsoString(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const milliseconds = value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1_000_000);
    return new Date(milliseconds).toISOString();
  }
  return null;
}

function throwIfError(error, message) {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
}

function readEnvFile(path) {
  const text = readFileSync(path, 'utf8');
  const values = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;

    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}
