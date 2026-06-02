# Ruff Ryders Cup

https://ruffryder.golf

The Ruff Ryders Cup app is the live tournament console for players. Use it on tournament day to see your fixture, enter scores, follow the USA vs Europe leaderboard, and look back through old results.

## Start Here

Open the app:

https://ruffryder.golf

Sign in with the email address linked to your player profile. If you are prompted to finish your profile, add your display name and avatar so the rest of the field can recognise you.

The app is built for phones. The bottom navigation is the main way around:

- `My Game`: your fixture and score-entry cards.
- `Tournament`: live leaderboard, fixture progress, highlights, and tournament activity.
- `Archive`: previous tournament results and player history.
- `Profile`: your account, display details, and sign out.
- `Admin`: setup and corrections, shown only to admins.

Use the sun/moon button to switch between light and dark mode. The app remembers your choice.

## Entering Scores

Any player in a fixture can enter scores for that fixture. `My Game` is tied to your linked player profile, even for admins. Admin-wide score corrections, fixture edits, and score clears live in `Admin` > `Fixtures`.

On `My Game`, open the relevant fixture card, choose the front or back nine, then tap in the score for each hole. Scores autosave after the server confirms them. Watch the saved or retry status if your signal is patchy.

If a score looks wrong, fix it as soon as possible. If the tournament has been finalized or a score needs a larger correction, ask an admin.

## 2026 Scoring

The tournament is USA vs Europe.

Fixtures can be 2-player full-18 singles, standard 4-player matches, or flexible 6-player matches depending on captain setup.

Holes 1-9 are foursomes, also known as alternate shot. Each side enters one team score per hole, and the lower score wins the hole.

Holes 10-18 are singles match play. Each singles match is scored hole by hole, and the lower score wins the hole. A tied hole is halved and does not add a hole won to either team.

Each foursomes or singles match is worth 1 team point, or 0.5 points to each side if halved. A 2-player full-18 fixture also has a separate 18-hole stroke-play point.

For the full format, see the [2026 rules](./docs/2026-rules-spec.md).

## CPI

CPI is the 2026 replacement for handicap.

CPI only applies to singles. It never affects front-nine foursomes. By default, CPI applies when singles opponents differ by 7 or more CPI strokes, although admins can disable it for a specific singles match.

When CPI applies, strokes are removed from the higher-CPI player's score on the relevant holes. In plain English: the player getting help sees their net score go down.

## Following The Tournament

Use `Tournament` during the round. It shows the live team total, how many holes have been played, how the score is moving, and the latest activity.

Use `Archive` after the round to look back at past tournaments and player history. Older tournaments preserve their original scoring rules, so historical adjusted results may not match the 2026 CPI method.

## Need Help?

If you cannot sign in, cannot see your fixture, or think your profile is linked to the wrong player, ask an admin or captain.

If score entry fails, check your connection and use the retry controls. Do not refresh away from unsaved scores unless the app says they are saved.