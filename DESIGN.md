# Design System — Ruff Ryders Cup

## Product Context

- **What this is:** A live tournament operations and scoring app for an annual USA vs Europe golf competition.
- **Who it is for:** Players, captains, and admins using phones on the course and laptops before/after the tournament.
- **Project type:** Mobile-first web app with admin setup, live score entry, leaderboard, player history, and archive views.
- **Primary job:** Make it obvious what to enter, who is winning, and what changed, even outdoors, between shots, and under time pressure.

## Aesthetic Direction

- **Direction:** Dark terminal scoreboard.
- **Reference feel:** Closer to `../miniti/DESIGN.md`: dark-mode-only, monospaced, sharp, compact, system-console energy.
- **Decoration level:** Minimal, precise, and functional. The product should look engineered, not decorated.
- **Mood:** Slick, clean, slightly dangerous, and expensive in a quiet way. It should feel like a live scoring terminal for a private tournament, not a generic admin dashboard and not golf clip art.
- **Design principle:** The active scoring state is the hero. Every surface should answer: what hole, who is playing, what changed, what needs saving?

Avoid:

- Golf cliches like grass textures, flag icons everywhere, argyle patterns, or fake leather.
- Generic purple-gradient SaaS styling.
- Rounded bubbly SaaS panels.
- Big soft shadows.
- Dense admin screens that require careful reading on mobile.
- Mixed typography that makes the app feel like a template.

## Typography

- **Display:** `Geist Mono`, `SF Mono`, `Menlo`, fallback `monospace`.
- **Body/UI:** `Geist Mono`, `SF Mono`, `Menlo`, fallback `monospace`.
- **Data/Tables:** `Geist Mono`, `JetBrains Mono`, `SF Mono`, fallback `monospace`.
- **Loading strategy:** Use local/system monospace first. Hosted fonts are optional, not required.
- **Rule:** Use one mono family everywhere for the 2026 console. Weight, scale, color, and spacing create hierarchy.

Type scale:

- `micro`: 0.625rem / 10px, metadata and machine labels
- `xs`: 0.75rem / 12px, labels and helper text
- `sm`: 0.8125rem / 13px, compact body
- `base`: 0.9375rem / 15px, primary UI text
- `lg`: 1.125rem / 18px, section titles
- `xl`: 1.25rem / 20px, compact headers
- `2xl`: 1.5rem / 24px, page titles
- `score`: 2.75rem / 44px on mobile, 4rem / 64px on desktop

Use tabular numbers for all scores, hole numbers, stroke indices, distances, and leaderboard totals.

## Color

### Approach

Dark-only for the 2026 console. Restrained terminal palette, GitHub-ish state colors, team colors used surgically. The UI should feel calm until a score, save state, or match state needs attention.

### Core Palette

- **Black 980:** `#050506` — page background
- **Black 950:** `#09090B` — app shell
- **Panel 900:** `#0C0C0E` — primary panels
- **Panel 850:** `#0F0F11` — nested panels
- **Card 800:** `#18181B` — cards and editable rows
- **Border 700:** `#27272A` — visible structure
- **Border 600:** `#3F3F46` — hover/focus border
- **Text 50:** `#FAFAFA` — primary text
- **Text 200:** `#E6EDF3` — secondary text
- **Text 400:** `#A1A1AA` — muted metadata
- **Text 500:** `#8B949E` — machine labels
- **Terminal Green:** `#3FB950` — primary action, live/save success
- **Terminal Blue:** `#58A6FF` — information and Europe accent
- **Terminal Amber:** `#F59E0B` — warning, pending, CPI attention
- **Terminal Red:** `#F85149` — destructive/error
- **Terminal Purple:** `#A371F7` — secondary highlight, rare

### Team Colors

- **USA:** `#F2B84B`
- **Europe:** `#58A6FF`

Keep team colors for team identity, score comparison, badges, and charts. Do not use them as generic button colors.

Tailwind tokens:

- `team-usa`
- `team-europe`
- `fairway-500` should map toward terminal green in the 2026 UI.
- `pin-500` should map toward terminal amber in the 2026 UI.
- `ink-950`
- `chalk-50`

### Semantic Colors

- **Success:** `#3FB950`
- **Warning:** `#F59E0B`
- **Error:** `#F85149`
- **Info:** `#58A6FF`

### Dark Mode

Dark mode is the only 2026 console experience:

- Background: Black 980 or Black 950
- Panel: Panel 900
- Nested panel: Panel 850
- Editable row: Card 800
- Border: Border 700
- Focus: Terminal Green or Terminal Blue
- Primary text: Text 50
- Secondary text: Text 200
- Metadata: Text 400/500

### Light Mode

Do not build light mode for the 2026 console unless explicitly requested. The legacy Firebase UI can keep its existing light/dark behavior.

## Spacing

- **Base unit:** 4px.
- **Density:** Compact terminal by default, with large enough touch targets for score entry.

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
- Score entry rows should be compact but scannable.
- Data tables can be tighter, but row hit areas must remain touchable on mobile.
- Prefer `8px`, `12px`, and `16px` gaps over broad `24px+` spacing inside data-heavy panels.

