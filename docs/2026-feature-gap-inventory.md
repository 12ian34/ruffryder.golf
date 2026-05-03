# 2026 Feature Gap Inventory

This file tracks product gaps between the current `/2026` Supabase console, the 2026 rules spec, and useful legacy app behavior.

## Implemented In Current Console

- Supabase Auth sign-in and profile creation.
- Active tournament creation.
- Player creation with team and current CPI.
- Mobile fixture builder for flexible fixtures, including full-course 1v1 fixtures between any two players, front-nine participants, back-nine singles pairings, CPI toggles, and preview before save.
- Admin correction controls for player details/CPI, clearing mistaken fixture scores, and deleting accidental fixtures.
- Admin correction controls for active tournament details and single-hole score clearing.
- Admin correction controls for fixture names, segment names, singles pair reassignment, and front-nine segment membership.
- Scored segment membership corrections use a confirmed "clear scores + save" flow so old scores are not silently reassigned to new players.
- Front-nine foursomes and back-nine singles segments.
- Match-play-only scoring with halved and unplayed holes separated.
- Dormie/match-over segment status and fixture progress indicators.
- CPI on singles only, with per-segment admin enable/disable.
- Fixed course stroke index display.
- Supabase-backed course metadata for stroke index, par, and Firebase-imported yardage display, with admin editing for par and yardage.
- Mobile bottom navigation for My Game, Scores, Archive, Profile, and admin-only Admin.
- Tap-first score picker with row-level dirty state, autosave, sync status, retry fallback, and segment-level `Save all`.
- Admin profile-to-player linking, profile access display, and player-only Score tab fixture filtering.
- Tournament finalization that locks score entry, saves back-nine singles player stats, and updates current CPI.
- Tournament reopen flow that restores pre-finalization CPI values, removes generated app stats, and unlocks score entry.
- Live leaderboard totals split by overall, foursomes, and singles.
- Imported legacy tournament history with raw/legacy adjusted totals and game-level drilldown.
- Compact score audit metadata showing when saved rows were last updated and who edited them when profile data is available.
- Sortable 2026 player stats/history view with team filtering and current-player highlighting.
- Highlights/fun-facts reel derived from 2026 match-play score data.
- Live score-movement timeline derived from saved hole updates.
- Offline/degraded-connection status in the 2026 shell and score workflow.
- PostHog event coverage for 2026 auth, tab views, score saves, setup actions, finalization, profile changes, and connection changes.
- Database-backed audit logs for score, setup, profile, course, finalization, and correction actions, with an admin Activity view.
- Profile self-service for display name/avatar through a locked-down Supabase RPC.
- Admin profile management for display names, avatars, roles, and player links.
- Player/stat archive rows alongside legacy tournament drilldowns.

## Missing Before Tournament Day

- Mobile score-entry QA on real devices for outdoor use.

## Nice To Have

- Autosave or optimistic save confirmation after stable tournament-day testing.
- Better admin import/status tooling for Firebase archive data.

## Intentionally Not 2026 Parity

- Legacy stroke-play points competition.
- Legacy 18-hole game records with `usaPlayerScore` / `europePlayerScore` fields.
- Legacy fourball pairing as two separate paired games.
- Legacy tournament-wide handicap behavior for live 2026 scoring.

