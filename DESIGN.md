# Design System — Ruff Ryders Cup

## Product Context

- **What this is:** A live tournament operations and scoring app for an annual USA vs Europe golf competition.
- **Who it is for:** Players, captains, and admins using phones on the course and laptops before/after the tournament.
- **Project type:** Mobile-first web app with admin setup, live score entry, leaderboard, player history, and archive views.
- **Primary job:** Make it obvious what to enter, who is winning, and what changed, even outdoors, between shots, and under time pressure.

## Aesthetic Direction

- **Direction:** Dark terminal scoreboard.
- **Reference feel:** Closer to `../miniti/DESIGN.md`: dark-mode-only, monospaced, sharp, compact, live scoring energy.
- **Decoration level:** Minimal, precise, and functional. The product should look engineered, not decorated.
- **Mood:** Slick, clean, slightly dangerous, and expensive in a quiet way. It should feel like a private live scoring system, not a generic admin dashboard and not golf clip art.
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
- **Rule:** Use one mono family everywhere for the 2026 app. Weight, scale, color, spacing, and machine-label tracking create hierarchy.
- **Casing:** Do not force all-caps typography anywhere in the app. Use natural casing in source copy and avoid Tailwind `uppercase` or equivalent text transforms. The current 2026 auth hero and bottom nav intentionally use lower-case display treatment; keep that treatment local to those brand/navigation surfaces.

Type scale:

- `micro`: 0.625rem / 10px, metadata and machine labels
- `xs`: 0.75rem / 12px, labels and helper text
- `sm`: 0.8125rem / 13px, compact body
- `base`: 0.9375rem / 15px, primary UI text
- `lg`: 1.125rem / 18px, fixture and card titles
- `xl`: 1.25rem / 20px, section titles
- `2xl`: 1.5rem / 24px, page titles
- `score`: 2rem / 32px on mobile, 2.5rem / 40px on desktop

Use tabular numbers for all scores, hole numbers, stroke indices, distances, and leaderboard totals.

## Color

### Approach

Dark-only for the 2026 app. Restrained terminal palette, GitHub-ish state colors, team colors used surgically. The UI should feel calm until a score, save state, or match state needs attention.

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

Dark mode is the only 2026 app experience:

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

Do not build light mode for the 2026 app unless explicitly requested. The legacy Firebase UI can keep its existing light/dark behavior.

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
- Default 2026 page panels should use compact padding (`12px` mobile, `16px` desktop). Avoid `text-4xl` and large card padding except for one-off hero score moments that truly need it.

## Layout

- **Approach:** Grid-disciplined terminal.
- **App screens:** Dense, aligned, predictable, and stable.
- **Leaderboard moments:** Large score treatments, but still inside terminal-like structure.
- **Max content width:** The authenticated 2026 shell can use `max-w-screen-2xl` for wide tournament/admin surfaces. Keep individual cards and forms narrower when the task is simple.
- **Mobile:** Single-column first, flat, and full-width. Important actions stay near the thumb zone.
- **Navigation:** Authenticated 2026 screens should not use a persistent top nav/header. Primary app navigation lives in a fixed bottom rail with horizontal scrolling, including on wider screens when the 2026 app is active. Hide native scrollbars. The rail should read as a single transparent glass sheet: heavy backdrop blur/saturation, light top border/sheen, low dark shadow, no boxed tab tiles, no gradient overlays, no chevrons, and no decorative top dot. Active state is a thin terminal-green underline/glow. Render labels lower-case in the rail while keeping source nav labels task-based: `My Game`, `Tournament`, `Archive`, `Profile`; admins additionally see `Admin`.
- **Information architecture:** Keep active scoring separate from archive browsing. `My Game` is for score entry, `Tournament` is for the live tournament board, `Archive` combines historical tournament and player-history views, `Profile` owns account actions, and `Admin` is hidden from non-admins.
- **Profile vs Admin:** `Profile` is self-service only: own display name/avatar, linked player summary, and sign-out. Editing other users, admin roles, and profile-player links belongs in `Admin` → `Players`.
- **Horizontal overflow:** App pages should not horizontally scroll. The only intentional horizontal scrolling surfaces are the bottom nav and explicitly contained tables/lists with local `overflow-x-auto`.
- **Auth screen:** The unauthenticated app entry screen should be flat, minimal, and brand-led. Do not wrap it in the shared app shell or show a top header. Use `the al reynolds` as the small line and `ruff ryders cup 2026` as the main title. Keep copy brief: email field, send-link action, concise validation/status/error messages, and the minimal source/donation footer only. Email placeholders can use one lore reference, but should still look like plausible email addresses. Avoid visible backend/vendor language in normal player-facing auth copy.
- **Breakpoints:** Follow Tailwind defaults unless a screen proves otherwise.

