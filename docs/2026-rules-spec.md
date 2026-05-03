# 2026 Ruff Ryders Cup Rules Spec

This is the canonical product rules spec for the 2026 tournament rebuild.

## Format

- The tournament is USA vs Europe.
- A normal fixture contains four players: two USA players and two Europe players.
- Admins may also create flexible fixtures when tournament logistics need them, including 1v1 singles fixtures between any two players and larger groups such as 6-balls.
- Captains/admins choose the fixtures and the scoring segments inside each fixture.
- All scoring is match-play-only. There is no separate stroke-play points competition.

## Holes 1-9: Foursomes

- Holes 1-9 are foursomes / alternate shot.
- The selected USA pair plays one ball against the selected Europe pair's one ball.
- One team score is entered per side per hole.
- The lowest combined/team score wins the foursomes hole.
- Course Performance Index (CPI) does not apply at all during foursomes.
- Foursomes scores do not count toward player history or future CPI updates.

## Holes 10-18: Singles

- Holes 10-18 are individual match play.
- A normal 4-ball fixture has two singles matches on the back nine.
- A flexible fixture, such as a 6-ball, may have a configurable number of back-nine singles matches.
- A 1v1 fixture is a full-course singles match over holes 1-18 and skips front-nine foursomes.
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
- Par and yardage are admin-maintained setup data and should be visible during score entry for player context.

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
- The model should support configurable fixture sizes and segment membership. Four-player fixtures are the default, but full-course 1v1 fixtures between any two players and 6-ball fixtures must not require a schema rewrite.
- Pre-2026 data should use legacy archive tables and should not be forced into the 2026 live model.
