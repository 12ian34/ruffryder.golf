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
npm run lint         # ESLint check
```

### Environment Variables

Create a `.env` file (or set in Netlify dashboard):

```bash
# Firebase (required)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# PostHog Analytics (required for tracking)
VITE_POSTHOG_API_KEY=
VITE_POSTHOG_HOST=https://eu.i.posthog.com  # optional, defaults to EU

# Local Development (optional)
VITE_USE_FIREBASE_EMULATOR=true  # connects to local emulators
VITE_POSTHOG_DEBUG=true          # enables PostHog debug mode
```

### Deployment

**Netlify** handles deployment automatically:
- Every merge to `main` triggers a build and deploys to production
- Build command: `npm install && npx vitest run && npm run build`
- Tests must pass before deployment succeeds
- Node.js 22, SPA redirects configured in `netlify.toml`

Live site: https://ruffryder.golf

---

## Testing

Tests are in `src/__tests__/` (21 test files, 301+ tests).

```bash
npx vitest run              # Run all tests once
npx vitest                  # Watch mode
npx vitest run --coverage   # With coverage report
npx vitest run handicap     # Run tests matching "handicap"
```

**Test organization:**
- Unit tests for utils (`gamePoints.test.ts`, `handicapScoring.test.ts`, `statsAnalysis.test.ts`)
- Component tests with React Testing Library (`Leaderboard.test.tsx`, `GameScoreDisplay.test.tsx`)
- Hook tests (`useAuth.test.tsx`, `useOnlineStatus.test.ts`, `useHoleDistances.test.ts`)
- Service tests (`matchupService.test.ts`)

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

---

## 2026 Changes

### Handicap Scoring Logic Change

**GitHub Issue**: [#6 - Change handicap scoring logic](https://github.com/12ian34/ruffryder.golf/issues/6)

**Problem**: The current system **adds** strokes to the better player's score, but standard golf handicap practice **subtracts** strokes from the higher handicap (weaker) player's score. Both approaches determine the same winner, but the display differs:

| Scenario | Current Behavior | Proposed (Standard) |
|----------|------------------|---------------------|
| Ian (95 hcp) scores 5 | Shows **5** | Shows **3** (net score) |
| Tommy (80 hcp) scores 3 | Shows **5** (3+2 strokes added) | Shows **3** |
| Result | Tie (5 vs 5) | Tie (3 vs 3) |

The proposed approach shows Ian's "net par" which is how golfers conventionally think about handicaps.

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/utils/handicapScoring.ts` | Core logic: subtract strokes from higher handicap player instead of adding to opponent |
| `src/components/ScoreEntry.tsx` | Multiple handicap calculation sections (~lines 298-304, 510-517, 725-733, 989-998) + UI text |
| `src/components/shared/GameScoreTable.tsx` | Display text: "gets X strokes" → shows subtraction; stroke indicator UI |
| `src/__tests__/handicapScoring.test.ts` | ~70+ assertions need expected values flipped |
| `CLAUDE.md` | Update Handicap System documentation section |

**Key code change** in `handicapScoring.ts`:

```typescript
// Current (lines 42-48):
if (game.higherHandicapTeam === 'USA') {
  result.usaAdjustedScore = scores.usaScore;
  result.europeAdjustedScore = scores.europeScore + strokesForHole;  // adds to opponent
} else {
  result.usaAdjustedScore = scores.usaScore + strokesForHole;
  result.europeAdjustedScore = scores.europeScore;
}

// Proposed:
if (game.higherHandicapTeam === 'USA') {
  result.usaAdjustedScore = scores.usaScore - strokesForHole;  // subtract from higher hcp
  result.europeAdjustedScore = scores.europeScore;
} else {
  result.usaAdjustedScore = scores.usaScore;
  result.europeAdjustedScore = scores.europeScore - strokesForHole;
}
```

**Effort estimate**: ~2-3 hours (core logic simple, most work is updating tests and UI text)

**No database migration needed**: Stored raw scores remain unchanged; only display/calculation logic changes

---

### Player Tiering by Year

