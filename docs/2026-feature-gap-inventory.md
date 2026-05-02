# 2026 Feature Gap Inventory

This file tracks product gaps between the current `/2026` Supabase console, the 2026 rules spec, and useful legacy app behavior.

## Implemented In Current Console

- Supabase Auth sign-in and profile creation.
- Active tournament creation.
- Player creation with team and current CPI.
- Mobile fixture builder for 2-6 player fixtures, front-nine participants, back-nine singles pairings, CPI toggles, and preview before save.
- Admin correction controls for player details/CPI, clearing mistaken fixture scores, and deleting accidental fixtures.
- Front-nine foursomes and back-nine singles segments.
- Match-play-only scoring with halved and unplayed holes separated.
- CPI on singles only, with per-segment admin enable/disable.
- Fixed course stroke index display.
- Hole distance display when Firebase `config/holeDistances` data is available.
- Mobile tab navigation for score, leaderboard, setup, history, and profile.
- Tap-first score picker with row-level dirty state, autosave, sync status, retry fallback, and segment-level `Save all`.
- Admin profile-to-player linking, profile access display, and player-only Score tab fixture filtering.
- Live leaderboard totals split by overall, foursomes, and singles.
- Imported legacy tournament score summary display with raw and legacy adjusted totals.

## Missing Before Tournament Day

- Editing existing fixtures and segments after creation.
- Admin correction flows for tournaments, segment membership, and more granular single-hole score deletion.
- Completed tournament locking/finalization for the 2026 model.
- Player history/CPI recalculation from back-nine singles only.
- Detailed legacy archive view that drills into imported games, not just tournament-level totals.
- Mobile score-entry QA on real devices for outdoor use.

## Nice To Have

- Dormie / match-over status for singles and foursomes segments.
- Autosave or optimistic save confirmation after stable tournament-day testing.
- Fixture progress indicators showing holes completed per segment.
- Better admin import/status tooling for Firebase archive data.
- Score audit trail showing who edited a hole and when.

