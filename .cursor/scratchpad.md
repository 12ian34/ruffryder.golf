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

# Admin Panel - Manual Average Score (Handicap) Update

## Background and Motivation
The user, an admin, needs the ability to manually set or update an "average score" for players, which serves as their handicap. This is crucial for new players who lack a scoring history to automatically calculate this value. Additionally, a mechanism is needed to handle or prevent updates to a player's average score if they are currently participating in an active tournament to avoid potential data inconsistencies or destructive changes.

## Key Challenges and Analysis
1.  **Data Model for Manual Score:**
    *   Determine if a new field is needed (e.g., `manualAverageScore` or `overrideHandicap`) or if the existing `averageScore` field should be made directly editable by admins.
    *   Consider the implications of overwriting an automatically calculated `averageScore`. Should there be a flag to indicate if the score is manually set or calculated?
2.  **UI for Manual Update:**
    *   Design a user interface within the "Players" tab of the admin section for admins to input/edit this average score. This likely involves adding an input field next to each player or in a player edit form.
    *   Ensure clear indication of which player's score is being modified.
3.  **"Active Tournament" Check:**
    *   Define what constitutes an "active tournament".
    *   Determine how to check if a player is part of an active tournament. This requires understanding how tournaments and player selections are stored and managed.
    *   Decide on the behavior if a player is in an active tournament:
        *   **Option A (Prevent Update):** Block the update and inform the admin.
        *   **Option B (Allow Update with Caution):** Allow the update but warn the admin about potential consequences. Clarify if the updated score should reflect immediately in the ongoing tournament or only for future games/tournaments. This is the core of the "if it wont be destructive?" question. If allowed, how do we ensure it's not destructive? Perhaps the score used for an *in-progress* game is snapshotted at the game's start?
4.  **Backend Logic:**
    *   Implement the backend functionality (e.g., Supabase function or direct table update) to save the manually set average score.
    *   Implement the "active tournament" check logic on the backend or frontend before allowing the update.