Radius:

- `xs`: 2px for tiny status markers.
- `sm`: 4px for badges and dense score cells.
- `md`: 6px for buttons and form controls.
- `lg`: 8px for cards.
- `xl`: 12px for major panels/modals.
- `full`: pills, avatars, status dots.

Borders define the interface. Prefer full-width horizontal dividers and section rules over nested cards. Avoid layer-over-layer card hierarchy in the 2026 app. Cards only earn their existence when the card itself is the interaction.

## Components

### Buttons

- **Primary:** Terminal Green background, Black text.
- **Secondary:** Card surface, Text 50, Border 700.
- **Ghost:** transparent/Black 950 with muted text.
- **Team actions:** use team colors only when the action belongs clearly to a team.
- **Danger:** Terminal Red text or fill, used sparingly.

Button labels should be action-specific: `Save scores`, `Create fixture`, `Complete tournament`.

Primary buttons should be rectangular with `6px-8px` radius. No pill CTAs for the main 2026 app.

### Forms

Form inputs should use the 2026 terminal palette by default: `#050506` background, `#27272A` border, `#E6EDF3` text, and terminal-green focus border with no browser-default focus ring. Profile and player-overview forms should avoid nested card chrome when they are already inside a page-level section.

### Cards

Cards should group one decision or one score unit. Avoid giant multi-purpose panels.

Use:

- Terminal-style header with title and compact metadata.
- Body with one primary task.
- Footer only when actions need separation.
- Thin borders, dark nested surfaces, no heavy shadow.

### Admin Setup

Admin is a phone-first operations console, not a desktop control room:

- Organize admin work as collapsible task sections in this order: Tournament, Players, Fixtures, Course, Activity, Corrections.
- Each section should explain the job in one sentence and hide details until needed.
- The Admin route should be flat by default: one compact page header, then full-width divider rows. Do not wrap the whole admin console in the shared `Panel` shell or default-open task cards.
- Keep the normal workflow top-to-bottom. Put dangerous repair work in `Corrections`, not beside everyday setup.
- Course metadata, profile linking, access control, tournament activation, and player-history edits belong in `Admin`, not user `Profile`.
- Admin `Activity` is an internal setup/audit trail. Keep it visually similar to the public activity feed, but label it as admin activity rather than exposing database or migration language.
- Destructive admin actions need confirmation and should stay visually sparse. Outline danger/warning buttons are acceptable in dense admin correction rows to avoid accidental taps; use filled primary buttons for simple standalone form submits.
- Never require admins to inspect or edit raw database records from the UI.

### Empty States

Empty states should be compact and singular:

- Use one `StatusCard` or one short status row, not a grid of placeholder cards.
- Do not render repeated "waiting" cards for content that does not exist yet.
- Tell the user what will make the surface wake up, using product language: saved holes, imported history, linked profiles, or setup changes.
- Keep empty-state copy short. It should reassure, not explain the database.

### Score Entry

Score entry screens must optimize for speed:

- Hole number and segment context always visible.
- Current match status visible near score inputs.
- Fixtures should behave like compact work cards: show participants, progress, and an open/closed state so admins are not forced through every fixture at once.
- Fixtures with front-nine and back-nine work should expose a simple `Front 9` / `Back 9` switch instead of stacking every segment vertically.
- When two back-nine singles matches are being scored in the same fixture, group entry by hole number and show both singles score pickers under that hole. The scorer's task is "score H10 for the group", not "finish one player's entire match before the other".
- Large mobile score pickers. Avoid keyboard-first numeric entry during tournament play.
- Score pickers should support thumb-friendly `-` / `+`, quick nearby score chips, and a native/select fallback for accessibility.
- Clear halved-hole state.
- CPI explanation only when CPI applies. Do not show CPI controls or copy during front-nine foursomes.
- Stroke index is fixed course data, not editable.
- Hole distance should be visible near the hole label when data is available.
- Score entry should be autosave-first with visible row sync states: dirty, saving, saved, error.
- A global sync banner should make connection/save risk obvious, including unsaved rows, failed saves, offline state, and retry-all recovery.
- Manual retry/save controls are fallback actions, not the primary path; Supabase scores are only saved after server acknowledgment.
- A `Save all` action can appear when multiple rows have unsaved changes, and a `Retry all` action can appear when failed saves need bulk recovery.
- Dirty rows should be visually obvious with a subtle amber border or marker; failed rows should use red.
- Saved rows should collapse to a compact result summary with an explicit `Edit` action. Re-open full score pickers only when the scorer is changing that saved hole.
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
- The `Tournament` tab should share the Archive view's flat row language: full-width ledgers, thin dividers, expandable rows where useful, and no tile/card dashboard treatment for score summaries or feeds.
- The `Tournament` tab should be composed as a full-bleed scoreboard surface inside the app shell, not as a rounded panel that contains more bordered panels. Use section headers, score ledgers, and horizontal rules to create hierarchy.
- Use collapsible disclosure sections for secondary Tournament surfaces so mobile users can keep the live board focused. Keep the top match state visible even when lower sections are collapsed.

