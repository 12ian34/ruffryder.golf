# CLAUDE.md

## Project Overview

**Ruff Ryders Cup** — A golf tournament management web app for tracking Ryder Cup-style team competitions between USA and Europe teams.

**Live URL**: https://ruffryder.golf

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite 7, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Testing**: Vitest, React Testing Library
- **Analytics**: PostHog
- **Deployment**: Netlify
- **Charts**: Chart.js + react-chartjs-2

### Key Features
- Tournament creation and management with completion locking
- Player handicap tracking (historical scores → average calculation)
- Match play scoring with handicap adjustments
- Fourball pairing system (two matchups share a `fourballId`)
- Real-time leaderboards and score updates
- Offline mode with local persistence and sync
- Player yearly statistics tracking
- Admin controls for tournament completion
- Dark mode support

---

## Project Structure

```
src/
├── components/           # React components
│   ├── player/           # Player management (edit, table, filters)
│   ├── scorecard/        # Score entry UI
│   ├── shared/           # Reusable display components
│   ├── tournament/       # Tournament setup, matchups, fourball pairing
│   └── filters/          # Status filters
├── hooks/                # Custom React hooks (data fetching, auth)
├── services/             # Firebase service layer (matchupService)
├── types/                # TypeScript interfaces (game, player, tournament, user)
├── utils/                # Business logic (handicapScoring, gamePoints, analytics)
├── pages/                # Route pages (Dashboard, Login, ScoreEntry, etc.)
├── contexts/             # React contexts (Auth, Theme)
└── config/               # Firebase configuration
```

---

## Changelog

### 2026-01-06
- Upgraded Node.js from 18.17.0 → 22
- Upgraded Firebase from 10.x → 12.7.0 (fixes undici vulnerability)
- Fixed CodeQL "tainted format string" alert in `matchupService.ts`
- Fixed Vite 7 terserOptions type error
- Removed unused dependencies (TipTap packages, react-dropzone)
- Cleaned up debug console.log statements across codebase
- Extracted duplicate player stats calculation into `calculateBasePlayerStats` helper
- Added `PreviewPlayerStats` interface with proper `HistoricalScore` types
- Removed unused `showInfoToast` export from toast utils
- Added 28 unit tests for `statsAnalysis.ts` (fun facts generation)
- Added 17 unit tests for `gamePoints.ts` (all 9 point table combinations)
- Added 33 unit tests for `matchupService.ts` (fourball pairing, unpair, permissions)
- Added 11 unit tests for `toast.ts` (success/error toast utilities)
- Added 12 unit tests for `analytics.ts` (PostHog tracking, user identification)
- Test count: 301 total tests across 21 test files
- Coverage improvements: `matchupService.ts` 0%→96%, `toast.ts` 0%→100%, `analytics.ts` 0%→90%
- Added toast notifications for better user feedback:
  - `GameCompletionModal`: Success/error toasts when completing games
  - `GameList`: Success toast on game status change, error toast surfacing tournament lock messages
  - `PlayerManagement`: Error toasts for player save/delete failures
  - `UserManagement`: Error toast for user update failures
  - `usePlayerData`: Re-throws errors for proper toast handling in UI
- Added comprehensive Firebase/Firestore documentation section:
  - Full document schemas for all collections (users, players, tournaments, games, config)
  - User ↔ Player linking explanation (`linkedPlayerId`)
  - Security rules summary table
  - Firebase CLI commands for deploying rules/indexes
  - Emulator configuration details

### Recent Completed Features
- **Tournament Complete Flag System**: Admin toggle to lock tournaments (`isComplete` field)
- **Player Yearly Statistics**: Save player performance to `playerYearlyStats` collection on tournament completion
- **Year Selection Modal**: Choose year when finalizing tournament scores
- **Score Preview**: Preview player stats before saving

---

## Core Application Logic

### Game Structure

Each **Game** represents a head-to-head match between one USA player and one EUROPE player:

```typescript
Game {
  id: string;
  tournamentId: string;
  usaPlayerId, europePlayerId: string;
  usaPlayerName, europePlayerName: string;
  usaPlayerHandicap?, europePlayerHandicap?: number;
  handicapStrokes: number;           // Absolute difference between handicaps
  higherHandicapTeam: 'USA' | 'EUROPE';  // Who gets the strokes
  holes: HoleScore[18];              // 18 holes per game
  status: 'not_started' | 'in_progress' | 'complete';
  isStarted, isComplete: boolean;
  allowedEditors?: string[];         // Player IDs who can edit (for fourballs)
}
```

Each **HoleScore** tracks:
- `holeNumber` (1-18), `strokeIndex` (1-18, 1 = hardest), `parScore`
- `usaPlayerScore`, `europePlayerScore` (raw scores, `null` if not entered)
- `usaPlayerAdjustedScore`, `europePlayerAdjustedScore` (with handicap strokes)
- `usaPlayerMatchPlayScore`, `europePlayerMatchPlayScore` (0 or 1 per hole)
- Adjusted match play scores (same but using adjusted scores)

### Handicap System

**Player handicap** = `averageScore` field (optional `number | undefined`)

**Calculation** (in `PlayerEditModal.tsx`):
1. Take player's `historicalScores` array (year + score pairs)
2. Sort by year descending, take last 3 years
3. Calculate average, round to nearest integer
4. Can be manually overridden via "Direct Average Score" input

**Handicap application** (in `handicapScoring.ts`):
1. `handicapStrokes` = `|player1.averageScore - player2.averageScore|`
2. `higherHandicapTeam` = team of player with higher averageScore
3. Strokes are added to the **lower** handicap player's score (opponent gets easier comparison)
4. Distribution based on hole `strokeIndex`:
   - `fullCycles = floor(handicapStrokes / 18)` — everyone gets this many per hole
   - `remainingStrokes = handicapStrokes % 18` — holes with strokeIndex ≤ remaining get +1
   - Example: 25 strokes = 1 stroke on all holes + 1 extra on holes with strokeIndex 1-7

### Scoring System

**Two parallel scoring modes per game:**

1. **Stroke Play**: Total strokes over 18 holes (lower is better)
   - `strokePlayScore.USA` / `strokePlayScore.EUROPE` (raw)
   - `strokePlayScore.adjustedUSA` / `strokePlayScore.adjustedEUROPE` (with handicap)

2. **Match Play**: Holes won (higher is better)
   - Each hole: lower score = 1 point, tie = 0-0
   - `matchPlayScore.USA` / `matchPlayScore.EUROPE` (raw)
   - Adjusted versions use handicap-adjusted hole scores

### Points System (per game)

**2 points available per game** (calculated in `gamePoints.ts`):

| Stroke Play | Match Play | USA Points | EUROPE Points |
|-------------|------------|------------|---------------|
| USA wins    | USA wins   | 2          | 0             |
| EUROPE wins | EUROPE wins| 0          | 2             |
| USA wins    | EUROPE wins| 1          | 1             |
| EUROPE wins | USA wins   | 1          | 1             |
| Tie         | USA wins   | 0.5        | 1.5           |
| Tie         | EUROPE wins| 1.5        | 0.5           |
| USA wins    | Tie        | 1.5        | 0.5           |
| EUROPE wins | Tie        | 0.5        | 1.5           |
| Tie         | Tie        | 1          | 1             |

Both `raw` and `adjusted` points are tracked separately.

### Fourball System

**Fourball** = Two matchups playing together (4 players total)

- Matchups share a `fourballId` (UUID)
- When paired, `allowedEditors` array on each Game is set to all 4 player IDs
- Any player in the fourball can edit any game in that fourball
- Pairing/unpairing via `matchupService.ts`:
  - `pairMatchups(tournamentId, matchup1Id, matchup2Id)` — assigns shared fourballId
  - `unpairFourball(tournamentId, fourballId)` — removes fourballId from matchups
  - `updateGamePermissionsForFourball()` — syncs `allowedEditors` arrays

### Tournament Lifecycle