5.  **Security and Permissions:** Ensure only authorized admins can perform this update. (This is likely already handled by the existing admin section's auth).
6.  **Impact on Existing Handicap Calculation:** If an `averageScore` is manually set, how does this interact with any existing logic that automatically calculates it from historical scores? Does the manual score override the automatic one permanently, or until it's explicitly cleared?

## High-level Task Breakdown

1.  **Task 1: Decision on "Active Tournament" Update Strategy & Data Model.**
    *   **Action:** ~~Discuss with the user (or make a recommendation based on best practices) whether to prevent updates for players in active tournaments or allow them (and if allowed, how to manage the impact). Decide on the data model for the manual average score (new field vs. direct edit, and override logic).~~
        *   **Decision (User Input):**
            *   **Active Tournament Updates:** Allowed. The updated `averageScore` will NOT affect ongoing games/tournaments for that player; it will apply to future events. A warning should be displayed to the admin.
            *   **Data Model:** Directly overwrite the existing `averageScore` field.
            *   **Reverting to Auto-Calc:** User is undecided. Decision pending investigation in Task 2 to determine if/how `averageScore` is auto-calculated.
    *   **Success Criteria:** ~~A clear decision is documented on the update strategy and the data model chosen. This decision will guide subsequent implementation.~~ Decisions are documented. The path for the "revert to auto-calc" question is clarified (investigate in Task 2).
    *   **Executor's Question:** ~~What is the preferred approach for handling updates when a player is in an active tournament? (Prevent, or Allow with specific rules?) How should the manual score interact with any auto-calculated score (e.g., does it override, is it a separate field)?~~ Questions resolved or deferred with a plan.

2.  **Task 2: Investigate Player and Tournament Data Structures.**
    *   **Action:** Examine the codebase to understand:
        *   How player data (especially `averageScore` or equivalent handicap field) is structured and stored (e.g., `src/types/player.ts`, Supabase schema).
        *   How active tournaments and player participation in them are represented (e.g., `src/types/tournament.ts`, `src/types/game.ts`, Supabase tables).
    *   **Success Criteria:** Documented understanding of relevant data structures and how to query/check for a player's involvement in an active tournament.
    *   **Summary of Findings:**
        *   **Player Data (`Player` type in `src/types/player.ts`):
            *   `averageScore: number` exists.
            *   It's initialized to `0` for new players in `src/hooks/usePlayerData.ts` (`handleSavePlayer` function).
            *   It can be updated by passing an `averageScore` in the `updates` object to `handleSavePlayer`.
            *   **Auto-calculation:** `src/components/player/PlayerEditModal.tsx` recalculates `averageScore` based on the average of the last (up to) 3 `historicalScores` *if a historical score is added or updated via this modal*. It then calls `onSave` (which is `handleSavePlayer`) with this new `averageScore`.
            *   If `averageScore` is updated directly (our new feature's goal) and no subsequent historical score changes are made via the modal, the direct manual update will persist. If a historical score *is* later changed via the modal, the modal's calculation will take precedence.
        *   **Tournament Data (`Tournament`, `Matchup` types in `src/types/tournament.ts`):
            *   `Tournament` has an `isActive: boolean` field.
            *   `Matchup` (within a `Tournament`) contains `usaPlayerId` and `europePlayerId`.
            *   A player is in an "active tournament" if their ID is in a `Matchup` within a `Tournament` where `isActive: true`.
            *   The `Matchup` does not store a snapshot of the player's `averageScore` at the time of matchup creation.
        *   **Regarding "Reverting to Auto-Calc" (from Task 1):** Given the modal's behavior, an explicit "revert" button for a manually set `averageScore` seems less critical. If an admin wants the score to be driven by `historicalScores`, they can add/update a historical score via the `PlayerEditModal`, which will trigger the recalculation. We will proceed without a dedicated "revert to auto" button for the direct manual `averageScore` input for now.

3.  **Task 3: Design and Implement UI for Manual Score Input.** (Revised: UI in Modal)
    *   **Action:**
        *   ~~In the admin "Players" tab/section, add an input field (e.g., `Input` from Shadcn UI) for each player to display and allow editing of their average score.~~
        *   In `PlayerEditModal.tsx`, add a new input field for "Direct Average Score (Handicap)".
        *   ~~Add a "Save" or "Update" button for each player or a global save for the list.~~ (Modal has existing save button).
    *   **Success Criteria:** Admins can see and input a manual `averageScore` directly within the `PlayerEditModal`. The UI is clear and intuitive.
    *   **TDD (Optional but Recommended):** If complex client-side logic is involved, consider component tests for the modal.

4.  **Task 4: Implement Frontend Logic for Update and "Active Tournament" Check.** (Revised: Logic in Modal)
    *   **Action:**
        *   In `PlayerEditModal.tsx`'s `handleSubmit` function:
            *   Prioritize the value from the "Direct Average Score" input if provided and valid.
            *   If direct input is not used, but a `historicalScore` is added/updated, use the existing logic to calculate `averageScore` from the last 3 years of historical scores.
            *   If neither is done, maintain the existing `averageScore` (or default to 0 for new players if no score is specified).
            *   If the determined `averageScore` is different from the player's original score, perform a check (using `useAllActiveTournaments` hook) to see if the player is in an active tournament.
            *   If so, show a confirmation dialog warning the admin that changes apply to future events. Handle cancellation.
        *   The existing `onSave` prop (connected to `handleSavePlayer`) will be used to persist changes.
    *   **Success Criteria:** The `PlayerEditModal` correctly determines the `averageScore` to save based on the new priority. The active tournament check and confirmation dialog work as expected. Player data is updated correctly.

5.  **Task 5: Implement Backend Logic for Score Update and "Active Tournament" Check.** (No significant change from previous interpretation)
    *   **Action:**
        *   Confirm Firestore security rules for the `players` collection allow authenticated admin users to update the `averageScore` field (likely already in place).
        *   The active tournament check is handled client-side within the modal before the Firestore `updateDoc` call is made (via `handleSavePlayer`). No new specific backend endpoint is created for this check.
    *   **Success Criteria:** Player's average score is correctly updated in Firestore. Data integrity is maintained via client-side logic and Firestore rules.

6.  **Task 6: End-to-End Testing and Refinement.**
    *   **Action:** Thoroughly test the entire feature:
        *   Adding/updating scores for new players.
        *   Updating scores for existing players.
        *   Testing the "active tournament" scenario (both preventing and allowing updates, depending on the chosen strategy).
        *   Ensuring the updated score is reflected correctly elsewhere in the application if necessary (e.g., in tournament views, if the update is meant to be immediate).
    *   **Success Criteria:** The feature works reliably, is secure, and meets all specified requirements. Admins can confidently manage player handicaps.

## Project Status Board (Manual Average Score Update)

*   [x] Task 1: Decision on "Active Tournament" Update Strategy & Data Model.
*   [x] Task 2: Investigate Player and Tournament Data Structures.
*   [x] Task 3: Design and Implement UI for Manual Score Input. (UI moved to modal, implementation complete)
*   [x] Task 4: Implement Frontend Logic for Update and "Active Tournament" Check. (Logic moved to modal, implementation complete)
*   [x] Task 5: Implement Backend Logic for Score Update and "Active Tournament" Check. (Confirmed no new backend code, relies on Firestore rules)
*   [x] Task 6: End-to-End Testing and Refinement. (Testing successful with modal approach)

## Executor's Feedback or Assistance Requests (Manual Average Score Update)
*   **Initial Question for User (related to Task 1):**
    1.  ~~When an admin tries to update the average score for a player who is currently in an "active tournament":~~
        *   ~~Should the update be **prevented** entirely?~~
        *   ~~Or, should the update be **allowed**? If allowed:~~
            *   ~~Should the change affect the player's score in the *currently running* games of that tournament? Or only apply to *future* games/tournaments?~~
            *   ~~Is a warning message to the admin sufficient?~~
    2.  ~~Regarding the data model for the manual average score:~~
        *   ~~Should this manually entered score directly overwrite the existing `averageScore` field?~~
        *   ~~Or, should we add a new field, for example, `manualOverrideAverageScore`? If so, how should the system prioritize which score to use if both exist (e.g., `manualOverrideAverageScore` always takes precedence if set)?~~
        *   ~~Should there be a way to clear the manual score and revert to an auto-calculated one (if applicable)?~~
*   **Update on Task 1:**
    *   Decisions received:
        *   Active tournament updates: Allowed, but changes apply to future events only. Admin should be warned.
        *   Data Model: Directly overwrite `averageScore`.
    *   ~~The question about "reverting to auto-calculated score" is pending investigation in Task 2 to understand if/how `averageScore` is currently auto-calculated. I will also investigate where and when `averageScore` is set.~~
    *   **Update on "Reverting to Auto-Calc":** Investigation in Task 2 revealed that `PlayerEditModal.tsx` recalculates `averageScore` from `historicalScores`. So, a manual override will be superseded if historical scores are later edited via the modal. We will proceed without a separate "revert to auto" feature for the direct `averageScore` input field. The `averageScore` is set to 0 on new player creation in `usePlayerData.ts` or recalculated in `PlayerEditModal.tsx`.
*   **Update on Feature Direction (User Request):** The feature was redesigned to implement manual average score editing directly within the `PlayerEditModal.tsx` instead of inline in the `PlayerTable.tsx`. This involved reverting changes to `PlayerTable.tsx` and `PlayerManagement.tsx`, and then significantly updating `PlayerEditModal.tsx` to include the direct input field, logic for prioritizing direct input vs. calculated score, and the active tournament check.
*   **Linter Issue Fixed:** Addressed a linter warning in `PlayerEditModal.tsx` regarding an unused `isLoadingTournaments` variable by incorporating it into the Save button's disabled state and text.
*   **Final Testing Successful:** User confirmed that all end-to-end testing scenarios for the modal-based editing approach work correctly.

**Project Complete: Manual Average Score (Handicap) Update feature implemented and verified within the Player Edit Modal.**

## Lessons
*   Project uses Vite/React with TypeScript (not Next.js App Router as initially assumed from general preferences).
*   Source code is primarily in `src/`.
*   Player data includes explicit `team` and `averageScore` (for handicap) in `src/types/player.ts`.
*   Matchups are managed within `TournamentManagement.tsx` and displayed by `MatchupList.tsx`.
*   UI elements should be carefully placed according to user specifications (initial placement of average handicap display was outside the target card, then corrected).
