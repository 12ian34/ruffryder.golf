import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, DocumentReference, GeoPoint } from 'firebase-admin/firestore';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const outputPath = getArgValue('--out') ?? `firebase-export-${new Date().toISOString().slice(0, 10)}.json`;
const env = readEnvFile('.env');
const projectId = getArgValue('--project-id') ?? env.FIREBASE_PROJECT_ID;
const serviceAccountPath =
  getArgValue('--service-account') ??
  env.FIREBASE_SERVICE_ACCOUNT_PATH ??
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!projectId) {
  console.error('Missing Firebase project ID. Set FIREBASE_PROJECT_ID in .env.');
  process.exit(1);
}

initializeFirebase({ projectId, serviceAccountPath });

const db = getFirestore();
const players = await exportCollection('players');
const users = await exportCollection('users');
const config = await exportCollection('config');
const tournaments = await exportCollection('tournaments');
const gamesByTournamentId = {};

for (const tournament of tournaments) {
  gamesByTournamentId[tournament.id] = await exportSubcollection(
    'tournaments',
    tournament.id,
    'games'
  );
}

const exportData = {
  exportedAt: new Date().toISOString(),
  projectId,
  players: toObjectById(players),
  users: toObjectById(users),
  config: toObjectById(config),
  tournaments: toObjectById(tournaments),
  gamesByTournamentId: Object.fromEntries(
    Object.entries(gamesByTournamentId).map(([tournamentId, games]) => [
      tournamentId,
      toObjectById(games),
    ])
  ),
};

mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(exportData, null, 2)}\n`);

console.log('Firebase export complete:', {
  outputPath,
  players: players.length,
  users: users.length,
  config: config.length,
  tournaments: tournaments.length,
  games: Object.values(gamesByTournamentId).reduce((sum, games) => sum + games.length, 0),
});

async function exportCollection(collectionPath) {
  const snapshot = await db.collection(collectionPath).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: serializeFirestoreValue(doc.data()),
  }));
}

async function exportSubcollection(parentCollection, parentId, subcollection) {
  const snapshot = await db.collection(parentCollection).doc(parentId).collection(subcollection).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: serializeFirestoreValue(doc.data()),
  }));
}

function initializeFirebase({ projectId, serviceAccountPath }) {
  if (getApps().length > 0) return;

  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

function serializeFirestoreValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof DocumentReference) {
    return value.path;
  }

  if (value instanceof GeoPoint) {
    return {
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeFirestoreValue(nestedValue)])
    );
  }

  return value;
}

function toObjectById(documents) {
  return Object.fromEntries(documents.map((doc) => [doc.id, doc.data]));
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const inlineValue = args.find((arg) => arg.startsWith(prefix));

  if (inlineValue) {
    return inlineValue.slice(prefix.length);
  }

  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readEnvFile(path) {
  try {
    const envText = readFileSync(path, 'utf8');

    return Object.fromEntries(
      envText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const separatorIndex = line.indexOf('=');
          const key = line.slice(0, separatorIndex);
          const value = line.slice(separatorIndex + 1).replace(/^['"]|['"]$/g, '');

          return [key, value];
        })
    );
  } catch {
    return {};
  }
}
