# Admin Panel - Average Handicap Display

## Background and Motivation
The user wants to enhance the admin panel's matchup display by showing the average handicap for currently selected players in Team USA and Team Europe. This provides a quick overview of the teams' relative strengths based on handicap, visible directly in the context of the current matchups.

## Key Challenges and Analysis
1.  **Data Source Identification:** Pinpoint where player data (including handicaps and team assignments like USA/Europe) is stored and how it's accessed. This will likely involve interacting with Supabase.
2.  **Selected Player Identification:** Understand how the "current selected peoples in the matchups" are identified and managed within the admin panel's state or data flow.
3.  **Calculation Logic:** Develop the logic to:
    *   Filter the selected players for Team USA.
    *   Filter the selected players for Team Europe.
    *   Calculate the average handicap for each team (sum of handicaps / number of players). This must gracefully handle cases where no players are selected for a team (to avoid division by zero) or if handicap data is missing for a player.
4.  **UI Integration:** Integrate the calculated average handicaps into the admin panel UI, ensuring it's displayed prominently at the top of the matchups section.
5.  **Dynamic Updates:** Ensure the average handicaps refresh automatically if the selection of players in the matchups changes.

## High-level Task Breakdown

1.  **Task 1: Investigate Data Sources and Selection State.**
    *   **Action:** Examine the admin panel codebase to identify:
        *   How player data (name, handicap, team affiliation) is fetched and structured.
        *   How the list of players currently part of matchups is stored and accessed.
    *   **Success Criteria:** Clearly documented file paths, data structures, and functions/components related to player data and matchup selections.
    *   **Files to inspect:** Likely components under an `admin/` directory, particularly those dealing with `matchups`, `players`, or `dashboard` functionality. Also, check for services or Supabase query functions.

2.  **Task 2: Develop Handicap Calculation Function.**
    *   **Action:** Create a pure TypeScript function that takes a list of selected players (each with their handicap and team) as input. This function will return an object containing the average handicap for Team USA and Team Europe.
    *   **Success Criteria:** The function correctly computes average handicaps. It handles scenarios like:
        *   No players selected for one or both teams (average should be 0 or clearly indicate no players).
        *   Players without valid handicap values (e.g., null, undefined - decide on handling: ignore player or treat handicap as 0).
    *   **TDD:** Write unit tests for this calculation function, covering various scenarios.

3.  **Task 3: Integrate Calculation into Admin Component.**
    *   **Action:** In the primary admin panel component responsible for displaying matchups:
        *   Access the list of currently selected players in those matchups.
        *   Use the function from Task 2 to calculate the average handicaps.
    *   **Success Criteria:** The component successfully computes the average handicaps based on the active matchup selections. The values are available as state or props for rendering.

4.  **Task 4: Implement UI for Average Handicaps.**
    *   **Action:** Modify the React component (likely a server component, or a client component if interactivity requires it) to display the calculated average handicaps for Team USA and Team Europe. This display should be positioned at the top of the current matchups section.
    *   **Success Criteria:** Average handicaps are clearly visible in the UI. The display is styled consistently with the existing admin panel (using Tailwind/Shadcn UI). If player selections change, the displayed averages update.

5.  **Task 5: End-to-End Testing and Refinement.**
    *   **Action:** Thoroughly test the feature within the admin panel by:
        *   Selecting various combinations of players for matchups.
        *   Ensuring no players are selected.
        *   Selecting players for only one team.
        *   Verifying calculations are accurate and the UI updates correctly.
    *   **Success Criteria:** The feature is robust, accurate, and provides a good user experience. All identified edge cases are handled gracefully.

## Project Status Board

*   [x] Task 1: Investigate Data Sources and Selection State.
*   [x] Task 2: Develop Handicap Calculation Function.
*   [x] Task 3: Integrate Calculation into Admin Component.
*   [x] Task 4: Implement UI for Average Handicaps.
*   [x] Task 5: End-to-End Testing and Refinement.

## Executor's Feedback or Assistance Requests
*   Task 1 (Investigate Data Sources and Selection State) is complete.
    *   **Player Data:** `Player` type from `src/types/player.ts` includes `team: 'USA' | 'EUROPE'` and `averageScore: number` (to be used as handicap). Data is fetched from Firestore.
    *   **Selected Players:** `TournamentManagement.tsx` manages lists of `Matchup[]` and `Game[]` (from `src/types/tournament.ts` and `src/types/game.ts`) which define the players in current matchups. These are passed to `MatchupList.tsx`.
    *   **Key Files:** `src/components/AdminPanel.tsx` -> `src/components/TournamentManagement.tsx` -> `src/components/tournament/MatchupList.tsx`.
*   Task 2 (Develop Handicap Calculation Function) is complete.
    *   `calculateAverageTeamHandicaps` function added to `src/utils/handicapScoring.ts`.
    *   Unit tests added to `src/__tests__/handicapScoring.test.ts`.
*   Task 3 (Integrate Calculation into Admin Component) is complete.
    *   Calculation logic added to `TournamentManagement.tsx` using `useEffect`.
    *   Average handicaps (`teamAverageHandicaps`) are passed as a prop to `MatchupList.tsx`.
    *   `MatchupListProps` updated to accept the new prop.
*   Task 4 (Implement UI for Average Handicaps) is complete.
    *   UI added to `MatchupList.tsx` to display the average handicaps for Team USA and Team Europe inside the "Current Matchups" card.
    *   User confirmed UI placement and labels are correct.
*   Task 5 (End-to-End Testing and Refinement) is complete.
    *   User confirmed through manual testing that the feature is working as expected across various scenarios.

**Project Complete: Average handicap display feature implemented and verified.**

## Lessons
*   Project uses Vite/React with TypeScript (not Next.js App Router as initially assumed from general preferences).
*   Source code is primarily in `src/`.
*   Player data includes explicit `team` and `averageScore` (for handicap) in `src/types/player.ts`.
*   Matchups are managed within `TournamentManagement.tsx` and displayed by `MatchupList.tsx`.
*   UI elements should be carefully placed according to user specifications (initial placement of average handicap display was outside the target card, then corrected).
