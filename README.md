# ruff ryders golf app

[![Netlify Status](https://api.netlify.com/api/v1/badges/82caf536-bfd4-46bb-8aed-2a67e379a2c0/deploy-status)](https://app.netlify.com/sites/ruff-ryder/deploys)

https://ruffryder.golf

web app for live tracking and score keeping for an annual golf tournament with friends
 
> check **[CLAUDE.md](./CLAUDE.md)** for detailed documentation on:
> - app logic (handicaps, scoring, points system)
> - db structure and collections
> - code architecture and key files
> - dev conventions
> 
> **Always keep it updated** when making meaningful changes to the codebase.

## screens

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/832dc24a-2895-49d5-8527-c85095d8a03a" width="150"></td>
    <td><img src="https://github.com/user-attachments/assets/6ca3dee1-ae31-4570-9cec-d92c54c1de08" width="150"></td>
    <td><img src="https://github.com/user-attachments/assets/77deee04-0fad-492d-8d1a-245cbb72750b" width="150"></td>
    <td><img src="https://github.com/user-attachments/assets/28b31057-a833-40cb-b1f4-f1b5ef5c785b" width="150"></td>
    <td><img src="https://github.com/user-attachments/assets/ca4cb5e9-cae3-410d-a368-1262f862a2bf" width="150"></td>
    <td><img src="https://github.com/user-attachments/assets/e615ddd6-f3db-45b0-9a11-f35be65c694e" width="150"></td>
  </tr>
</table>

  
## features

### tournaments
- create and manage multiple tournaments
- track tournament progress and completion status
- real-time tournament leaderboard
- support for multiple game formats (stroke play and match play)
- fourball pairing system (pair two matchups together)
- tournament completion locking (prevent changes after finalization)
- year selection when completing tournaments

### real time scoring
- real-time score tracking and updates
- handicap scoring support with automatic adjustments
- stroke index management for each hole
- offline mode support with data persistence
- projected scores and current standings
- hole-by-hole score entry and validation
- auto-scrolling score entry interface
- enhanced input validation and error handling

### player management
- player profiles and statistics
- team assignments (usa vs europe format)
- player handicap tracking (calculated from historical scores)
- historical performance data
- player yearly statistics saved on tournament completion
- score preview before saving

### game features
- individual game scorecards
- match status tracking (not started, in progress, complete)
- automatic point calculation for both teams
- real-time game status updates
- detailed game statistics and analytics

### ui/ux
- responsive design for mobile and desktop
- dark mode support
- real-time updates and notifications
- offline mode with sync capabilities
- intuitive score entry interface with auto-scroll
- game filtering by status
- enhanced security features
- improved input validation and error handling

### admin
- tournament configuration and setup
- stroke index management for courses
- user role management (admin/player)
- game completion validation
- tournament progress tracking

### technical features
- user authentication and authorization
- real-time data synchronization
- local data persistence
- progressive web app capabilities
- cross-platform compatibility

## stack
- react 18
- typescript 5
- vite 7
- tailwind css
- firebase 12 (firestore, auth, storage)
- chart.js + react-chartjs-2
- vitest (testing)
- posthog (analytics)
- netlify (deployment)

---

## contributing

### prerequisites

- **Node.js 22+** (check with `node -v`)
- **npm** (comes with Node.js)
- **Firebase CLI** (optional, for emulators): `npm install -g firebase-tools`
- **Java 11+** (required for Firebase emulators): `java -version`

### local setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/12ian34/ruffryder.golf.git
   cd ruffryder.golf
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Required variables:

   | Variable | Description |
   |----------|-------------|
   | `VITE_FIREBASE_API_KEY` | Firebase project API key |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (e.g., `project-id.firebaseapp.com`) |
   | `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
   | `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket (e.g., `project-id.appspot.com`) |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
   | `VITE_FIREBASE_APP_ID` | Firebase app ID |
   | `VITE_POSTHOG_API_KEY` | PostHog analytics key (optional for local dev) |
   | `VITE_POSTHOG_HOST` | PostHog host (default: `https://eu.i.posthog.com`) |

   Optional variables for local development:

   | Variable | Description |
   |----------|-------------|
   | `VITE_USE_FIREBASE_EMULATOR` | Set to `true` to use local Firebase emulators |
   | `VITE_POSTHOG_DEBUG` | Set to `true` for PostHog debug mode |

4. **Start the development server**

   ```bash
   npm run dev
   ```

   Open http://localhost:5173 in your browser.

### using firebase emulators (recommended for development)

Using emulators lets you develop without affecting production data.

1. **Install Firebase CLI** (if not already)

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Start the emulators**

   ```bash
   npx firebase emulators:start
   ```

   This starts:
   - Firestore: http://localhost:8080
   - Auth: http://localhost:9099
   - Storage: http://localhost:9199
   - Emulator UI: http://localhost:4000

3. **Enable emulator mode**

   Add to your `.env.local`:

   ```bash
   VITE_USE_FIREBASE_EMULATOR=true
   ```

4. **Restart the dev server** to connect to emulators

### available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Type-check + production build |
| `npm run type-check` | TypeScript validation only |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build locally |
| `npx vitest run` | Run tests once |
| `npx vitest` | Run tests in watch mode |
| `npx vitest run --coverage` | Run tests with coverage report |

### deploying firestore rules

After editing `firestore.rules`, deploy to production:

```bash
npx firebase deploy --only firestore:rules
```

To deploy indexes:

```bash
npx firebase deploy --only firestore:indexes
```

### project documentation

See **[CLAUDE.md](./CLAUDE.md)** for comprehensive documentation on:
- Scoring logic (handicaps, match play, points system)
- Database schemas and collections
- Code architecture and key files
- Security rules
- Known issues and roadmap

### code conventions

- Prefer functional and declarative patterns
- Use TypeScript `interface` for object shapes, `type` for unions
- Use `as const` objects instead of enums
- Keep components small; prefer composition
- Run tests before submitting PRs: `npx vitest run`

### testing

Tests are in `src/__tests__/` (300+ tests across 21 files).

```bash
npx vitest run              # Run all tests once
npx vitest                  # Watch mode
npx vitest run --coverage   # With coverage report
npx vitest run handicap     # Run tests matching "handicap"
```