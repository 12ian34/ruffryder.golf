# ruff ryders golf app

web app for live tracking and score keeping for an annual golf tournament with friends

https://ruffryder.golf

## Features

- Tournament Management
  - Create and manage multiple tournaments
  - Track tournament progress and completion status
  - Real-time tournament leaderboard
  - Support for multiple game formats (stroke play and match play)

- Advanced Scoring System
  - Real-time score tracking and updates
  - Handicap scoring support with automatic adjustments
  - Stroke index management for each hole
  - Offline mode support with data persistence
  - Projected scores and current standings
  - Hole-by-hole score entry and validation

- Player Management
  - Player profiles and statistics
  - Team assignments (USA vs EUROPE format)
  - Player handicap tracking
  - Historical performance data

- Game Features
  - Individual game scorecards
  - Match status tracking (not started, in progress, complete)
  - Automatic point calculation for both teams
  - Real-time game status updates
  - Detailed game statistics and analytics

- User Experience
  - Responsive design for mobile and desktop
  - Dark mode support
  - Real-time updates and notifications
  - Offline mode with sync capabilities
  - Intuitive score entry interface
  - Game filtering by status

- Administrative Features
  - Tournament configuration and setup
  - Stroke index management for courses
  - User role management (admin/player)
  - Game completion validation
  - Tournament progress tracking

- Blog System
  - Tournament news and updates
  - Rich text editor support
  - Media embedding capabilities

- Technical Features
  - User authentication and authorization
  - Real-time data synchronization
  - Local data persistence
  - Progressive Web App capabilities
  - Cross-platform compatibility

## Tech stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Firebase
- Chart.js
- TipTap Editor

## Prerequisites

- Node.js 16 or higher
- npm 7 or higher
- Firebase account and project

## Getting Started

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

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

![CleanShot 2024-11-29 at 15 06 54](https://github.com/user-attachments/assets/0378c7b7-88d7-49e4-b5dd-3559f2f96a22)

![CleanShot 2024-11-29 at 15 07 32](https://github.com/user-attachments/assets/51382b21-b681-4d50-9505-0c4e892007e4)
