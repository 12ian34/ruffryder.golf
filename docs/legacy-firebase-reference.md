# Legacy Firebase Reference

This document preserves the useful legacy Firebase context after the 2026 Supabase rebuild. It is reference-only for migration and archive display work. Current product rules, architecture, and implementation guidance live in `AGENTS.md`, `DESIGN.md`, and `docs/2026-rules-spec.md`.

Do not extend the Firebase model for new 2026 features. Keep historical results as originally scored, including raw/no-handicap output and legacy adjusted/old-handicap-method output.

## Legacy App Shape

The old app used Firebase Auth, Firestore, Firebase Storage, React, Vite, Tailwind, Vitest, PostHog, and Netlify.

The legacy scoring unit was a single 18-hole `Game` between one USA player and one Europe player. Each game tracked both stroke-play and match-play results. Two matchups could be paired into a fourball by sharing a `fourballId`, which allowed all four players to edit both games through `allowedEditors`.

The legacy React frontend has been removed from current `src/` code. Use this document, historical git history, and Firebase exports when migration or archive work needs the old shapes.

Retired legacy source areas:

- `src/components/`: Firebase-era UI components.
- `src/hooks/`: Firebase data hooks such as game, player, and hole metadata loading.
- `src/services/matchupService.ts`: fourball pairing and permission syncing.
- `src/types/game.ts`, `src/types/player.ts`, `src/types/tournament.ts`, and `src/types/user.ts`: legacy `Game`, `Player`, `Tournament`, and `User` shapes.
- `src/utils/handicapScoring.ts`, `src/utils/gamePoints.ts`, and `src/utils/tournamentScores.ts`: legacy scoring logic.
- `firestore.rules` and `firestore.indexes.json`: legacy Firestore access control and indexes.

## Legacy Firestore Collections

### `users/{id}`

```typescript
interface LegacyUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  linkedPlayerId: string | null;
  team: 'USA' | 'EUROPE' | null;
  customEmoji?: string;
  createdAt: Timestamp;
}
```

`linkedPlayerId` connected Firebase Auth users to player records. Firestore rules used it to decide whether a user could edit games for their player.

### `players/{id}`

```typescript
interface LegacyPlayer {
  id: string;
  name: string;
  team: 'USA' | 'EUROPE';
  tier?: number;
  historicalScores: { year: number; score: number }[];
  averageScore?: number;
  customEmoji?: string;
}
```

`averageScore` was the legacy handicap value. It was calculated from the most recent three `historicalScores` entries by year, unless manually overridden.

### `tournaments/{id}`

```typescript
interface LegacyTournament {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  isComplete?: boolean;
  useHandicaps: boolean;
  teamConfig: 'USA_VS_EUROPE' | 'EUROPE_VS_EUROPE' | 'USA_VS_USA';
  handicapStrokes: number;
  higherHandicapTeam: 'USA' | 'EUROPE';
  matchups: LegacyMatchup[];
  totalScore: LegacyTeamPoints;
  projectedScore: LegacyTeamPoints;
  progress: LegacyTournamentProgress[];
  createdAt: string;
  updatedAt: string;
}
```

`isComplete` locked legacy tournament editing. `progress` stored timestamped score snapshots for charts.

### `tournaments/{id}/games/{gameId}`

```typescript
interface LegacyGame {
  id: string;
  tournamentId: string;
  usaPlayerId: string;
  europePlayerId: string;
  usaPlayerName: string;
  europePlayerName: string;
  usaPlayerHandicap?: number;
  europePlayerHandicap?: number;
  handicapStrokes: number;
  higherHandicapTeam: 'USA' | 'EUROPE';
  holes: LegacyHoleScore[];
  strokePlayScore: {
    USA: number;
    EUROPE: number;
    adjustedUSA: number;
    adjustedEUROPE: number;
  };
  matchPlayScore: {
    USA: number;
    EUROPE: number;
    adjustedUSA: number;
    adjustedEUROPE: number;
  };
  points: LegacyTeamPoints;
  status: 'not_started' | 'in_progress' | 'complete';
  isStarted: boolean;
  isComplete: boolean;
  playerIds: string[];
  allowedEditors?: string[];
  useHandicaps?: boolean;
  startTime?: Date;
  endTime?: Date;
  updatedAt?: Timestamp;
}
```