## Layout

- **Approach:** Grid-disciplined terminal.
- **App screens:** Dense, aligned, predictable, and stable.
- **Leaderboard moments:** Large score treatments, but still inside terminal-like structure.
- **Max content width:** `1180px` for desktop admin/dashboard pages.
- **Mobile:** Single-column first, flat, and full-width. Important actions stay near the thumb zone.
- **Breakpoints:** Follow Tailwind defaults unless a screen proves otherwise.

Radius:

- `xs`: 2px for tiny status markers.
- `sm`: 4px for badges and dense score cells.
- `md`: 6px for buttons and form controls.
- `lg`: 8px for cards.
- `xl`: 12px for major panels/modals.
- `full`: pills, avatars, status dots.

Borders define the interface. Prefer full-width horizontal dividers and section rules over nested cards. Avoid layer-over-layer card hierarchy in the 2026 console. Cards only earn their existence when the card itself is the interaction.

## Components

### Buttons

- **Primary:** Terminal Green background, Black text.
- **Secondary:** Card surface, Text 50, Border 700.
- **Ghost:** transparent/Black 950 with muted text.
- **Team actions:** use team colors only when the action belongs clearly to a team.
- **Danger:** Terminal Red text or fill, used sparingly.

Button labels should be action-specific: `Save scores`, `Create fixture`, `Complete tournament`.

Primary buttons should be rectangular with `6px-8px` radius. No pill CTAs for the main console.

### Cards

Cards should group one decision or one score unit. Avoid giant multi-purpose panels.

Use:

- Terminal-style header with title and compact metadata.
- Body with one primary task.
- Footer only when actions need separation.
- Thin borders, dark nested surfaces, no heavy shadow.

### Score Entry

Score entry screens must optimize for speed:

- Hole number and segment context always visible.
- Current match status visible near score inputs.
- Large mobile score pickers. Avoid keyboard-first numeric entry during tournament play.
- Score pickers should support thumb-friendly `-` / `+`, quick nearby score chips, and a native/select fallback for accessibility.
- Clear halved-hole state.
- CPI explanation only when CPI applies. Do not show CPI controls or copy during front-nine foursomes.
- Stroke index is fixed course data, not editable.
- Hole distance should be visible near the hole label when data is available.
- Score entry should be autosave-first with visible sync states: dirty, saving, saved, error.
- Manual retry/save controls are fallback actions, not the primary path.
- A `Save all` action can appear when multiple rows have unsaved changes or failed saves need a bulk retry.
- Dirty rows should be visually obvious with a subtle amber border or marker; failed rows should use red.
- Saved rows should show a compact result chip, not verbose explanatory text.
- Rows should feel like terminal records: `H10`, distance, SI, USA score, Europe score, result, save state.
- Score entry should use the full mobile width. Avoid nested fixture → segment → row boxes that waste horizontal space.

### Hole Metadata

Hole metadata should include:

- Hole number.
- Par, when available.
- Distance, when available.
- Stroke index.

Display metadata in a compact row near the score inputs. Do not make users edit metadata during live scoring.

### Leaderboard

The leaderboard should answer three questions immediately:

- Who is winning?
- By how much?
- Where did the score come from: foursomes, singles, or both?

Use large score numerals and keep supporting stats secondary.

Leaderboard surfaces should feel more like a live terminal readout than a card dashboard:

- Compact labels.
- Big tabular score numbers.
- Clear USA/EUR color accents.
- Minimal decoration.
- Obvious live/update state.

### History

Historical views must clearly label:

- Raw/no-handicap result.
- Legacy adjusted/old-handicap-method result.

Do not visually imply that old adjusted results were calculated with 2026 CPI rules.

## Motion

- **Approach:** Minimal-functional.
- Use motion to confirm changes, not decorate.
- Score updates can use a short highlight flash.
- Save success can use a brief green row pulse.
- Dirty state can use subtle amber border/left marker.
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
- Score pickers and retry/save actions must be reachable by keyboard and should not trap focus.

## Implementation Notes

- Prefer Tailwind utility classes backed by this system.
- Add semantic Tailwind tokens before repeating raw hex values across components.
- The legacy `usa` and `europe` Tailwind palettes are kept stable for the old Firebase UI. New 2026 UI should prefer `team-usa` and `team-europe`.
- New 2026 UI should bias toward mono typography, dark terminal surfaces, tighter radius, and visible borders.
- Read this file before building new UI.
- If a component needs to deviate, document the reason in the decisions log.

## Decisions Log

| Date | Decision | Rationale |
| ---- | -------- | --------- |
| 2026-05-02 | Created design system source of truth | Needed before building the 2026 Supabase admin and score-entry UI. |
| 2026-05-02 | Chose dark-first clubhouse scoreboard direction | The app is used live on course and needs fast score comprehension. |
| 2026-05-02 | Kept team colors semantic rather than decorative | USA/EUR colors should clarify scores, not dominate every surface. |
| 2026-05-02 | Shifted 2026 console toward dark terminal scoreboard | The first deployed console looked too generic and soft. The scoring flow needs sharper, cleaner, sexier terminal energy closer to `miniti`. |
