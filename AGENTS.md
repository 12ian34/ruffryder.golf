# AGENTS.md

## Canonical Context

This file is the canonical agent guide for work in this repo going forward.

Legacy Firebase behavior and migration-source details live in `docs/legacy-firebase-reference.md`. Use that file only for archive or migration work. Prefer this file for current product rules, architecture direction, and implementation guidance.

## Documentation Ownership

Keep the root docs intentionally split by audience:

- `README.md` is for players. Keep it focused on how to use the live tournament app, read scores, enter scores, and understand the 2026 format.
- `CONTRIBUTING.md` is for human developers. Put local setup, env vars, scripts, testing, and deployment workflow there.
- `AGENTS.md` is for coding agents. Keep architecture direction, product constraints, implementation guidance, and test expectations here.
- `DESIGN.md` is the UI design source of truth.
- `docs/2026-rules-spec.md` is the canonical 2026 tournament rules spec.
- `docs/legacy-firebase-reference.md` is compact legacy Firebase context and migration reference only.

Do not move contributor setup, stack inventories, or agent-only rebuild notes back into the player README.

## Project Direction

Ruff Ryders Cup is now led by the Supabase/Postgres-backed 2026 app.

The Firebase frontend has been retired. Treat old Firebase behavior as migration/archive reference only, not as a live fallback or long-term model. The old app assumed one USA player vs one Europe player over 18 holes with both stroke-play and match-play points. The 2026 format changes the match unit itself, so new work should use a clean domain model.

## Design System

The design system source of truth lives in `DESIGN.md`. Read it before building or changing UI.

New 2026 screens should use the terminal scoreboard direction, compact mono typography, semantic Tailwind tokens, and mobile-first score-entry patterns documented there. The 2026 console is phone-first, including admin/captain setup. Score entry should avoid keyboard-first numeric fields; prefer tap/scroll score pickers with autosave and visible sync state. New UI should prefer `team-usa` and `team-europe` team tokens. The app currently has a persisted light/dark theme toggle through `ThemeProvider` and `ThemeToggle`; preserve the toggle and keep light-mode CSS as a compatibility layer over the same terminal UI rather than a separate design system.

## 2026 Tournament Rules

The standalone rules spec lives in `docs/2026-rules-spec.md` and is the single source of truth for product rules. Do not duplicate tournament rules here. When product rules change, update the rules spec first, then update only implementation guidance in this file if needed.

The 2026 rebuild should support the fixture templates defined in the rules spec through the segment model: 2-player full-18 singles between any two players, 4-player standard matches, and 6-player flexible matches. Treat useful 2025 behavior listed in `docs/2026-feature-gap-inventory.md` as desired parity unless it conflicts with the 2026 rules spec. Do not reintroduce legacy stroke-play points or legacy handicap behavior for live 2026 scoring.

## Backend Direction

Supabase is the target backend for the rebuild:

- Supabase Auth for user accounts.
- Postgres as the canonical data store.
- Row Level Security for permissions.
- Supabase Realtime for live leaderboard and score updates.
- Historical Firebase data should be migrated into Supabase.
- Historical results must preserve both raw/no-handicap output and the legacy adjusted/old-handicap-method output. Do not recalculate old tournaments using 2026 CPI rules.

Keep the Firebase project/data untouched as a backup migration source. Do not build dual-write or gradual migration infrastructure unless explicitly requested.

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

The Ruff Ryder newsletter voice guide lives at `docs/ai-tone-of-voice.md`, with Markdown source conversions in `docs/newsletters/`. Runtime OpenAI recap context is the compact module `netlify/functions/ai-tone-context.mjs`; keep it aligned with the doc when changing the house voice. AI-generated copy should not invoke Big Al/Reyno/Al Reynolds lore unless supplied factual context requires a neutral mention.

Do not use `supabase gen types --db-url` for type generation. That CLI path requires Docker. Use:

```bash
npm run supabase:types
```

This derives the project ref from `VITE_SUPABASE_URL` and uses `supabase gen types --project-id`, which does not require Docker.

