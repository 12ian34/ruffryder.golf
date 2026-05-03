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

New 2026 screens should use the dark terminal scoreboard direction, compact mono typography, semantic Tailwind tokens, and mobile-first score-entry patterns documented there. The 2026 console is phone-first, including admin/captain setup. Score entry should avoid keyboard-first numeric fields; prefer tap/scroll score pickers with autosave and visible sync state. The legacy `usa` and `europe` Tailwind palettes are kept stable for the old Firebase UI; new 2026 UI should prefer `team-usa` and `team-europe`.

## 2026 Tournament Rules

The standalone rules spec lives in `docs/2026-rules-spec.md` and is the single source of truth for product rules. Do not duplicate tournament rules here. When product rules change, update the rules spec first, then update only implementation guidance in this file if needed.

The 2026 rebuild should support flexible fixture shapes through the segment model, including full-course 1v1 singles fixtures between any two players as well as normal 4-player fixtures and larger groups such as 6-balls. Treat useful 2025 behavior listed in `docs/2026-feature-gap-inventory.md` as desired parity unless it conflicts with the 2026 rules spec. Do not reintroduce legacy stroke-play points or legacy handicap behavior for live 2026 scoring.

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

AI features that call hosted model providers must keep provider keys server-side. Use unprefixed variables such as:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

Never expose model provider keys through `VITE_` variables. Browser code should call an authenticated server boundary such as a Netlify Function, and AI features should stay read-only unless a user explicitly asks for a confirmed write flow.

Do not use `supabase gen types --db-url` for type generation. That CLI path requires Docker. Use:

```bash
npm run supabase:types
```

This derives the project ref from `VITE_SUPABASE_URL` and uses `supabase gen types --project-id`, which does not require Docker.

## Suggested Domain Model

Prefer new 2026 concepts over adapting legacy `Game` fields:

- `Tournament`: event metadata, active/completed flags, CPI threshold.
- `Fixture`: one group chosen by captains; normally four players, but must allow flexible sizes such as 1v1 fixtures and six-player fixtures.
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
- `20260502214500_lock_completed_tournament_scores.sql` updates RLS helpers/policies so completed tournaments block score writes.
- `20260503081500_profile_self_service.sql` adds the `update_own_profile` RPC so users can edit display name/avatar without broad profile update permissions.
- `20260503142000_audit_logs.sql` creates immutable trigger-backed audit logging for 2026 live tables and publishes `audit_logs` over Realtime.
- `20260503143000_seed_course_hole_yardage.sql` backfills course par/yardage from the legacy Firebase `config/holeDistances` data.

When adding tables that should update the `/2026` console live, keep the Realtime publication migration pattern and `subscribeToTournament2026Changes()` in sync.