Each `LegacyHoleScore` included hole number, stroke index, par, raw scores, adjusted scores, and raw/adjusted match-play hole winners.

### Config And Archive Collections

- `config/strokeIndices`: `indices: number[]`, where the array index is hole number minus one and value is stroke index.
- `config/holeDistances`: `indices: number[]`, where the array index is hole number minus one and value is yardage.
- `playerYearlyStats`: saved historical player performance by year.
- `tournamentYearlyStats`: tournament summaries by year.
- `tournamentScores`: final tournament scores when a legacy tournament was marked complete.

## Legacy Scoring

Legacy games had two parallel scoring modes:

- Stroke play: total raw and adjusted strokes over 18 holes, lower is better.
- Match play: holes won over 18 holes, higher is better. A tied hole awarded no hole to either team.

Each game had two total points available:

| Stroke Play | Match Play | USA | Europe |
| --- | --- | ---: | ---: |
| USA wins | USA wins | 2 | 0 |
| Europe wins | Europe wins | 0 | 2 |
| USA wins | Europe wins | 1 | 1 |
| Europe wins | USA wins | 1 | 1 |
| Tie | USA wins | 0.5 | 1.5 |
| Tie | Europe wins | 1.5 | 0.5 |
| USA wins | Tie | 1.5 | 0.5 |
| Europe wins | Tie | 0.5 | 1.5 |
| Tie | Tie | 1 | 1 |

Legacy adjusted results must be preserved as historical output. Do not recalculate them with 2026 CPI.

## Legacy Handicap Behavior

Legacy handicap used `averageScore` on `Player`, usually derived from the latest three historical scores.

The old app calculated:

- `handicapStrokes = abs(usa.averageScore - europe.averageScore)`.
- `higherHandicapTeam` as the player/team with the higher average score.
- Stroke distribution by stroke index with full 18-hole cycles plus remainder strokes on the hardest holes.

The old method added strokes to the lower-handicap player's adjusted score. That differs from the 2026 CPI model, which subtracts strokes from the higher-CPI player in singles only.

## Fourball Permissions

Legacy fourballs paired two matchups by assigning the same `fourballId`.

When paired, `updateGamePermissionsForFourball()` set `allowedEditors` on both games to all four player IDs. When unpaired, `allowedEditors` was removed from those games.

Players in a normal 2-ball should be able to edit through `playerIds`. Fourball editing used `allowedEditors` as the expanded permission list.

## Firestore Rules Summary

Rules are defined in `firestore.rules`.

| Collection | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| `users` | Authenticated users | Own user only | Own name/avatar fields or admin | Admin only |
| `players` | Authenticated users | Admin only | Admin, or linked user for avatar fields | Admin only |
| `tournaments` | Authenticated users | Admin only | Admin, or linked players where permitted | Admin only |
| `games` subcollection | Authenticated users | Admin only | Admin, direct players, or `allowedEditors` | Admin only |
| `config` | Authenticated users | Admin only | Admin only | Admin only |

Useful helpers:

- `isAdmin()` checks `users/{uid}.isAdmin`.
- `getUserLinkedPlayerId()` returns the auth user's linked player ID.
- Player game writes were restricted to score/status fields such as `holes`, score totals, `points`, `status`, `isStarted`, `isComplete`, `endTime`, and `updatedAt`.

## Legacy Commands

Use Firebase tools only for explicitly approved source-project maintenance. The live React frontend no longer uses Firebase client SDKs or emulators.

```bash
npx firebase deploy --only firestore:rules
npx firebase deploy --only firestore:indexes
```

## Migration Notes

- Use `npm run export:firebase -- --out firebase-export.json` to export legacy Firebase data.
- Use `npm run migrate:firebase-export -- <firebase-export.json>` for a dry run.
- Use `npm run migrate:firebase-export -- <firebase-export.json> --apply` only with explicit approval.
- Preserve legacy Firebase IDs where practical for traceability.
- Preserve denormalized historical player names and scores so archive output does not drift when current player records change.
- Map `config/holeDistances.indices` to Supabase `course_holes.yardage`.
- Map `config/strokeIndices.indices` to Supabase `course_holes.stroke_index`.
- Treat legacy tournaments and games as read-only archive data, not live 2026 fixtures.
