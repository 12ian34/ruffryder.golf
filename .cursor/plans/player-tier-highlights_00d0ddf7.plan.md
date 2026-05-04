---
name: player-tier-highlights
overview: Add a stored, admin-editable Tier 1/2/3 roster attribute, backfill it into even thirds from existing stats, show it across player/profile/archive surfaces, and use it to rebalance Highlights Reel logic without flooding the reel.
todos:
  - id: schema-tier
    content: Add `players.tier` migration with normalized SQL backfill.
    status: pending
  - id: service-tier
    content: Update Supabase types and player create/update service payloads.
    status: pending
  - id: tier-ui
    content: Show/edit tier in admin, profile, player popover, and archive surfaces.
    status: pending
  - id: highlight-rules
    content: Implement tier-aware, smackdown, and close-match highlight rules with caps.
    status: pending
  - id: tests-docs
    content: Update tests, run verification, and refresh `AGENTS.md` guidance.
    status: pending
isProject: false
---

# Player Tier Highlights Plan

## Data Model
- Add a migration in `supabase/migrations/` to add `players.tier smallint not null default 2 check (tier between 1 and 3)`.
- Backfill existing players into even thirds with SQL using historical performance first, current CPI as fallback:
  - Build a per-player metric from `player_tournament_stats`: average `singles_average`, fallback average `cpi_after`, fallback `players.current_cpi`.
  - Rank lower metrics as better and assign `ntile(3) over (order by metric asc nulls last)` so Tier 1 is strongest, Tier 3 is weakest.
  - Keep players with no usable data at Tier 2.
- Keep tier on `players` only. Archive/history surfaces will show the current roster tier beside historical stats rather than duplicating tier into `player_tournament_stats`.

## Services And Types
- Update `src/types/supabase.ts` for the new `players.tier` row/insert/update shape. If remote type generation is available, use `npm run supabase:types`; otherwise apply the generated-type delta by hand to match the migration.
- Extend `CreatePlayerInput`, `UpdatePlayerInput`, `createPlayer2026()`, and `updatePlayer2026()` in `src/services/tournament2026Queries.ts` to persist `tier`.
- Add a small shared tier formatter/helper, likely in `src/features/tournament2026/viewUtils.ts` or near `PlayerHistory.tsx`, so copy stays consistent as `Tier 1`, `Tier 2`, `Tier 3`.

## UI Surfaces
- Admin Players in `src/features/tournament2026/components/AdminSetupSection.tsx`:
  - Add tier select to create/edit player forms.
  - Show tier in roster rows next to current CPI.
  - Track tier in `player_created` / `player_updated` event properties.
- Own Profile in `src/features/tournament2026/components/ProfileSection.tsx`:
  - Show linked player tier as read-only roster info.
- Player popover/profile in `src/features/tournament2026/components/PlayerHistory.tsx`:
  - Show tier in the popover header next to current handicap.
  - Optionally extend `PlayerIdentity` with an opt-in `showTier` prop, rather than forcing tiers into every compact player name.
- Archive/history in `src/features/tournament2026/components/HistorySection.tsx`:
  - Add tier beside `PlayerArchiveName` in the player stats archive.
  - Add tier chip beside legacy game player names when a linked `PlayerRow` exists.

## Highlight Rules
- Update `src/features/tournament2026/insights.ts` to replace the fixed generic blow-up/birdie weighting with tier-aware scoring:
  - Positive highlights: Tier 3 gets par-or-better, Tier 2 gets birdie-or-better, Tier 1 gets birdie-or-better with lower priority than weaker-player par moments.
  - Negative highlights: use tier-aware bad-score thresholds so Tier 1 bad holes surface earlier, Tier 3 bad holes are not overcalled.
- Add “smackdown” highlight for a side winning a hole by 4+ gross strokes, capped to one item per reel.
- Add close-match highlight for match status moments such as all square after the segment halfway point or all square / one-up with 3 or fewer holes remaining, capped to one item per reel.
- Keep the existing early close-out/game-over highlight, but cap category output and keep total Highlights Reel output at 8 so the new rules do not dominate.

## Tests And Docs
- Update `src/__tests__/tournament2026Insights.test.ts` for tier-aware positive/bad-hole highlights, 4+ shot hole wins, close-match alerts, and category caps.
- Update service/admin permission tests that assert player create/update payloads, especially `src/__tests__/tournament2026Permissions.test.ts`.
- Update component tests/fixtures that construct `PlayerRow` objects so they include `tier`.
- Update `AGENTS.md` minimally to document `players.tier`, admin ownership, and that highlights use tier-aware weighting.
- Run targeted tests first, then `npm run type-check` and relevant broader Vitest suites if the changes compile cleanly.