1. **Create Tournament**: Name, year, `useHandicaps` flag, `teamConfig`
2. **Create Matchups**: Pair USA vs EUROPE players, stored in `tournament.matchups[]`
3. **Create Games**: Each matchup becomes a Game document in subcollection
4. **Score Entry**: Players/admins enter hole-by-hole scores
5. **Real-time Updates**: `updateTournamentScores()` recalculates totals after each score change
6. **Complete Tournament**: Admin marks `isComplete: true`, optionally saves player stats

**Tournament scores** (stored on Tournament document):
- `totalScore.raw/adjusted` — points from completed games only
- `projectedScore.raw/adjusted` — points from all games (including in-progress)
- `progress[]` — timestamped snapshots for charting

### Tournament Completion Lock

When `tournament.isComplete === true`:
- Game status changes are blocked (can't mark as in_progress/complete)
- Must unmark tournament as incomplete first to make changes
- Enforced in `useGameData.handleGameStatusChange()`

---

## Firebase / Firestore

### Document Schemas

#### `users/{id}`
```typescript
User {
  id: string;                    // Firebase Auth UID
  email: string;
  name: string;
  isAdmin: boolean;
  linkedPlayerId: string | null; // Links user account → player profile
  team: 'USA' | 'EUROPE' | null;
  customEmoji?: string;          // Optional display emoji
  createdAt: Timestamp;
}
```

#### `players/{id}`
```typescript
Player {
  id: string;
  name: string;
  team: 'USA' | 'EUROPE';
  tier?: number;
  historicalScores: { year: number; score: number }[];
  averageScore?: number;         // Calculated handicap (avg of last 3 years)
  customEmoji?: string;
}
```

#### `tournaments/{id}`
```typescript
Tournament {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  isComplete?: boolean;          // Locks tournament from edits
  useHandicaps: boolean;
  teamConfig: 'USA_VS_EUROPE' | 'EUROPE_VS_EUROPE' | 'USA_VS_USA';
  handicapStrokes: number;
  higherHandicapTeam: 'USA' | 'EUROPE';
  matchups: Matchup[];           // Array of matchup objects
  totalScore: { raw: { USA, EUROPE }, adjusted: { USA, EUROPE } };
  projectedScore: { raw: { USA, EUROPE }, adjusted: { USA, EUROPE } };
  progress: TournamentProgress[]; // Timestamped score snapshots
  createdAt: string;
  updatedAt: string;
}
```

#### `tournaments/{id}/games/{gameId}`
```typescript
Game {
  id: string;
  tournamentId: string;
  usaPlayerId, europePlayerId: string;
  usaPlayerName, europePlayerName: string;
  usaPlayerHandicap?, europePlayerHandicap?: number;
  handicapStrokes: number;
  higherHandicapTeam: 'USA' | 'EUROPE';
  holes: HoleScore[18];
  strokePlayScore: { USA, EUROPE, adjustedUSA, adjustedEUROPE };
  matchPlayScore: { USA, EUROPE, adjustedUSA, adjustedEUROPE };
  points: { raw: { USA, EUROPE }, adjusted: { USA, EUROPE } };
  status: 'not_started' | 'in_progress' | 'complete';
  isStarted, isComplete: boolean;
  playerIds: string[];           // Both player IDs for quick lookup
  allowedEditors?: string[];     // Player IDs who can edit (for fourballs)
  useHandicaps?: boolean;
  startTime?, endTime?: Date;
  updatedAt?: Timestamp;
}
```

#### `config/strokeIndices`
```typescript
StrokeIndices {
  indices: number[];  // Array of 18 numbers (1-18, each used exactly once)
                      // Index = hole number (0-17), value = stroke index
}
```

#### Other Collections
| Collection | Purpose |
|------------|---------|
| `playerYearlyStats` | Historical player performance by year |
| `tournamentYearlyStats` | Tournament summaries by year |
| `tournamentScores` | Final tournament scores when marked complete |

### User ↔ Player Linking

The `linkedPlayerId` field on User connects authentication to player profiles:
- When set, user can edit games where they are a participant
- Checked via `getUserLinkedPlayerId()` in security rules
- Set by admin in User Management

### Security Rules Summary

Rules are defined in `firestore.rules`:

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| `users` | All authenticated | Own user only | Own: name/emoji only; Admin: all | Admin only |
| `players` | All authenticated | Admin only | Admin, or linked user (emoji only) | Admin only |
| `tournaments` | All authenticated | Admin only | Admin, or any linked player | Admin only |
| `games` (subcollection) | All authenticated | Admin only | Admin, or player in game/`allowedEditors` | Admin only |
| `config` | All authenticated | Admin only | Admin only | Admin only |

**Key permission checks:**
- `isAdmin()` — checks `users/{uid}.isAdmin == true`
- `getUserLinkedPlayerId()` — returns user's `linkedPlayerId` for game edit checks
- Game edits by players are restricted to specific fields: `holes`, `strokePlayScore`, `matchPlayScore`, `points`, `status`, `isStarted`, `isComplete`, `endTime`, `updatedAt`

### Firestore Indexes

Defined in `firestore.indexes.json`:
- Composite index on `tournaments`: `isActive` + `status` + `createdAt DESC`

### Firebase CLI Commands

```bash
# Deploy Firestore rules (requires firebase-tools)
npx firebase deploy --only firestore:rules

# Deploy Firestore indexes
npx firebase deploy --only firestore:indexes

# Deploy both rules and indexes
npx firebase deploy --only firestore

# Test rules locally with emulator
npx firebase emulators:start
```

**Important:** After editing `firestore.rules`, you must deploy to production:
```bash
npx firebase deploy --only firestore:rules
```

Emulator ports (configured in `firebase.json`):
- Auth: `localhost:9099`
- Firestore: `localhost:8080`
- Storage: `localhost:9199`
- Emulator UI: `localhost:4000`

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 5173)
npm run build        # Type-check + production build
npm run type-check   # TypeScript validation only
npx vitest run       # Run test suite
npm run lint         # ESLint check
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `firestore.rules` | Firestore security rules (deploy with `npx firebase deploy --only firestore:rules`) |
| `firestore.indexes.json` | Firestore composite indexes |
| `src/types/player.ts` | Player interface (`averageScore?: number`), `HistoricalScore` type |
| `src/types/tournament.ts` | Tournament, Matchup interfaces |
| `src/types/game.ts` | Game, HoleScore interfaces |
| `src/utils/handicapScoring.ts` | `calculateHandicapAdjustedScores()` — per-hole handicap logic |
| `src/utils/gamePoints.ts` | `calculateGamePoints()` — stroke/match play → points |
| `src/utils/tournamentScores.ts` | `updateTournamentScores()` — aggregate tournament totals |
| `src/utils/statsAnalysis.ts` | `generateFunFacts()` — tournament statistics and highlights |
| `src/services/matchupService.ts` | Fourball pairing operations |
| `src/hooks/useGameData.ts` | Game fetching, status changes, fourball permissions |
| `src/utils/toast.ts` | `showSuccessToast()`, `showErrorToast()` — user feedback notifications |
| `src/components/TournamentManagement.tsx` | Admin tournament controls |
| `src/components/player/PlayerEditModal.tsx` | Handicap calculation from historical scores |

---

## Key Conventions

- **Handicap**: `averageScore` field on Player (optional, calculated from last 3 years of historical scores)
- **Match Play Scoring**: Lower adjusted score wins the hole (1 point)
- **Fourball**: Two matchups paired share a `fourballId`, players can edit each other's games
- **Tournament Lock**: `isComplete: true` prevents game status changes
- **Game Status**: `'not_started' | 'in_progress' | 'complete'`
- **Teams**: `'USA' | 'EUROPE'`
- **Toast Notifications**: Use `showSuccessToast()`/`showErrorToast()` from `utils/toast.ts` for user feedback on CRUD operations

---

## Known Considerations

- `averageScore` is optional (`number | undefined`) — new players may not have one
- Console statements use object arguments (not template literals) for CodeQL security
- Firebase SDK 12+ no longer bundles vulnerable `undici` package
- Offline mode uses localStorage for persistence
- Game `allowedEditors` array controls who can edit scores in fourballs
- Historical scores sorted by year descending; only last 3 used for handicap calculation
- Handicap strokes favor the weaker player by adding to opponent's adjusted score
