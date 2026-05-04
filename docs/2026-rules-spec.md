# 2026 Ruff Ryders Cup Rules Spec

This is the canonical product rules spec for the 2026 tournament rebuild.

## Format

- The tournament is USA vs Europe.
- Admins create fixtures from three supported templates:
  - 2-player full 18: any two distinct players, including USA vs USA, Europe vs Europe, or USA vs Europe. The fixture assigns the two scoring sides for that match.
  - 4-player standard match: two USA players and two Europe players.
  - 6-player flexible match: three USA players and three Europe players.
- Captains/admins choose the fixtures and the singles pairings inside each fixture.
- All scoring is match-play-only. There is no separate stroke-play points competition.

## Holes 1-9: Foursomes

- Holes 1-9 are foursomes / alternate shot.
- The selected USA pair plays one ball against the selected Europe pair's one ball.
- In a 4-player standard match, all four players are the front-nine foursomes players.
- In a 6-player flexible match, admins choose exactly two USA players and exactly two Europe players for front-nine foursomes.
- A 2-player full-18 fixture skips front-nine foursomes.
- One team score is entered per side per hole.
- The lowest combined/team score wins the foursomes hole.
- Course Performance Index (CPI) does not apply at all during foursomes.
- Foursomes scores do not count toward player history or future CPI updates.

## Holes 10-18: Singles

- Holes 10-18 are individual match play.
- A 4-player standard match has two USA-vs-Europe singles matches on the back nine.
- A 6-player flexible match has three USA-vs-Europe singles matches on the back nine.
- A 2-player full-18 fixture is a full-course singles match over holes 1-18 and may use any two distinct players.
- Singles scores are the only scores that count toward player history and future CPI updates.
- CPI can apply only during back-nine singles.

## Course Performance Index

- Handicap is renamed Course Performance Index (CPI).
- Default CPI threshold is 7 strokes.
- CPI applies only when singles opponents differ by 7 or more CPI strokes.
- CPI is configurable per singles pairing. Admins can disable it for a singles match even when the CPI gap qualifies.
- When CPI applies, strokes are removed from the higher-CPI player. In plain terms: the weaker player gets strokes taken off their score.
- CPI threshold remains configurable per tournament/admin for future years.
- CPI never affects front-nine foursomes scoring, display, or totals.
- Stroke index is course-defined and not editable during score entry.

## Course Metadata

- Every hole should have course-defined hole number, stroke index, par, and distance/yardage metadata when available.
- Stroke index is fixed scoring data and should not be edited during live score entry.
- The current course is par 3 on every hole. Par is admin-maintained setup data so admins can correct it if the course setup changes.
- Par and yardage should be visible during score entry for player context.

## Hole Results

- In foursomes, the lower combined/team score wins a hole.
- In singles, the lower individual score wins a hole.
- Tied holes are shown as halved.
- A halved hole is equivalent to no hole won by either team for team totals.
- Unplayed holes should be represented separately from halved holes.

## Score Entry Permissions

- Any player in a fixture can enter scores for that fixture.
- Admins can enter or manage scores for all fixtures.
- Players outside a fixture cannot enter scores for that fixture.

## Auditability

- Score, setup, profile, course metadata, finalization, and correction actions should be audit logged with actor, time, action, and affected record context.
- Admins should be able to review recent audit activity.
- Player-facing score rows should show compact last-saved metadata when available.

## Leaderboard

- The leaderboard shows live team totals from foursomes and singles.
- It should make clear how much of the score came from front-nine foursomes and back-nine singles.
- It should not show separate stroke-play points for 2026 tournaments.

## Historical Results

- Old Firebase tournaments must remain viewable as read-only history.
- Historical results should support both raw/no-handicap and legacy adjusted/old-handicap-method views.
- Historical adjusted results must be preserved as they were under the old system.
- Do not recalculate old tournaments with the new 2026 CPI rules.

## Open Implementation Notes

- The app may store halved holes as a named outcome rather than `0.5` points, as long as display and totals remain unambiguous.
- 2026 live data should use the new fixture/segment model.
- The model should support the three live fixture templates without a schema rewrite: 2-player full 18, 4-player standard match, and 6-player flexible match with selected front-nine foursomes players.
- Pre-2026 data should use legacy archive tables and should not be forced into the 2026 live model.
