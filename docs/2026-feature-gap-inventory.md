# 2026 Feature Gap Inventory

This file tracks product gaps between the current `/2026` Supabase console, the 2026 rules spec, and useful legacy app behavior.

## Implemented In Current Console

- Supabase Auth sign-in and profile creation.
- Active tournament creation.
- Player creation with team and current CPI.
- Mobile fixture builder for 2-6 player fixtures, front-nine participants, back-nine singles pairings, CPI toggles, and preview before save.
- Admin correction controls for player details/CPI, clearing mistaken fixture scores, and deleting accidental fixtures.
- Admin correction controls for active tournament details and single-hole score clearing.
- Admin correction controls for fixture names, segment names, singles pair reassignment, and front-nine segment membership.
- Scored segment membership corrections use a confirmed "clear scores + save" flow so old scores are not silently reassigned to new players.
- Front-nine foursomes and back-nine singles segments.
- Match-play-only scoring with halved and unplayed holes separated.
- Dormie/match-over segment status and fixture progress indicators.
- CPI on singles only, with per-segment admin enable/disable.
- Fixed course stroke index display.
- Supabase-backed course metadata for stroke index, par, and yardage display, with admin editing for par and yardage.
- Mobile tab navigation for score, leaderboard, setup, history, and profile.
- Tap-first score picker with row-level dirty state, autosave, sync status, retry fallback, and segment-level `Save all`.
- Admin profile-to-player linking, profile access display, and player-only Score tab fixture filtering.
- Tournament finalization that locks score entry, saves back-nine singles player stats, and updates current CPI.
- Tournament reopen flow that restores pre-finalization CPI values, removes generated app stats, and unlocks score entry.
- Live leaderboard totals split by overall, foursomes, and singles.
- Imported legacy tournament history with raw/legacy adjusted totals and game-level drilldown.
- Compact score audit metadata showing when saved rows were last updated and who edited them when profile data is available.

## Missing Before Tournament Day

- Mobile score-entry QA on real devices for outdoor use.

## Nice To Have

- Autosave or optimistic save confirmation after stable tournament-day testing.
- Better admin import/status tooling for Firebase archive data.
- Full score edit history across multiple edits per hole.