## Suggested Domain Model

Prefer new 2026 concepts over adapting legacy `Game` fields:

- `Tournament`: event metadata, active/completed flags, CPI threshold.
- `Fixture`: one group chosen by captains; support the live fixture templates of 2-player full-18 singles, 4-player standard matches, and 6-player flexible matches.
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
- `20260502205500_segment_cpi_toggle_and_net_scores.sql` adds segment-level CPI toggles and relaxes net-score constraints so saved scores can be recalculated when CPI is disabled.
- `20260502214500_lock_completed_tournament_scores.sql` updates RLS helpers/policies so completed tournaments block score writes.
- `20260502222500_course_holes_metadata.sql` creates `course_holes` with stroke index, par, yardage, RLS, and admin management policies.
- `20260503081500_profile_self_service.sql` adds the `update_own_profile` RPC so users can edit display name/avatar without broad profile update permissions.
- `20260503142000_audit_logs.sql` creates immutable trigger-backed audit logging for 2026 live tables and publishes `audit_logs` over Realtime.
- `20260503143000_seed_course_hole_yardage.sql` backfills par-three course yardage from the legacy Firebase `config/holeDistances` data.
- `20260503190000_ai_overviews.sql` creates persisted AI player and tournament overview tables with RLS and Realtime publication entries.
- `20260503201000_tournament_activity_feed.sql` exposes a sanitized `get_tournament_activity` RPC for authenticated users so the Tournament tab can show full activity without exposing raw audit row JSON.
- `20260503203000_ai_newsroom_artifacts.sql` creates persisted AI newsroom artifacts for highlights commentary, moment of the round, cheese detector, rivalry watch, captain's briefing, and post-round reports.
- `20260503211500_profile_access_admin.sql` adds profile access-disabled metadata used by the server-side Supabase Auth admin flow.
- `20260504140500_fix_course_par_three.sql` resets existing course hole metadata to par 3 while leaving Admin course metadata edits available.
- `20260504153000_player_tiers.sql` adds admin-owned `players.tier` roster tiers, backfilled in even thirds from player history metrics with CPI fallback.

When adding tables that should update the main Supabase console live, keep the Realtime publication migration pattern and `subscribeToTournament2026Changes()` in sync.

Supabase Auth email template copy/design is documented in `docs/supabase-auth-email-template.md`. Supabase currently owns the actual hosted email template; keep the repo doc in sync when the login voice changes.

## Implementation Guidance

- Read `DESIGN.md` before building or changing UI.
- Put pure 2026 scoring logic in `src/domain/2026/`; keep React formatting and display helpers in `src/features/tournament2026/`.
- Build scoring utilities before UI or persistence code depends on them.
- Keep score derivation pure and well-tested.
- Prefer deriving standings from hole scores through SQL views/RPC or pure functions before storing duplicate totals.
- Store timeline snapshots only if needed for historical charts.
- Do not recreate the retired Firebase frontend under `src/components/` or route new work through old `Game`/`Tournament` UI shapes.
- Keep imports at the top of files. Use exhaustive switch handling for 2026 unions such as segment kind and hole outcome.

## 2026 Supabase UI

The fresh Supabase-backed console is the main app at `/`. `/2026` remains a compatibility alias for existing bookmarks, and retired legacy URLs redirect back to `/`. The 2026 route owns its own Supabase session flow because the 2026 schema uses Supabase Auth and RLS; do not reintroduce the legacy Firebase `AuthProvider`.

Current 2026 UI/service layout:

- `src/App.tsx` routes `/` and `/2026` to `src/pages/Tournament2026.tsx`. Retired legacy paths such as `/legacy/*`, `/login`, `/dashboard`, `/profile`, `/about`, `/password-reset-complete`, and old score-entry deep links redirect to `/`.
- `src/contexts/ThemeContext.tsx` owns the persisted `light`/`dark` theme state. `src/index.css` contains the current light-mode utility overrides for the mostly literal dark terminal palette.
- `src/utils/storage.ts` clears retired localStorage keys on app startup while preserving theme preferences.
- `src/lib/supabase.ts` lazily creates the browser Supabase client and surfaces a config warning when the main app is missing Supabase env vars.
- `src/pages/Tournament2026.tsx` is the route-level orchestrator. It handles Supabase config checks, OTP sign-in, profile creation flow, auth state refresh, realtime subscription setup, and section composition.
- The authenticated Supabase app nav is bottom-only and task-based: `My Game`, `Tournament`, `Archive`, `Profile`, plus admin-only `Admin`. Do not show admin setup to non-admins in nav, keep sign-out in Profile with confirmation, and keep the theme toggle in the app rail. When active tab changes, the bottom rail should scroll the selected item toward center while clamping to the rail's natural start/end bounds.
- `src/features/tournament2026/components/AuthPanels.tsx` contains sign-in and profile creation panels. The sign-in panel supports email validation, a resend cooldown, and Ruff Ryders access-card language without visible backend/vendor language. First-time profile creation uses the shared emoji picker.
- `src/features/tournament2026/components/AvatarEmojiPicker.tsx` owns the compact custom avatar picker used by profile creation and profile editing.
- `src/features/tournament2026/components/Layout.tsx` contains shared shell, terminal page, collapsible disclosure row, panel, form, and status-card primitives for the 2026 console. `CollapsibleSection` defaults closed; explicitly pass `defaultOpen` only when a workflow truly needs an expanded first view.
- `src/features/tournament2026/components/ThemeToggle.tsx` renders the tracked light/dark switch for login, profile creation, and the authenticated nav. Track source-specific theme changes through `track2026()`.
- `src/features/tournament2026/components/PlayerHistory.tsx` owns the shared player-history popover for the 2026 console. Wrap authenticated `Tournament2026` content in `PlayerHistoryProvider` and use `PlayerHistoryTrigger` for non-conflicting player-name displays instead of creating one-off popovers.
- `src/features/tournament2026/components/FixtureDetailsPopover.tsx` owns shared clickable fixture titles and fixture result/status popovers. Use `FixtureTitleTrigger` for fixture titles in Tournament, My Game, and Admin fixture lists; pass admin fixture-name edit props only from Admin surfaces.
- `src/features/tournament2026/components/Hero.tsx` is legacy/unused after the bottom-nav IA cleanup; do not build new flows around it unless it is reintroduced intentionally.
- `src/features/tournament2026/components/LeaderboardSection.tsx` treats match points from `calculatePointTotals()` as the official scoreboard, with holes-won totals shown only as a separate momentum ledger. Keep the Tournament tab visually aligned with the Archive view: flat full-width ledgers and feeds with thin dividers, not tiled dashboard cards or a `Panel` containing more panels. Secondary Tournament surfaces should be collapsible while the top match state stays visible.
- `src/features/tournament2026/components/LeaderboardSection.tsx` also shows fixture progress, segment match status chips, 2026 highlights, a Chart.js live score curve, and score-movement timeline data for tournament-day scanning.
- Highlights Reel logic uses current `players.tier` values for tier-aware good/bad hole weighting, with capped categories for standout scoring, smackdowns, close matches, early close-outs, and CPI upsets.
- `src/features/tournament2026/components/LeaderboardSection.tsx` shows Win Pressure as a derived, non-persisted Tournament-tab forecast. Keep pure probability logic in `src/domain/2026/winProbability.ts` and use `src/features/tournament2026/winProbability.ts` only as the live data adapter. Win Pressure should forecast per-segment point outcomes and aggregate those points; do not fall back to pooled holes-won odds.
- `src/features/tournament2026/components/LeaderboardSection.tsx` includes persisted tournament overview and newsroom artifact sections backed by AI generation. Player-facing Tournament section titles should not include `AI`. It builds compact snapshots through `src/features/tournament2026/aiRecap.ts` and calls Netlify Functions after each 5 newly saved holes; do not call OpenAI directly from browser code. AI snapshots should present official point totals as the scoreboard and holes-won totals as momentum only.
- `src/features/tournament2026/components/MarkdownContent.tsx` renders saved Markdown AI/player overview copy; keep provider output sanitized by the server boundary and avoid raw HTML rendering in browser components.
- `src/features/tournament2026/components/TournamentActivitySection.tsx` is the separate full tournament activity feed in the Tournament tab. It renders sanitized audit events plus inferred match started/finished milestones from `src/features/tournament2026/activity.ts`; keep it separate from the Highlights Reel.
- `src/features/tournament2026/components/PlayerAiOverview.tsx` displays persisted AI player overviews in own Profile and player history popovers. Linked players and admins can regenerate with an optional short prompt; saved output is visible to all authenticated users. In Profile it should sit inside the page flow without adding another card border; popover/history contexts can keep compact card chrome.
- `src/features/tournament2026/components/ScoreEntrySection.tsx` renders player-scoped fixture score entry as collapsible work cards with front/back switches, the active hole expanded with a prominent hole number while previously played holes stay visible as compact saved rows that can be re-opened to edit, grouped back-nine singles by hole, Supabase-backed course metadata, compact saved-by/saved-time audit metadata, per-hole CPI shot/net-score explanations when CPI applies, and autosaves complete hole rows through the 2026 query service after a short debounce. `My Game` stays scoped to the signed-in user's linked player even for admins; admin-wide fixture edits, score clears, and segment CPI toggles belong in Admin → Fixtures. Supabase saves are only considered saved after server acknowledgment; keep local draft persistence, save timeouts, global sync/error status, reconnect retry, retry-all, and leave-page warnings intact. It must remain locked when `tournaments.is_complete` is true.
- `src/features/tournament2026/components/StatsSection.tsx` is legacy/unused after the Archive consolidation; prefer the Archive player-history view for new work unless this file is removed.
- `src/features/tournament2026/components/AdminSetupSection.tsx` is admin-only and organized as collapsible task sections: Tournament, Players, Fixtures, Course, and Activity. Keep Admin task headers sticky and compact while open so admins can collapse the active section without scrolling back to its start. Tournament includes the all-tournaments activation list, with create-tournament opened from a popover below that list. Players uses a compact filterable/sortable roster table with shared player-history triggers, left-side popover edit actions, team/tier/handicap/updated/link/name/email scan columns, profile linking/access admin, and the manual `player_tournament_stats` history editor. Fixtures owns fixture creation plus fixture corrections, score clears, segment membership edits, and segment CPI toggles; full-18 2-player singles corrections are side-based (`Side A` / `Side B`) so same-team matches remain editable. Course shows current par/yardage and lets admins correct metadata; current seeded course values should be par 3 on every hole. Activity reads recent DB-backed audit logs. Keep destructive fixture correction flows confirmation-gated. Admin profile linking/role/access edits belong in the Players section, not the user Profile page.
- Player roster tier is an admin-owned attribute on `players` only. Display the current tier beside roster/history/profile identity, but edit it only in Admin → Players.
- `src/features/tournament2026/components/ProfileSection.tsx` supports self-service profile display name/avatar through the `update_own_profile` RPC and account sign-out. Keep it scoped to the signed-in user's own account.
- PostHog for the main Supabase app identifies Supabase users by email and registers profile/player super properties after profile load. Keep new AI, profile, archive, score-entry, and admin interactions tracked with `track2026()` using flat snake_case event properties.
- `src/utils/analytics.ts` must stay Firebase-free so the main app can load without legacy Firebase config or client Firebase dependencies.
- `src/features/tournament2026/components/HistorySection.tsx` exports the Archive view. It combines historical tournament drilldowns from `legacy_tournaments`/`legacy_games` with player history from `player_tournament_stats`. Migrated score-only rows should display as historical scores/CPI, not as `0/0` 2026 hole-count stats.
- `src/features/tournament2026/components/FormControls.tsx` holds small shared form controls for the 2026 UI.
- `src/features/tournament2026/insights.ts` derives 2026 highlights and score-movement timeline data from fixture segments and hole scores.
- `src/features/tournament2026/activity.ts` formats sanitized audit rows and inferred match milestones for the user-facing tournament activity feed.
- `src/features/tournament2026/viewUtils.ts` holds UI-only formatting, totals, hole-range, and parsing helpers.
- `src/hooks/useOnlineStatus.ts` feeds the app-level offline banner and connection analytics. Score-entry retry behavior still lives in `ScoreEntrySection.tsx`.
- `src/services/adminUserService.ts` calls the `admin-user-access` Netlify Function for Supabase Auth deactivation/reactivation/deletion. Browser code must never call Supabase Auth admin APIs or use the service-role key directly.
- `src/services/tournament2026Queries.ts` reads live tournament data, subscribes to Supabase Realtime changes, creates tournaments/players/fixtures, loads all admin-visible tournaments, `course_holes`, player stats, AI overviews/newsroom artifacts, audit logs, and score editor profiles, handles profile/admin corrections/finalization/player-history edits, and upserts/deletes hole scores through the pure scoring core. When tournament CPI threshold changes, existing scored rows should be recalculated so saved CPI outcomes stay consistent. Scored segment membership edits must explicitly clear that segment's saved scores before replacing the players; never silently reassign saved scores to different players.
- `audit_logs` is database-triggered, not client-authored. The browser should read it for admin/player activity views, but app code should not insert, update, or delete audit rows directly.
- `src/services/tournament2026Service.ts` owns fixture setup persistence orchestration and rollback around fixture, fixture-player, segment, and segment-player inserts.
- `src/domain/2026/scoring.ts` is the pure scoring core for CPI, foursomes, singles, halved/unplayed outcomes, and fixture summaries.
- `src/domain/2026/points.ts` derives points-on-table and provisional points. Keep foursomes as 1 total match-play point, not 1 point per player; 4-player standard fixtures have 3 total points and 6-player flexible fixtures have 4 total points.
- `src/domain/2026/persistence.ts` maps scored holes into Supabase `hole_scores` insert/upsert payloads.
- `src/domain/2026/fixtures.ts` builds and validates fixture/segment setup payloads for 2-player full-18 singles, 4-player standard matches, and 6-player flexible matches.
- `src/domain/2026/finalization.ts` validates completion and derives back-nine-singles-only player stats plus 18-hole-equivalent CPI updates.
- Finalization stats store `legacy_payload.cpi_before`; reopening a tournament should restore those CPI values, delete generated app stats, then unlock the tournament.
- `src/domain/2026/matchPlayStatus.ts` calculates segment dormie/match-over status and fixture progress from expected hole ranges plus saved outcomes.
- Fixture setup uses explicit admin templates: 2-player full-18 singles, 4-player standard match, and 6-player flexible match. 2-player fixtures should stay in the 2026 segment model, not fall back to legacy games, and the builder may assign any two distinct players to the two scoring sides. In 6-player fixtures, exactly 2 USA and 2 Europe players are selected for front-nine foursomes, while all 6 players can be paired into three back-nine singles matches.