Supabase Auth email template copy/design is documented in `docs/supabase-auth-email-template.md`. Supabase currently owns the actual hosted email template; keep the repo doc in sync when the login voice changes.

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
- The authenticated `/2026` nav is bottom-only and task-based: `My Game`, `Scores`, `Archive`, `Profile`, plus admin-only `Admin`. Do not show admin setup to non-admins in nav, and keep sign-out in Profile with confirmation.
- `src/features/tournament2026/components/AuthPanels.tsx` contains sign-in and profile creation panels. The sign-in panel supports a resend cooldown and should use Ruff Ryders access-card language, not visible backend/vendor language.
- `src/features/tournament2026/components/Layout.tsx` contains shared shell, panel, form, and status-card primitives for the 2026 console.
- `src/features/tournament2026/components/Hero.tsx` is legacy/unused after the bottom-nav IA cleanup; do not build new flows around it unless it is reintroduced intentionally.
- `src/features/tournament2026/components/LeaderboardSection.tsx` derives live overall, foursomes, and singles totals from hole outcomes.
- `src/features/tournament2026/components/LeaderboardSection.tsx` also shows fixture progress, segment match status chips, 2026 highlights, and score-movement timeline data for tournament-day scanning.
- `src/features/tournament2026/components/LeaderboardSection.tsx` includes an on-demand read-only AI recap card. It builds compact snapshots through `src/features/tournament2026/aiRecap.ts` and calls `netlify/functions/ai-recap.mjs`; do not call OpenAI directly from browser code.
- `src/features/tournament2026/components/ScoreEntrySection.tsx` renders fixture score entry as collapsible work cards with front/back switches, grouped back-nine singles by hole, Supabase-backed course metadata, compact saved-by/saved-time audit metadata, admin single-hole clear controls, and autosaves each hole through the 2026 query service. It must remain locked when `tournaments.is_complete` is true.
- `src/features/tournament2026/components/StatsSection.tsx` is legacy/unused after the Archive consolidation; prefer the Archive player-history view for new work unless this file is removed.
- `src/features/tournament2026/components/AdminSetupSection.tsx` is admin-only and organized as collapsible task sections: Tournament, Players, Fixtures, Course, Activity, and Corrections. Course shows current par/yardage and lets admins correct metadata. Activity reads recent DB-backed audit logs. Keep destructive correction flows collapsed and confirmation-gated. Admin profile linking/role edits belong in the Players section, not the user Profile page.
- `src/features/tournament2026/components/ProfileSection.tsx` supports self-service profile display name/avatar through the `update_own_profile` RPC and account sign-out. Keep it scoped to the signed-in user's own account.
- `src/features/tournament2026/components/HistorySection.tsx` exports the Archive view. It combines historical tournament drilldowns from `legacy_tournaments`/`legacy_games` with player history from `player_tournament_stats`. Migrated score-only rows should display as historical scores/CPI, not as `0/0` 2026 hole-count stats.
- `src/features/tournament2026/components/FormControls.tsx` holds small shared form controls for the 2026 UI.
- `src/features/tournament2026/insights.ts` derives 2026 highlights and score-movement timeline data from fixture segments and hole scores.
- `src/features/tournament2026/viewUtils.ts` holds UI-only formatting, totals, hole-range, and parsing helpers.
- `src/services/tournament2026Queries.ts` reads live tournament data, subscribes to Supabase Realtime changes, creates tournaments/players/fixtures, loads `course_holes`, player stats, audit logs, and score editor profiles, handles profile/admin corrections/finalization, and upserts/deletes hole scores through the pure scoring core. When tournament CPI threshold changes, existing scored rows should be recalculated so saved CPI outcomes stay consistent. Scored segment membership edits must explicitly clear that segment's saved scores before replacing the players; never silently reassign saved scores to different players.
- `audit_logs` is database-triggered, not client-authored. The browser should read it for admin/player activity views, but app code should not insert, update, or delete audit rows directly.
- `src/services/tournament2026Service.ts` owns fixture setup persistence orchestration and rollback around fixture, fixture-player, segment, and segment-player inserts.
- `src/domain/2026/scoring.ts` is the pure scoring core for CPI, foursomes, singles, halved/unplayed outcomes, and fixture summaries.
- `src/domain/2026/persistence.ts` maps scored holes into Supabase `hole_scores` insert/upsert payloads.
- `src/domain/2026/fixtures.ts` builds and validates fixture/segment setup payloads for normal 4-balls and flexible fixtures.
- `src/domain/2026/finalization.ts` validates completion and derives back-nine-singles-only player stats plus 18-hole-equivalent CPI updates.
- Finalization stats store `legacy_payload.cpi_before`; reopening a tournament should restore those CPI values, delete generated app stats, then unlock the tournament.
- `src/domain/2026/matchPlayStatus.ts` calculates segment dormie/match-over status and fixture progress from expected hole ranges plus saved outcomes.
- Fixture setup supports flexible full-course 1v1 singles fixtures and 2-6 player fixtures through the admin UI, schema/domain builder, and tests. 1v1 fixtures should stay in the 2026 segment model, not fall back to legacy games, and the builder may assign any two players to the two scoring sides.

## Testing Expectations

Add focused tests for behavior changes:

- CPI default threshold is 7 strokes.
- CPI applies only to singles and never to front-nine foursomes.
- Segment-level CPI toggles disable adjusted scoring and recalculate already-entered hole scores for that segment.
- Halved holes display correctly and do not incorrectly award holes won.
- Front-nine foursomes hole winners roll up correctly.
- Back-nine singles scoring rolls up correctly.
- Dormie/match-over and fixture progress count missing score rows as unplayed.
- Only back-nine singles scores feed player history and CPI updates.
- Any fixture player can update fixture scores; unrelated players cannot.
- Admin correction actions update player details, keep linked profile teams in sync, and can clear or delete accidental fixture data.
- Flexible fixture and segment membership works for normal 4-balls and possible 6-balls.
- Course metadata import preserves Firebase `config/holeDistances` yardages and stroke indices.
- Audit logs are created by database triggers for score/setup/profile/course/finalization changes and remain read-only to browser clients.
- Historical Firebase-shaped data migrates into the Supabase schema without changing old results.
- Historical pages can display raw/no-handicap and legacy adjusted/old-handicap-method results exactly as they were.

Current focused 2026 tests live in:

- `src/__tests__/tournament2026Scoring.test.ts`
- `src/__tests__/tournament2026Persistence.test.ts`
- `src/__tests__/tournament2026Fixtures.test.ts`
- `src/__tests__/tournament2026Service.test.ts`
- `src/__tests__/firebaseExportMigration.test.ts`
- `src/__tests__/ScoreEntrySection.test.tsx`

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
- The Firebase export includes the legacy `config` collection. `config/holeDistances.indices` maps to `course_holes.yardage`, and `config/strokeIndices.indices` maps to `course_holes.stroke_index`.
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
