# Design System — Ruff Ryders Cup

## Product Context

- **What this is:** A live tournament operations and scoring app for an annual USA vs Europe golf competition.
- **Who it is for:** Players, captains, and admins using phones on the course and laptops before/after the tournament.
- **Project type:** Mobile-first web app with admin setup, live score entry, leaderboard, player history, and archive views.
- **Primary job:** Make it obvious what to enter, who is winning, and what changed, even outdoors, between shots, and under time pressure.

## Aesthetic Direction

- **Direction:** Clubhouse scoreboard.
- **Decoration level:** Intentional, not ornamental.
- **Mood:** Crisp, competitive, slightly premium, and legible under pressure. It should feel like a modern digital scorecard, not a generic SaaS dashboard and not golf clip art.
- **Design principle:** The score is the hero. Everything else should reduce ambiguity.

Avoid:

- Golf cliches like grass textures, flag icons everywhere, argyle patterns, or fake leather.
- Generic purple-gradient SaaS styling.
- Dense admin screens that require careful reading on mobile.

## Typography

- **Display:** `Satoshi`, fallback `system-ui`, for tournament names, leaderboard scores, and section headers.
- **Body/UI:** `Geist`, fallback `system-ui`, for forms, labels, cards, and navigation.
- **Data/Tables:** `Geist Mono` or `JetBrains Mono` for hole numbers, score grids, compact stats, and audit/history rows.
- **Loading strategy:** Use CSS font-family tokens first; add hosted font loading only when UI implementation begins.

Type scale:

- `xs`: 0.75rem / 12px
- `sm`: 0.875rem / 14px
- `base`: 1rem / 16px
- `lg`: 1.125rem / 18px
- `xl`: 1.25rem / 20px
- `2xl`: 1.5rem / 24px
- `3xl`: 1.875rem / 30px
- `score`: 3rem / 48px on mobile, 4rem / 64px on desktop

Use tabular numbers for scores wherever possible.

## Color

### Approach

Dark-first, restrained, with team colors used as semantic accents. The UI should feel calm until a team, state, or score needs attention.

### Core Palette

- **Ink 950:** `#08110E` — app background, dark mode base
- **Ink 900:** `#101C18` — dark cards and panels
- **Ink 800:** `#1A2A24` — borders, elevated dark surfaces
- **Chalk 50:** `#F8F5EC` — light text/background
- **Chalk 100:** `#EEE8D8` — muted light surfaces
- **Fairway 500:** `#1F7A4D` — primary action, active state, live indicators
- **Fairway 600:** `#17623E` — primary hover/pressed
- **Pin 500:** `#D9B45F` — highlight, trophy, important neutral accent
- **Sky 500:** `#3B82F6` — Europe accent
- **USA 500:** `#F2B84B` — USA accent

### Team Colors

- **USA:** `#F2B84B`
- **Europe:** `#3B82F6`

Keep team colors for team identity, score comparison, badges, and charts. Do not use them as generic button colors.

Tailwind tokens:

- `team-usa`
- `team-europe`
- `fairway-500`
- `pin-500`
- `ink-950`
- `chalk-50`

### Semantic Colors

- **Success:** `#22C55E`
- **Warning:** `#F59E0B`
- **Error:** `#EF4444`
- **Info:** `#38BDF8`

### Dark Mode

Dark mode is the primary experience. Use high contrast for score entry and leaderboard screens:

- Background: Ink 950
- Card: Ink 900
- Border: Ink 800
- Primary text: Chalk 50
- Secondary text: Chalk 100 at reduced opacity

### Light Mode

Light mode should feel like a clean scorecard:

- Background: Chalk 50
- Card: white
- Border: Chalk 100
- Primary text: Ink 950
- Secondary text: Ink 800 at reduced opacity

## Spacing

- **Base unit:** 4px.
- **Density:** Comfortable for touch, compact for data.

Scale:

- `2xs`: 2px
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px
- `3xl`: 64px

Rules:

- Touch targets should be at least 44px high.
- Score entry controls should have generous vertical spacing.
- Data tables can be tighter, but row hit areas must remain touchable on mobile.

## Layout

- **Approach:** Hybrid.
- **App screens:** Grid-disciplined, predictable, and stable.
- **Leaderboard moments:** More editorial, with large score treatments and strong team contrast.
- **Max content width:** `1120px` for desktop admin/dashboard pages.
- **Mobile:** Single-column first. Important actions stay near the thumb zone.
- **Breakpoints:** Follow Tailwind defaults unless a screen proves otherwise.

Radius:

- `sm`: 4px for small badges and inputs inside dense tables.
- `md`: 8px for buttons and form controls.
- `lg`: 12px for cards.
- `xl`: 16px for major panels/modals.
- `full`: pills, avatars, status dots.

Borders should be visible but quiet. Prefer `1px` borders with subtle contrast over heavy shadows.

## Components

### Buttons

- **Primary:** Fairway background, Chalk text.
- **Secondary:** transparent or subtle surface, bordered.
- **Team actions:** use team colors only when the action belongs clearly to a team.
- **Danger:** Error color, used sparingly.

Button labels should be action-specific: `Save scores`, `Create fixture`, `Complete tournament`.

### Cards

Cards should group one decision or one score unit. Avoid giant multi-purpose panels.

Use:

- Header with title and compact metadata.
- Body with one primary task.
- Footer only when actions need separation.

### Score Entry

Score entry screens must optimize for speed:

- Hole number and segment context always visible.
- Current match status visible near score inputs.
- Large numeric inputs.
- Clear halved-hole state.
- CPI explanation only when CPI applies. Do not show CPI controls or copy during front-nine foursomes.

### Leaderboard

The leaderboard should answer three questions immediately:

- Who is winning?
- By how much?
- Where did the score come from: foursomes, singles, or both?

Use large score numerals and keep supporting stats secondary.

### History

Historical views must clearly label:

- Raw/no-handicap result.
- Legacy adjusted/old-handicap-method result.

Do not visually imply that old adjusted results were calculated with 2026 CPI rules.

## Motion

- **Approach:** Minimal-functional.
- Use motion to confirm changes, not decorate.
- Score updates can use a short highlight flash.
- Route/page transitions should be subtle.

Durations:

- Micro: 75ms
- Short: 150ms
- Medium: 250ms

Easing:

- Enter: ease-out
- Exit: ease-in
- Move/reorder: ease-in-out

Respect reduced-motion preferences.

## Accessibility

- Maintain visible focus states.
- Do not rely on color alone to distinguish teams or outcomes.
- Include text labels for USA/EUR and raw/adjusted history views.
- Ensure score inputs are reachable and usable by keyboard.
- Keep contrast high for outdoor mobile use.

## Implementation Notes

- Prefer Tailwind utility classes backed by this system.
- Add semantic Tailwind tokens before repeating raw hex values across components.
- The legacy `usa` and `europe` Tailwind palettes are kept stable for the old Firebase UI. New 2026 UI should prefer `team-usa` and `team-europe`.
- Read this file before building new UI.
- If a component needs to deviate, document the reason in the decisions log.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-02 | Created design system source of truth | Needed before building the 2026 Supabase admin and score-entry UI. |
| 2026-05-02 | Chose dark-first clubhouse scoreboard direction | The app is used live on course and needs fast score comprehension. |
| 2026-05-02 | Kept team colors semantic rather than decorative | USA/EUR colors should clarify scores, not dominate every surface. |
