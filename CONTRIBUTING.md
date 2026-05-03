# Contributing

This guide is for local development and project maintenance. The player-facing app guide lives in `README.md`; agent-facing rebuild context lives in `AGENTS.md`.

## Prerequisites

- Node.js 22 or newer.
- npm, included with Node.js.
- Firebase CLI, optional for legacy Firebase emulator work.
- Java 11 or newer, required only for Firebase emulators.
- Supabase CLI access if you are generating Supabase types or applying migrations.

## Local Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/12ian34/ruffryder.golf.git
   cd ruffryder.golf
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the example env file and fill in local values:

   ```bash
   cp .env.example .env.local
   ```

4. Start the local app:

   ```bash
   npm run dev
   ```

`npm run dev` starts Netlify Dev on `http://localhost:3000`, proxies the Vite app, and serves local Netlify Functions. Use `npm run dev:vite` only when you do not need functions such as AI recap generation.

## Environment Variables

Browser-safe Firebase values are still used by the legacy app:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Browser-safe Supabase values are used by the 2026 console:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Local migration and admin scripts may use server-only Supabase values. Never prefix these with `VITE_`:

```bash
SUPABASE_DB_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

AI features are called through server-side Netlify Functions. Never expose provider keys to the browser:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

Optional local development flags:

```bash
VITE_USE_FIREBASE_EMULATOR=true
VITE_POSTHOG_DEBUG=true
```

Never commit real secrets.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Netlify Dev with Vite and local functions on port 3000. |
| `npm run dev:vite` | Start Vite only on port 5173. |
| `npm run build` | Type-check and create a production build. |
| `npm run type-check` | Run TypeScript validation. |
| `npm run lint` | Run ESLint. |
| `npm run preview` | Preview the production build locally. |
| `npm run supabase:types` | Generate Supabase types without Docker. |
| `npm run export:firebase -- --out firebase-export.json` | Export legacy Firebase data for migration. |
| `npm run migrate:firebase-export -- <firebase-export.json>` | Dry-run a Firebase export migration. |
| `npx vitest run` | Run tests once. |
| `npx vitest` | Run tests in watch mode. |
| `npx vitest run --coverage` | Run tests with coverage. |

## Firebase Emulators

Use Firebase emulators only when working on the legacy Firebase app or migration source data.

1. Install and authenticate the Firebase CLI:

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. Start the emulators:

   ```bash
   npx firebase emulators:start
   ```

3. Enable emulator mode in `.env.local`:

   ```bash
   VITE_USE_FIREBASE_EMULATOR=true
   ```

Emulator ports are configured in `firebase.json`:

- Firestore: `localhost:8080`
- Auth: `localhost:9099`
- Storage: `localhost:9199`
- Emulator UI: `localhost:4000`

## Supabase

The 2026 rebuild uses Supabase Auth, Postgres, Row Level Security, and Realtime.

Generate types with:

```bash
npm run supabase:types
```

Do not use `supabase gen types --db-url`; that path requires Docker. The project script derives the project ref from `VITE_SUPABASE_URL` and uses `supabase gen types --project-id`.

Do not apply production migrations, run writes with `SUPABASE_SERVICE_ROLE_KEY`, or publish schema changes without explicit approval.

## Testing

Tests live in `src/__tests__/`.

Run focused tests first for the area you changed, then broader checks before shipping:

```bash
npx vitest run
npm run type-check
npm run lint
```

For 2026 scoring, persistence, fixture, migration, and score-entry behavior, start with:

```bash
npx vitest run src/__tests__/tournament2026Scoring.test.ts
npx vitest run src/__tests__/tournament2026Persistence.test.ts
npx vitest run src/__tests__/tournament2026Fixtures.test.ts
npx vitest run src/__tests__/tournament2026Service.test.ts
npx vitest run src/__tests__/firebaseExportMigration.test.ts
npx vitest run src/__tests__/ScoreEntrySection.test.tsx
```

## Documentation Map

- `README.md`: player-facing guide only.
- `CONTRIBUTING.md`: human developer setup and workflow.
- `AGENTS.md`: canonical agent context for architecture, product direction, conventions, and testing expectations.
- `DESIGN.md`: UI design system source of truth.
- `docs/2026-rules-spec.md`: canonical 2026 tournament rules.
- `CLAUDE.md`: legacy Firebase context. Useful for old behavior and migration reference, but not the current architecture source of truth.

## Code Conventions

- Prefer `interface` for object shapes and `type` for unions.
- Use `as const` objects instead of enums.
- Keep React components small and prefer composition.
- Keep imports at the top of files.
- Use exhaustive switch handling for TypeScript unions.
- Put pure 2026 scoring logic in `src/domain/2026/`.
- Keep 2026 React display helpers in `src/features/tournament2026/`.
- Do not expose service-role credentials or AI provider keys to browser code.

## Deployments

Netlify handles production deploys from the configured branch. Do not publish, deploy, or run production migrations without explicit approval.

If you change `firestore.rules` for legacy Firebase, production rules must be deployed separately:

```bash
npx firebase deploy --only firestore:rules
```

If you change Firestore indexes:

```bash
npx firebase deploy --only firestore:indexes
```