**GitHub Issue**: [#22 - Make tiering associated to player and year](https://github.com/12ian34/ruffryder.golf/issues/22)

**Problem**: Player `tier` is currently a static field on the Player document. Tiers should be associated with a specific year since player skill levels change over time.

**Current structure** (`src/types/player.ts`):
```typescript
Player {
  tier?: number;  // Static tier, not year-specific
  historicalScores: { year: number; score: number }[];
}
```

**Proposed structure**:
```typescript
Player {
  // Option A: Add tiers to historicalScores
  historicalScores: { year: number; score: number; tier?: number }[];
  
  // Option B: Separate tierHistory array
  tierHistory?: { year: number; tier: number }[];
}
```

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/types/player.ts` | Add year-specific tier structure |
| `src/components/player/PlayerEditModal.tsx` | UI to set tier per year |
| `src/components/player/PlayerTable.tsx` | Display tier for current/selected year |
| `src/utils/statsAnalysis.ts` | `findParsByTier3Players()` needs year context |
| `src/components/tournament/MatchupCreator.tsx` | Tier display with year context |
| `firestore.rules` | Update validation if schema changes |

**Effort estimate**: ~3-4 hours

**Database migration**: Existing `tier` values would need migration to new structure

---

### Matchup-Level Handicap Toggle

**GitHub Issue**: [#21 - Allow handicapping to be turned on/off at matchup level](https://github.com/12ian34/ruffryder.golf/issues/21)

**Problem**: Handicapping is currently a tournament-wide setting (`tournament.useHandicaps`). Some matchups should be able to opt-out of handicapping even when the tournament has it enabled.

**Current structure** (`src/types/tournament.ts`):
```typescript
Tournament { useHandicaps: boolean; }  // Tournament-wide
Matchup { handicapStrokes?: number; }  // Stores calculated strokes, no toggle
```

**Proposed structure**:
```typescript
Matchup {
  handicapStrokes?: number;
  useHandicaps?: boolean;  // Override tournament setting (default: inherit from tournament)
}

Game {
  useHandicaps?: boolean;  // Already exists, would be set from matchup
}
```

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/types/tournament.ts` | Add `useHandicaps?: boolean` to `Matchup` interface |
| `src/components/tournament/MatchupCreator.tsx` | Add toggle per matchup |
| `src/components/tournament/MatchupList.tsx` | Display handicap status |
| `src/hooks/useGameData.ts` | Use matchup-level setting when creating games |
| `src/components/GameCard.tsx` | Already uses `game.useHandicaps`, no change needed |
| `src/components/ScoreEntry.tsx` | Already uses `game.useHandicaps`, no change needed |

**Effort estimate**: ~2-3 hours

**No database migration needed**: New optional field with backwards-compatible default

---

### Fix Fourball Pairing Functionality

**GitHub Issue**: [#20 - fix "Pair Matchups into Fourballs" functionality](https://github.com/12ian34/ruffryder.golf/issues/20)

**Problem**: The fourball pairing feature in `FourballPairing.tsx` may have bugs. Need to investigate the specific issue.

**Current implementation** (`src/services/matchupService.ts`):
- `pairMatchups()` assigns shared `fourballId` to two matchups
- `unpairFourball()` removes `fourballId` from matchups
- `updateGamePermissionsForFourball()` syncs `allowedEditors` arrays

**Known potential issues**:
1. Race conditions when pairing/unpairing quickly
2. `allowedEditors` field removal uses spread operator which may not properly delete the field
3. UI state not refreshing after pairing operation

**Files to investigate**:

| File | Investigation Needed |
|------|----------------------|
| `src/components/tournament/FourballPairing.tsx` | UI state management, callback handling |
| `src/services/matchupService.ts` | `updateDoc` with spread operator for field removal |
| `src/components/tournament/ExistingFourballsList.tsx` | Unpair functionality |
| `src/hooks/useGameData.ts` | Data refresh after pairing |

**Effort estimate**: ~2-4 hours (depends on root cause)

---

### Show Raw Score on Holes Won Display

**GitHub Issue**: [#19 - Show Raw Score in brackets on Holes Won on homepage](https://github.com/12ian34/ruffryder.golf/issues/19)

**Problem**: When handicaps are enabled, the "Holes Won" display on the homepage only shows adjusted values. Users want to see raw values in brackets like the strokes display does.

**Current code** (`src/components/Leaderboard.tsx`, lines 223-232):
```typescript
<div>
  Strokes Hit: USA {totalStrokes.USA}
  {tournament.useHandicaps && ` (Raw: ${rawStrokes.USA})`}  // ✓ Has raw in brackets
  {' '}| EUR {totalStrokes.EUROPE}
  {tournament.useHandicaps && ` (Raw: ${rawStrokes.EUROPE})`}
</div>
<div>
  Holes Won: USA {totalHoles.USA} | EUR {totalHoles.EUROPE}  // ✗ Missing raw in brackets
</div>
```

**Proposed change**:
```typescript
// Add rawHoles calculation (already have code pattern for this)
const rawHoles = games.reduce((total, game) => ({
  USA: total.USA + game.holes.reduce((sum, hole) => sum + (hole.usaPlayerMatchPlayScore ?? 0), 0),
  EUROPE: total.EUROPE + game.holes.reduce((sum, hole) => sum + (hole.europePlayerMatchPlayScore ?? 0), 0)
}), { USA: 0, EUROPE: 0 });

// Update display
<div>
  Holes Won: USA {totalHoles.USA}
  {tournament.useHandicaps && ` (Raw: ${rawHoles.USA})`}
  | EUR {totalHoles.EUROPE}
  {tournament.useHandicaps && ` (Raw: ${rawHoles.EUROPE})`}
</div>
```

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/components/Leaderboard.tsx` | Add `rawHoles` calculation, update display |

**Effort estimate**: ~30 minutes

---

### Nobody Can Start Game Bug (FIXED)

**GitHub Issue**: [#18 - Nobody can start game](https://github.com/12ian34/ruffryder.golf/issues/18)

**Status**: ✅ Fixed in [commit a712b85](https://github.com/12ian34/ruffryder.golf/commit/a712b85fa802564fd9a6bb62ea3efca39d949950)

**Problem**: Players in a 2-ball (regular matchup, not a fourball) couldn't start their games.

**Root cause**: Firestore security rules were only checking `allowedEditors` array (which is only populated for fourballs), not the `playerIds` array (which contains both players in every game).

**Fix**: Updated `firestore.rules` to also check the `playerIds` array:
```
// Before: only checked allowedEditors (fourball-only)
(resource.data.allowedEditors != null && getUserLinkedPlayerId() in resource.data.allowedEditors)

// After: also checks playerIds (all games)
(resource.data.allowedEditors != null && getUserLinkedPlayerId() in resource.data.allowedEditors) ||
(resource.data.playerIds != null && getUserLinkedPlayerId() in resource.data.playerIds)
```

This allows players who are directly in a game (via `playerIds`) to start/update it, regardless of whether it's part of a fourball

---

### Create a Dev Database

**GitHub Issue**: [#15 - Create a Dev DB](https://github.com/12ian34/ruffryder.golf/issues/15)

**Problem**: Need a separate development database to avoid affecting production data during testing.

**Current setup** (`src/config/firebase.ts`):
- Single Firebase project configured via env vars
- Emulator support exists (`VITE_USE_FIREBASE_EMULATOR=true`)

**Proposed solutions**:

**Option A: Use Firebase Emulators (Recommended for local dev)**
- Already configured in `firebase.json`
- Run `npx firebase emulators:start`
- Set `VITE_USE_FIREBASE_EMULATOR=true` in `.env.local`

**Option B: Separate Firebase Project**
- Create new Firebase project (e.g., `ruffryder-golf-dev`)
- Add `VITE_FIREBASE_*_DEV` env vars
- Modify `firebase.ts` to use dev config based on `VITE_ENV` or similar

**Option C: Netlify Branch Deploys with different env vars**
- Deploy preview branches with dev Firebase credentials

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/config/firebase.ts` | Add dev/prod config switching logic |
| `.env.example` | Document dev environment variables |
| `netlify.toml` | Configure branch-specific env vars |
| `firebase.json` | Already has emulator config ✓ |

**Effort estimate**: ~1-2 hours (Option A already works, Option B needs Firebase console setup)

---

### Dormie / Game Over Feature

**GitHub Issue**: [#14 - Add in Dormie/Game Over feature on Match Play](https://github.com/12ian34/ruffryder.golf/issues/14)

**Problem**: In match play, when one player is ahead by more holes than remain, the match is mathematically over. The app should detect and display "Dormie" (tied with holes to play) and "X & Y" (won X up with Y holes remaining) states.

**Match play terminology**:
- **Dormie**: Player is up by exactly the number of holes remaining (must win or halve remaining holes)
- **X & Y**: Player wins X up with Y holes to play (e.g., "3 & 2" = won 3 up with 2 to play)

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/utils/matchPlayStatus.ts` | New file: calculate dormie/game-over status |
| `src/components/GameCard.tsx` | Display dormie/game-over badge |
| `src/components/ScoreEntry.tsx` | Show when match is decided early |
| `src/components/shared/GameScoreDisplay.tsx` | Display final "X & Y" result |

**Implementation logic**:
```typescript
function getMatchPlayStatus(game: Game, useHandicaps: boolean) {
  const holesPlayed = game.holes.filter(h => h.usaPlayerScore !== null).length;
  const holesRemaining = 18 - holesPlayed;
  const usaHoles = useHandicaps ? game.matchPlayScore.adjustedUSA : game.matchPlayScore.USA;
  const europeHoles = useHandicaps ? game.matchPlayScore.adjustedEUROPE : game.matchPlayScore.EUROPE;
  const lead = Math.abs(usaHoles - europeHoles);
  
  if (lead > holesRemaining) return { status: 'won', margin: lead, remaining: holesRemaining };
  if (lead === holesRemaining && holesRemaining > 0) return { status: 'dormie', margin: lead };
  return { status: 'in_progress' };
}
```

**Effort estimate**: ~3-4 hours

---

### Improvements to Highlights Reel

**GitHub Issue**: [#13 - Improvements to Highlights reel](https://github.com/12ian34/ruffryder.golf/issues/13)

**Problem**: The "highlights" / "Fun Tournament Facts" feature needs improvements. Currently displays in `TournamentFunStats.tsx` using `generateFunFacts()` from `statsAnalysis.ts`.

**Current fun facts generated**:
- 💣 Blow-up alert (most strokes on a hole, ≥6)
- 🎯 Hole-in-ones
- 🕊️ Birdies (score of 2)
- 👀 Tier 3 pars
- 🤝 Grind matches (3+ consecutive tied holes)
- 🚨 Upset alerts (higher handicap player wins)

**Potential improvements** (need issue details for specifics):
1. Add more fact types (eagles, comebacks, closest matches)
2. Better formatting/styling of facts
3. Limit number of facts shown / pagination
4. Real-time updates as games progress
5. Historical comparison ("Best round ever", "Worst hole in tournament history")

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/utils/statsAnalysis.ts` | Add new fact generators |
| `src/components/TournamentFunStats.tsx` | UI improvements |
| `src/__tests__/statsAnalysis.test.ts` | Tests for new facts |

**Effort estimate**: ~2-4 hours (depends on scope)

---

### Colour Scheme Changes

**GitHub Issue**: [#11 - Colour scheme changes](https://github.com/12ian34/ruffryder.golf/issues/11)

**Problem**: Need to update the app's color scheme. Current colors defined in `tailwind.config.cjs`.

**Current color scheme**:
- **USA**: Amber/gold (`#fbbf24` main)
- **Europe**: Purple (`#a78bfa` main)
- **Success**: Green (`#22c55e` main)

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `tailwind.config.cjs` | Update color palette values |
| `src/index.css` | Any CSS custom properties |
| Various components | If hardcoded colors exist (grep for hex codes) |

**Considerations**:
- Dark mode compatibility (currently uses `dark:` variants)
- Contrast ratios for accessibility
- Consistency across all components

**Effort estimate**: ~1-2 hours (simple palette swap) to ~4-6 hours (comprehensive redesign)

---

### User Activity Logging / Monitoring

**GitHub Issue**: [#10 - Add user activity logging (/monitoring)](https://github.com/12ian34/ruffryder.golf/issues/10)

**Problem**: Need better visibility into user actions for debugging and analytics.

**Current analytics** (`src/utils/analytics.ts`):
- PostHog integration exists
- `track()` function captures events with user context
- `identifyUser()` links Firebase auth to PostHog

**Current tracked events** (grep for `track(`):
- `leaderboard_viewed`
- `tab_viewed`
- `score_entry_modal_viewed`
- `score_saved`
- `score_deleted`

**Proposed additions**:
1. Game status changes (start, complete, reset)
2. Admin actions (tournament create/edit, player management)
3. Fourball pairing/unpairing
4. Login/logout events
5. Error events

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/utils/analytics.ts` | Add new tracking helper functions |
| `src/components/GameList.tsx` | Track status changes |
| `src/components/TournamentManagement.tsx` | Track admin actions |
| `src/services/matchupService.ts` | Track fourball operations |
| `src/contexts/AuthContext.tsx` | Track auth events |

**Alternative**: Firebase Analytics + Cloud Functions for server-side logging

**Effort estimate**: ~2-4 hours

---

### History & Archive Tab

**GitHub Issue**: [#9 - Add a History & Archive Tab](https://github.com/12ian34/ruffryder.golf/issues/9)

**Problem**: No way to view past tournaments. Only the active tournament is shown.

**Current state**:
- Dashboard tabs: Leaderboard, My games, Stats, About, Admin
- Only queries `tournaments` where `isActive == true`
- Historical data exists in `tournamentYearlyStats`, `playerYearlyStats`, `tournamentScores`

**Proposed implementation**:

1. **New "History" tab** in `Dashboard.tsx`
2. **Tournament list component** showing all past tournaments
3. **Tournament detail view** with final scores, game results, player stats

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/pages/Dashboard.tsx` | Add "History" tab |
| `src/components/TournamentHistory.tsx` | New: list past tournaments |
| `src/components/TournamentArchiveDetail.tsx` | New: view single past tournament |
| `src/hooks/useTournamentHistory.ts` | New: fetch past tournament data |

**Data queries needed**:
```typescript
// Get all tournaments (not just active)
const tournamentsQuery = query(
  collection(db, 'tournaments'),
  orderBy('year', 'desc')
);

// Get tournament scores
const scoresDoc = await getDoc(doc(db, 'tournamentScores', tournamentId));
```

**Effort estimate**: ~4-6 hours

---

### Prediction Model

**GitHub Issue**: [#8 - Add Prediction Model](https://github.com/12ian34/ruffryder.golf/issues/8)

**Problem**: Users want to predict tournament outcomes based on player handicaps and historical performance.

**Potential approaches**:

**Option A: Simple Handicap-Based Prediction**
- Compare average scores of matched players
- Calculate expected point distribution

**Option B: Historical Performance Model**
- Factor in head-to-head history
- Weight recent performance more heavily
- Consider home/away or first/second tee advantage

**Option C: Monte Carlo Simulation**
- Run thousands of simulated tournaments
- Generate win probability percentages

**Files requiring changes**:

| File | Changes Needed |
|------|----------------|
| `src/utils/predictions.ts` | New: prediction algorithms |
| `src/components/PredictionDisplay.tsx` | New: show predictions UI |
| `src/hooks/usePredictions.ts` | New: generate predictions |
| `src/pages/Dashboard.tsx` | Add predictions to a tab |

**Data needed**:
- Player `historicalScores` (already available)
- Player `averageScore` / handicap (already available)
- Past game results (need query from tournaments)

**Example simple prediction**:
```typescript
function predictMatchResult(usaHandicap: number, europeHandicap: number) {
  // Lower handicap = better player = more likely to win
  const diff = europeHandicap - usaHandicap;
  const usaWinProb = 0.5 + (diff * 0.02); // 2% per stroke difference
  return { usa: usaWinProb, europe: 1 - usaWinProb };
}
```

**Effort estimate**: ~4-8 hours (depends on complexity)
