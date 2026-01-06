# ruff ryders golf app

[![Netlify Status](https://api.netlify.com/api/v1/badges/82caf536-bfd4-46bb-8aed-2a67e379a2c0/deploy-status)](https://app.netlify.com/sites/ruff-ryder/deploys)

https://ruffryder.golf

web app for live tracking and score keeping for an annual golf tournament with friends

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

### blogging
- tournament news and updates
- rich text editor support
- media embedding capabilities

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
- tiptap (rich text editor)
- vitest (testing)
- posthog (analytics)
- netlify (deployment)