# AGENTS.md

## Canonical Context

This file is the canonical agent guide for work in this repo going forward.

`CLAUDE.md` is now legacy context. It describes the current Firebase app and is still useful for understanding old behavior, migration source data, and historical implementation details, but it should be treated as outdated during the 2026 Supabase rebuild. Prefer this file for current product rules, architecture direction, and implementation guidance.

Eventually `CLAUDE.md` can be deleted once its useful legacy context has been migrated here or superseded.

## Project Direction

Ruff Ryders Cup is being rebuilt for the 2026 tournament as a Supabase/Postgres-backed React app.

The current Firebase implementation should be used as a reference, not extended as the long-term model. The old app assumes one USA player vs one Europe player over 18 holes with both stroke-play and match-play points. The 2026 format changes the match unit itself, so new work should use a clean domain model.

## Design System

The design system source of truth lives in `DESIGN.md`. Read it before building or changing UI.

New 2026 screens should use the dark-first clubhouse scoreboard direction, semantic Tailwind tokens, and mobile-first score-entry patterns documented there. The legacy `usa` and `europe` Tailwind palettes are kept stable for the old Firebase UI; new 2026 UI should prefer `team-usa` and `team-europe`.

## 2026 Tournament Rules

The standalone rules spec lives in `docs/2026-rules-spec.md`. Keep that file and this summary in sync when product rules change.

- Tournament format is match-play-only.
- Holes 1-9 are foursomes / alternate shot: one USA pair against one Europe pair.
- In foursomes, the selected pair's combined/team score is entered for each side, and the lowest combined/team score wins the hole.
- Holes 10-18 are singles: normally two individual matches inside the same four-player fixture.
- The app must support flexible fixture groups, including possible 6-ball fixtures when numbers do not divide cleanly into 4-balls.
- Admins configure scoring segments and segment membership inside each fixture.
- Handicaps are renamed Course Performance Index (CPI).
- CPI applies only to singles matches.
- Default CPI threshold is 7 strokes: CPI applies only when singles opponents differ by 7 or more.
- When CPI applies, subtract strokes from the higher-CPI player. In product language, the weaker player gets strokes taken off their score.
- CPI threshold should remain configurable per tournament/admin.
- Tied holes are displayed as halved holes. They are equivalent to no hole being won for team totals.
- Front-nine foursomes scores do not count toward player history or future CPI updates.
- Only back-nine singles scores count toward player history and CPI updates.
- Any player in a fixture can enter scores for that fixture.
- Captains/admins choose fixtures, front-nine pairs, back-nine singles matchups, and any extra segment configuration needed for 6-ball fixtures.

## Backend Direction

Supabase is the target backend for the rebuild:

- Supabase Auth for user accounts.
- Postgres as the canonical data store.
- Row Level Security for permissions.
- Supabase Realtime for live leaderboard and score updates.
- Historical Firebase data should be migrated into Supabase.
- Historical results must preserve both raw/no-handicap output and the legacy adjusted/old-handicap-method output. Do not recalculate old tournaments using 2026 CPI rules.

Keep the Firebase project/data untouched as a backup source during the rebuild. Do not build dual-write or gradual migration infrastructure unless explicitly requested.

## Environment Variables

Do not print or commit real secrets. Do not add service-role credentials to browser-exposed variables.

The React app should use browser-safe Supabase values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Local migration/admin scripts may use non-browser secrets. These must not be prefixed with `VITE_`:

```bash
SUPABASE_DB_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server/admin only. Never import it from client code and never expose it to Vite.

Do not use `supabase gen types --db-url` for type generation. That CLI path requires Docker. Use:

```bash
npm run supabase:types
```

This derives the project ref from `VITE_SUPABASE_URL` and uses `supabase gen types --project-id`, which does not require Docker.

## Suggested Domain Model

Prefer new 2026 concepts over adapting legacy `Game` fields:

- `Tournament`: event metadata, active/completed flags, CPI threshold.
- `Fixture`: one group chosen by captains; normally four players, but must allow flexible sizes such as six players.
- `FixturePlayer`: player membership and role within a fixture.
- `Segment`: configurable scoring unit, such as front-nine foursomes or a back-nine singles match.
- `SegmentPlayer`: player membership within a segment, used to support selected pairs and flexible 6-ball configurations.
- `HoleScore`: canonical per-hole scores and derived result.
- `PlayerTournamentStats`: historical player stats; for 2026, derived only from back-nine singles scores.
- `LegacyTournament` / `LegacyGame`: read-only archive records for pre-2026 Firebase tournaments, preserving old raw and old adjusted results.

Avoid new code that hard-codes legacy fields like `usaPlayerScore`, `europePlayerScore`, `strokePlayScore`, or `handicapStrokes` unless working on migration or compatibility.

## Implementation Guidance

- Read `DESIGN.md` before building or changing UI.
- Put pure 2026 scoring logic in a focused module such as `src/domain/2026/` or `src/features/tournament2026/`.
- Build scoring utilities before UI or persistence code depends on them.
- Keep score derivation pure and well-tested.
- Prefer deriving standings from hole scores through SQL views/RPC or pure functions before storing duplicate totals.
- Store timeline snapshots only if needed for historical charts.
- Treat `src/components/ScoreEntry.tsx` and `src/components/TournamentManagement.tsx` as legacy references, not files to keep expanding.

## 2026 Supabase UI

The fresh Supabase-backed console lives at `/2026` in `src/pages/Tournament2026.tsx`. The legacy Firebase dashboard links to it from the `2026` tab, but the new route owns its own Supabase session flow because the 2026 schema uses Supabase Auth and RLS.

Current 2026 UI/service layout:

- `src/lib/supabase.ts` lazily creates the browser Supabase client so the legacy app can still load when Supabase env vars are absent.
- `src/services/tournament2026Queries.ts` reads live tournament data, subscribes to Supabase Realtime changes, creates tournaments/players/quick 4-ball fixtures, and upserts hole scores through the pure scoring core.
- `src/pages/Tournament2026.tsx` contains the initial admin setup, score entry, leaderboard, and historical archive screens.
- Foursomes score entry uses one combined/team score per side per hole; the lower combined/team score wins that foursomes hole.
- Quick fixture setup currently covers the normal 4-ball path. Flexible 6-ball support exists in the schema/domain builder and should get a richer admin UI when the exact event numbers are known.

## Testing Expectations

Add focused tests for behavior changes:

- CPI default threshold is 7 strokes.
- CPI applies only to singles and never to front-nine foursomes.
- Halved holes display correctly and do not incorrectly award holes won.
- Front-nine foursomes hole winners roll up correctly.
- Back-nine singles scoring rolls up correctly.
- Only back-nine singles scores feed player history and CPI updates.
- Any fixture player can update fixture scores; unrelated players cannot.
- Flexible fixture and segment membership works for normal 4-balls and possible 6-balls.
- Historical Firebase-shaped data migrates into the Supabase schema without changing old results.
- Historical pages can display raw/no-handicap and legacy adjusted/old-handicap-method results exactly as they were.

## Supabase Permission Model

RLS should be stricter than the old Firestore tournament update rules.

- Authenticated users can read tournament/player/game data as needed by the app.
- Admins can manage tournaments, players, fixtures, and all scores.
- A linked player can update their own display fields where allowed.
- Any player assigned to a fixture can update that fixture's scores.
- Unrelated players cannot update fixture scores.
- Browser clients must never receive service-role privileges.

## Migration Notes

Migrate historical Firebase data into Supabase once the schema is stable:

- Use `npm run migrate:firebase-export -- <firebase-export.json>` for a dry run.
- Use `npm run migrate:firebase-export -- <firebase-export.json> --apply` only when ready to write to Supabase.
- Preserve player IDs or store legacy Firebase IDs for traceability.
- Preserve denormalized historical names and scores so old results do not change when player records are edited later.
- Normalize heterogeneous `historicalScores` into structured player tournament stats where practical.
- Treat old tournaments and games as historical archive data, not necessarily as live 2026 fixtures.
- Preserve both raw results and old adjusted/handicap results. Label adjusted historical values as legacy output so agents do not confuse them with the 2026 CPI model.
- Validate migration with row counts and representative spot checks.

## Commands

Common commands:

```bash
npm install
npm run dev
npm run type-check
npm run lint
npm run supabase:types
npm run migrate:firebase-export -- <firebase-export.json>
npx vitest run
```

After substantive TypeScript/React changes, run targeted tests first, then broader checks when the change is ready.