### Live Score Charts

The live score curve should preserve the useful behavior from the legacy tournament progress chart while matching the 2026 terminal style:

- Plot two team lines, one for USA and one for Europe.
- Derive points from saved 2026 hole-score update order, not from legacy tournament progress snapshots.
- Keep the y-axis zero-based with integer tick steps.
- Keep x-axis labels sparse. On mobile, show fewer visible ticks than desktop.
- Show the date on an x-axis tick only when that visible tick crosses into a new day; otherwise show time only.
- Tooltips should show the full timestamp plus cumulative team totals, holes scored, and halved holes when relevant.
- Use the standard team colors: USA `#F2B84B`, Europe `#58A6FF`.
- The chart may use a subtle team-color wash, but it should still feel like an instrument panel, not a marketing graphic.

### Highlights, Newsroom, And Activity

Keep the three score-story surfaces distinct:

- **Highlights Reel:** A curated, derived summary for quick scanning. It does not need every event.
- **Newsroom:** Persisted commentary cards generated from the live board. Show only real generated cards. If none exist, show one compact status state. Do not put `AI` in player-facing Tournament section titles.
- **Tournament Activity:** The complete user-facing event feed. It should include timestamps and cover score saves, corrections, clears, setup changes, finalization, and inferred match starts/finishes.

Avoid backend/vendor labels in these player-facing areas. Prefer `Live scoring`, `Full event feed`, `saved holes`, `scoreboard`, and `booth` language over storage/provider names.

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
- Existing 2026 components currently use many literal hex utility classes. When touching a component, align obvious drift with the semantic palette, but do not create noisy churn solely to convert stable raw hex classes.
- New 2026 UI should bias toward mono typography, dark terminal surfaces, tighter radius, visible borders, and natural casing.
- Read this file before building new UI.
- If a component needs to deviate, document the reason in the decisions log.

## Decisions Log

| Date | Decision | Rationale |
| ---- | -------- | --------- |
| 2026-05-02 | Created design system source of truth | Needed before building the 2026 Supabase admin and score-entry UI. |
| 2026-05-02 | Chose dark-first clubhouse scoreboard direction | The app is used live on course and needs fast score comprehension. |
| 2026-05-02 | Kept team colors semantic rather than decorative | USA/EUR colors should clarify scores, not dominate every surface. |
| 2026-05-02 | Shifted 2026 app toward dark terminal scoreboard | The first deployed app looked too generic and soft. The scoring flow needs sharper, cleaner, sexier terminal energy closer to `miniti`. |
| 2026-05-03 | Flattened auth and removed forced all-caps | Login should be minimal and brand-led, with natural casing and no shared top header. |
| 2026-05-03 | Made bottom navigation a transparent glass rail | The boxed tab treatment felt dated. The rail should be glassy, lower-case, and active via a thin underline, not tiles or dots. |
| 2026-05-03 | Preserved legacy chart semantics in the 2026 live score curve | The old chart had useful x-axis/date behavior; the 2026 version keeps those rules while using the new scoreboard style. |
| 2026-05-03 | Standardized compact empty states | Repeated placeholder grids create noise. Empty surfaces should be one concise status until real content exists. |
| 2026-05-03 | Matched Scores to Archive row language | Live scoring should feel like a premium terminal ledger, not a grid of dashboard tiles. |
| 2026-05-04 | Made Scores a full-bleed terminal board | The live leaderboard should not feel like a container nested inside another container; hierarchy comes from score scale, section rules, and ledgers. |
| 2026-05-04 | Flattened Admin into divider-led operations rows | Admin setup should feel like a modern command surface, not a panel wrapped around nested panels. |
| 2026-05-04 | Added collapsible Tournament sections | Mobile users need to collapse chart, highlights, tournament overview, score movement, newsroom, fixture, and activity detail while keeping the live match state visible. |
| 2026-05-04 | Standardized 2026 form input chrome | Profile and overview forms should use the terminal input palette and avoid extra nested card treatment inside page-level sections. |
