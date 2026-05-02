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

New 2026 screens should use the dark terminal scoreboard direction, compact mono typography, semantic Tailwind tokens, and mobile-first score-entry patterns documented there. The legacy `usa` and `europe` Tailwind palettes are kept stable for the old Firebase UI; new 2026 UI should prefer `team-usa` and `team-europe`.

## 2026 Tournament Rules

The standalone rules spec lives in `docs/2026-rules-spec.md` and is the single source of truth for product rules. Do not duplicate tournament rules here. When product rules change, update the rules spec first, then update only implementation guidance in this file if needed.

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

The current Supabase schema is managed through migrations in `supabase/migrations/`:

- `20260502175000_initial_2026_schema.sql` creates the 2026 live tables, RLS helpers, and base policies.
- `20260502191000_legacy_history_archive.sql` creates legacy archive tables for Firebase-era tournaments and games.
- `20260502193000_flexible_fixture_segments.sql` adds `segment_players` and widens fixture slots to support flexible fixtures such as 6-balls.
- `20260502202000_enable_realtime_publication.sql` adds live tables to the Supabase Realtime publication.

When adding tables that should update the `/2026` console live, keep the Realtime publication migration pattern and `subscribeToTournament2026Changes()` in sync.

## Implementation Guidance

- Read `DESIGN.md` before building or changing UI.
- Put pure 2026 scoring logic in `src/domain/2026/`; keep React formatting and display helpers in `src/features/tournament2026/`.
- Build scoring utilities before UI or persistence code depends on them.
- Keep score derivation pure and well-tested.
- Prefer deriving standings from hole scores through SQL views/RPC or pure functions before storing duplicate totals.
- Store timeline snapshots only if needed for historical charts.
- Treat `src/components/ScoreEntry.tsx` and `src/components/TournamentManagement.tsx` as legacy references, not files to keep expanding.
- Keep imports at the top of files. Use exhaustive switch handling for 2026 unions such as segment kind and hole outcome.

## 2026 Supabase UI

The fresh Supabase-backed console lives at `/2026`. The legacy Firebase dashboard links to it from the `2026` tab, but the new route owns its own Supabase session flow because the 2026 schema uses Supabase Auth and RLS.

Current 2026 UI/service layout:

- `src/lib/supabase.ts` lazily creates the browser Supabase client so the legacy app can still load when Supabase env vars are absent.
- `src/pages/Tournament2026.tsx` is the route-level orchestrator. It handles Supabase config checks, OTP sign-in, profile creation flow, auth state refresh, realtime subscription setup, and section composition.
- `src/features/tournament2026/components/AuthPanels.tsx` contains sign-in and profile creation panels. The sign-in panel supports a resend cooldown and surfaces Supabase rate-limit guidance from the route.
- `src/features/tournament2026/components/Layout.tsx` contains shared shell, panel, form, and status-card primitives for the 2026 console.
- `src/features/tournament2026/components/Hero.tsx` shows active tournament/profile context.
- `src/features/tournament2026/components/LeaderboardSection.tsx` derives live overall, foursomes, and singles totals from hole outcomes.
- `src/features/tournament2026/components/ScoreEntrySection.tsx` renders fixture/segment score entry and saves each hole through the 2026 query service.
- `src/features/tournament2026/components/AdminSetupSection.tsx` is admin-only and currently creates active tournaments, players, and quick normal 4-ball fixtures.
- `src/features/tournament2026/components/HistorySection.tsx` currently shows summary cards from `legacy_tournaments`; detailed legacy game drill-down is not built yet.
- `src/features/tournament2026/components/FormControls.tsx` holds small shared form controls for the 2026 UI.
- `src/features/tournament2026/viewUtils.ts` holds UI-only formatting, totals, hole-range, and parsing helpers.
- `src/services/tournament2026Queries.ts` reads live tournament data, subscribes to Supabase Realtime changes, creates tournaments/players/quick 4-ball fixtures, and upserts hole scores through the pure scoring core.
- `src/services/tournament2026Service.ts` owns fixture setup persistence orchestration and rollback around fixture, fixture-player, segment, and segment-player inserts.
- `src/domain/2026/scoring.ts` is the pure scoring core for CPI, foursomes, singles, halved/unplayed outcomes, and fixture summaries.
- `src/domain/2026/persistence.ts` maps scored holes into Supabase `hole_scores` insert/upsert payloads.
- `src/domain/2026/fixtures.ts` builds and validates fixture/segment setup payloads for normal 4-balls and flexible fixtures.
- Quick fixture setup currently covers the normal 4-ball path. Flexible 6-ball support exists in the schema/domain builder and tests, but still needs a richer admin UI when the exact event numbers are known.

## Testing Expectations

Add focused tests for behavior changes:

- CPI default threshold is 7 strokes.
- CPI applies only to singles and never to front-nine foursomes.
- Segment-level CPI toggles disable adjusted scoring and recalculate already-entered hole scores for that segment.
- Halved holes display correctly and do not incorrectly award holes won.
- Front-nine foursomes hole winners roll up correctly.
- Back-nine singles scoring rolls up correctly.
- Only back-nine singles scores feed player history and CPI updates.
- Any fixture player can update fixture scores; unrelated players cannot.
- Flexible fixture and segment membership works for normal 4-balls and possible 6-balls.
- Historical Firebase-shaped data migrates into the Supabase schema without changing old results.
- Historical pages can display raw/no-handicap and legacy adjusted/old-handicap-method results exactly as they were.

Current focused 2026 tests live in:

- `src/__tests__/tournament2026Scoring.test.ts`
- `src/__tests__/tournament2026Persistence.test.ts`
- `src/__tests__/tournament2026Fixtures.test.ts`
- `src/__tests__/tournament2026Service.test.ts`

## Supabase Permission Model

RLS should be stricter than the old Firestore tournament update rules.

- Authenticated users can read tournament, player, fixture, segment, and score data as needed by the app.
- Admins can manage tournaments, players, fixtures, and all scores.
- A linked player can update their own display fields where allowed.
- Any player assigned to a fixture can update that fixture's scores.
- Unrelated players cannot update fixture scores.
- Browser clients must never receive service-role privileges.

The schema currently uses helper functions such as `current_profile_is_admin()`, `current_linked_player_id()`, and `can_update_fixture_scores()` to keep RLS policies readable. Client writes must go through browser-safe Supabase credentials and rely on these policies, not service-role privileges.

## Migration Notes

Migrate historical Firebase data into Supabase once the schema is stable:

- Use `npm run export:firebase -- --out firebase-export.json` to create the JSON export expected by the importer.
- The Firebase export script needs either `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`, `GOOGLE_APPLICATION_CREDENTIALS`, or application default credentials.
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
