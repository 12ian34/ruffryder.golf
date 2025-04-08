# ruff ryders golf app

https://ruffryder.golf

web app for live tracking and score keeping for an annual golf tournament with friends

## Screens

![IMG_6300](https://github.com/user-attachments/assets/832dc24a-2895-49d5-8527-c85095d8a03a)

![IMG_6302](https://github.com/user-attachments/assets/6ca3dee1-ae31-4570-9cec-d92c54c1de08)

![IMG_6310](https://github.com/user-attachments/assets/77deee04-0fad-492d-8d1a-245cbb72750b)

![IMG_6309](https://github.com/user-attachments/assets/28b31057-a833-40cb-b1f4-f1b5ef5c785b)

![IMG_6306](https://github.com/user-attachments/assets/ca4cb5e9-cae3-410d-a368-1262f862a2bf)

![IMG_6304](https://github.com/user-attachments/assets/e615ddd6-f3db-45b0-9a11-f35be65c694e)

## Features

- Tournaments
  - Create and manage multiple tournaments
  - Track tournament progress and completion status
  - Real-time tournament leaderboard
  - Support for multiple game formats (stroke play and match play)

- Real time scoring with handicap support
  - Real-time score tracking and updates
  - Handicap scoring support with automatic adjustments
  - Stroke index management for each hole
  - Offline mode support with data persistence
  - Projected scores and current standings
  - Hole-by-hole score entry and validation
  - Auto-scrolling score entry interface
  - Enhanced input validation and error handling

- Player management
  - Player profiles and statistics
  - Team assignments (USA vs EUROPE format)
  - Player handicap tracking
  - Historical performance data

- Game features
  - Individual game scorecards
  - Match status tracking (not started, in progress, complete)
  - Automatic point calculation for both teams
  - Real-time game status updates
  - Detailed game statistics and analytics

- UI/UX
  - Responsive design for mobile and desktop
  - Dark mode support
  - Real-time updates and notifications
  - Offline mode with sync capabilities
  - Intuitive score entry interface with auto-scroll
  - Game filtering by status
  - Enhanced security features
  - Improved input validation and error handling

- Admin
  - Tournament configuration and setup
  - Stroke index management for courses
  - User role management (admin/player)
  - Game completion validation
  - Tournament progress tracking

- Blogging
  - Tournament news and updates
  - Rich text editor support
  - Media embedding capabilities

- Technical features
  - User authentication and authorization
  - Real-time data synchronization
  - Local data persistence
  - Progressive Web App capabilities
  - Cross-platform compatibility

## Stack

- React
- TypeScript
- Vite
- Tailwind
- Firebase
- Chart.js
- TipTap

## For developers

### Prerequisites

- Node.js 16 or higher
- npm 7 or higher
- Firebase account and project

### Develop

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ruffryder.golf.git
   cd ruffryder.golf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Useful commands

- `npx vitest run` - Run tests
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project structure

```
src/
├── components/     # React components
├── contexts/      # React contexts
├── hooks/         # Custom hooks
├── pages/         # Page components
├── services/      # API and service functions
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### License

This project is licensed under the MIT License - see the LICENSE file for details.
