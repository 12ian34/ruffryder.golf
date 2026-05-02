# 2026 Feature Gap Inventory

This file tracks product gaps between the current `/2026` Supabase console, the 2026 rules spec, and useful legacy app behavior.

## Implemented In Current Console

- Supabase Auth sign-in and profile creation.
- Active tournament creation.
- Player creation with team and current CPI.
- Quick 4-ball fixture creation.
- Front-nine foursomes and back-nine singles segments.
- Match-play-only scoring with halved and unplayed holes separated.
- CPI on singles only, with per-segment admin enable/disable.
- Fixed course stroke index display.
- Hole distance display when Firebase `config/holeDistances` data is available.
- Row-level dirty state, row Save buttons only when changed, and segment-level `Save all`.
- Live leaderboard totals split by overall, foursomes, and singles.
- Imported legacy tournament score summary display with raw and legacy adjusted totals.

## Missing Before Tournament Day

- Full captain/admin fixture builder for arbitrary fixture sizes, including 6-ball setup and custom segment membership.
- Admin edit/delete flows for tournaments, players, fixtures, segments, and mistaken hole scores.
- Player-to-profile linking so non-admin players can only edit their own fixture scores.
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