## Testing Expectations

Add focused tests for behavior changes:

- CPI default threshold is 7 strokes.
- CPI applies only to singles and never to front-nine foursomes.
- Segment-level CPI toggles disable adjusted scoring and recalculate already-entered hole scores for that segment.
- Halved holes display correctly and do not incorrectly award holes won.
- Front-nine foursomes hole winners roll up correctly.
- Front-nine foursomes points award 1 total point for a win and 0.5 per side for a halve, regardless of two-player team membership.
- Back-nine singles scoring rolls up correctly.
- Dormie/match-over and fixture progress count missing score rows as unplayed.
- Only back-nine singles scores feed player history and CPI updates.
- Any fixture player can update fixture scores; unrelated players cannot.
- Admin correction actions update player details, keep linked profile teams in sync, and can clear or delete accidental fixture data.
- Admin tournament list actions activate one Supabase tournament at a time and can leave all tournaments inactive during setup.
- Manual player history edits create/update/delete `player_tournament_stats` rows without weakening authenticated read access.
- Supabase Auth user access changes go through the server-side admin function and never expose service-role credentials to browser code.
- Fixture template and segment membership works for 2-player full-18 singles, 4-player standard matches, and 6-player flexible matches.
- Course metadata import preserves Firebase `config/holeDistances` yardages and stroke indices.
- Audit logs are created by database triggers for score/setup/profile/course/finalization changes and remain read-only to browser clients.
- Score entry preserves unsaved drafts locally, surfaces failed saves globally, and keeps retry behavior visible when Supabase writes fail or time out.
- Historical Firebase-shaped data migrates into the Supabase schema without changing old results.
- Historical pages can display raw/no-handicap and legacy adjusted/old-handicap-method results exactly as they were.

Current coverage baseline after the May 2026 coverage pass: full Vitest coverage is about 67% statements overall, with `src/domain/2026` about 97% statements / 93% branches. Scoring, fixture setup, match-play status, persistence, finalization, Supabase config, analytics, storage, AI browser service wrappers, activity formatting, and view utilities have focused coverage. Remaining broad coverage drag is mostly Netlify Functions, scripts/config files, route orchestration in `src/pages/Tournament2026.tsx`, and legacy/unused UI such as `Hero.tsx` and `StatsSection.tsx`; prefer adding tests there only when behavior changes or those surfaces become active again.

Current focused 2026 and support tests include:

- `src/__tests__/analytics.test.ts`
- `src/__tests__/aiServices.test.ts`
- `src/__tests__/tournament2026Scoring.test.ts`
- `src/__tests__/tournament2026Points.test.ts`
- `src/__tests__/tournament2026Persistence.test.ts`
- `src/__tests__/tournament2026Fixtures.test.ts`
- `src/__tests__/tournament2026CustomFixture.test.ts`
- `src/__tests__/tournament2026Service.test.ts`
- `src/__tests__/tournament2026Permissions.test.ts`
- `src/__tests__/tournament2026Finalization.test.ts`
- `src/__tests__/tournament2026MatchPlayStatus.test.ts`
- `src/__tests__/tournament2026Activity.test.ts`
- `src/__tests__/tournament2026Insights.test.ts`
- `src/__tests__/tournament2026AiRecap.test.ts`
- `src/__tests__/tournament2026AiOverview.test.ts`
- `src/__tests__/tournament2026ViewUtils.test.ts`
- `src/__tests__/supabaseClient.test.ts`
- `src/__tests__/adminUserService.test.ts`
- `src/__tests__/firebaseExportMigration.test.ts`
- `src/__tests__/storage.test.ts`
- `src/__tests__/useOnlineStatus.test.ts`
- `src/__tests__/Tournament2026AuthPanels.test.tsx`
- `src/__tests__/Tournament2026Layout.test.tsx`
- `src/__tests__/Tournament2026Archive.test.tsx`
- `src/__tests__/Tournament2026Panels.test.tsx`
- `src/__tests__/Tournament2026ProfileSection.test.tsx`
- `src/__tests__/Tournament2026Routing.test.ts`
- `src/__tests__/ScoreEntrySection.test.tsx`
- `src/__tests__/LiveTournamentProgressChart.test.tsx`
- `src/__tests__/AppRouting.test.tsx`

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
- The Firebase export includes the legacy `config` collection. `config/holeDistances.indices` maps to `course_holes.yardage`, and `config/strokeIndices.indices` maps to `course_holes.stroke_index`; current course rows should start with `course_holes.par = 3` for every hole, while Admin remains able to correct par metadata.
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
npm run dev:vite
npm run type-check
npm run lint
npm run supabase:types
npm run migrate:firebase-export -- <firebase-export.json>
npx vitest run
```

Use `npm run dev` for the Netlify Functions-aware local app and `npm run dev:vite` only when browser-only Vite dev server behavior is enough.

After substantive TypeScript/React changes, run targeted tests first, then broader checks when the change is ready.
