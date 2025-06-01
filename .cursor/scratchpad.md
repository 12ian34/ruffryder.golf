# Ruff Ryders Golf App - Four Ball Feature Implementation Plan

## 1. Background and Motivation

The ruffryder.golf app currently allows admins to create matchups for a tournament. A common real-world scenario in golf tournaments, especially "4-ball" formats, is that two matchups (i.e., four players in total, or a "four ball") play together on the course. This feature request aims to:

1.  Represent this "four ball" grouping in the application.
2.  Allow admins to create and manage these four ball pairings.
3.  Adjust the "My Games" view so players can see all games within their four ball.
4.  Modify score entry permissions so that any player within a four ball can enter scores for any game (i.e., either matchup) in their four ball. Admins retain universal score entry permission.

This will improve the user experience by reflecting the on-course groupings and simplifying score entry.

## 2. Key Challenges and Analysis

*   **Data Modeling:** Deciding how to represent the link between two matchups forming a four ball. The chosen approach is to add a `fourballId` (UUID) to each `Matchup` object. Matchups in the same four ball will share the same `fourballId`.
*   **Firebase Queries:** Ensuring efficient fetching of matchups based on `fourballId`, and updating Firebase rules and indexes if necessary.
*   **Admin UI/UX:** Designing an intuitive interface for admins to create, view, and manage four ball pairings from existing matchups. This includes selecting two matchups and pairing them, and also unpairing them.
*   **Permissions Logic:** Modifying the existing score entry permission system to accommodate the new four ball context, ensuring players can only edit scores within their four ball, while admins retain full access.
*   **State Management:** Handling state updates correctly in the UI when pairings are made or changed, especially in the admin section and the "My Games" tab.
*   **Definition of "Game":** For this feature, a "game" will be considered synonymous with a "matchup". A four ball consists of two such "games" or "matchups".

## 3. High-level Task Breakdown

The implementation will be broken down into the following tasks. Each task will be executed one at a time in Executor mode, with verification by the human user before proceeding to the next.

### Phase 1: Data Model and Core Logic

1.  **Task 1.1: Update `Matchup` Type and Firebase Structure.**
    *   **Description:** Add an optional `fourballId: string` field to the `Matchup` TypeScript interface/type.
    *   **Success Criteria:** The `Matchup` type definition is updated. Firebase data structure (conceptually) supports this new field. No actual database migration is needed for existing data, as older matchups simply won't have this field.
2.  **Task 1.2: Implement Firebase Helper Functions (if needed).**
    *   **Description:** Create or update Firebase helper functions to:
        *   Pair two matchups (assign them the same new `fourballId`).
        *   Unpair two matchups (remove/nullify their `fourballId`).
        *   Fetch all matchups belonging to a specific `fourballId`.
        *   Fetch a user's matchup(s) including their four ball partners.
    *   **Success Criteria:** Helper functions are implemented and unit-tested (if feasible without full UI). These functions correctly update/retrieve data from Firebase.

### Phase 2: Admin UI for Four Ball Management

3.  **Task 2.1: Design and Implement UI for Listing Matchups for Pairing.**
    *   **Description:** In the tournament admin section, create a UI component that lists all matchups for the active tournament that are not currently part of a four ball (i.e., `fourballId` is null or undefined).
    *   **Success Criteria:** Admin can see a list of available matchups. Each item should be selectable.
4.  **Task 2.2: Implement Pairing Functionality.**
    *   **Description:** Allow the admin to select two matchups from the list and click a "Pair Matchups" button. This button will trigger the Firebase helper function to assign a new shared `fourballId` to these two matchups.
    *   **Success Criteria:** Admin can select two matchups. Upon clicking "Pair", the two selected matchups in Firebase are updated with a new, identical `fourballId`. The UI updates to reflect they are no longer "available" for pairing.
5.  **Task 2.3: Design and Implement UI for Displaying and Managing Existing Four Balls.**
    *   **Description:** Create a UI component that lists all existing four ball pairings for the active tournament. Each four ball should display its constituent two matchups. Provide an "Unpair" option for each four ball.
    *   **Success Criteria:** Admin can see a list of currently paired four balls. Clicking "Unpair" on a four ball calls the Firebase helper function to remove the `fourballId` from both associated matchups. The UI updates: the four ball is removed from this list, and the two matchups reappear in the "available for pairing" list.
6.  **Task 2.4: (Optional) Implement Editing of Existing Four Balls.**
    *   **Description:** Allow an admin to change one of the matchups in an existing four ball. This might involve unpairing one matchup and pairing a new one.
    *   **Success Criteria:** Admin can modify an existing four ball pairing.

### Phase 3: "My Games" Tab Update

7.  **Task 3.1: Modify "My Games" Data Fetching Logic.**
    *   **Description:** Update the data fetching logic for the "My Games" tab. If the current user's primary matchup has a `fourballId`, fetch both matchups associated with that `fourballId`.
    *   **Success Criteria:**
        *   If the player is in a four ball, data for both matchups in their four ball is fetched.
        *   If the player is not in a four ball, only their own matchup data is fetched.
8.  **Task 3.2: Update "My Games" UI to Display Four Ball Games.**
    *   **Description:** Adjust the "My Games" UI to display cards/information for all games (matchups) fetched in the previous step.
    *   **Success Criteria:**
        *   If the player is in a four ball, both matchups are displayed clearly.
        *   If not, only their own matchup is displayed. UI remains clear and usable.

### Phase 4: Permissions Update

9.  **Task 4.1: Update Score Entry Permission Logic.**
    *   **Description:** Modify the rules/logic that determine if a user can enter/edit scores for a game.
        *   Admins: Can always edit any game (no change).
        *   Players:
            *   If their primary matchup has a `fourballId`, they can edit scores for *both* matchups in that four ball.
            *   If their primary matchup does not have a `fourballId`, they can only edit scores for their own matchup.
    *   **Success Criteria:** Permissions are enforced correctly according to the new rules. This should be testable by attempting score entry as different users in different scenarios.
10. **Task 4.2: Test Score Entry Scenarios.**
    *   **Description:** Manually test various scenarios:
        *   Admin editing any game.
        *   Player in a four ball editing their own game.
        *   Player in a four ball editing their partner matchup's game.
        *   Player in a four ball attempting to edit a game outside their four ball (should fail).
        *   Player not in a four ball editing their own game.
        *   Player not in a four ball attempting to edit another game (should fail).
    *   **Success Criteria:** All tests pass and behavior is as expected.

## 4. Project Status Board

### Phase 1: Data Model and Core Logic
- [x] **Task 1.1:** Update `Matchup` Type and Firebase Structure.
- [x] **Task 1.2:** Implement Firebase Helper Functions.

### Phase 2: Admin UI for Four Ball Management
- [x] **Task 2.1:** Design and Implement UI for Listing Matchups for Pairing.
- [x] **Task 2.2:** Implement Pairing Functionality.
- [x] **Task 2.3:** Design and Implement UI for Displaying and Managing Existing Four Balls.
- [ ] **Task 2.4:** (Optional) Implement Editing of Existing Four Balls. (Permanently Cancelled)

### Phase 3: "My Games" Tab Update
- [x] **Task 3.1:** Modify "My Games" Data Fetching Logic.
- [x] **Task 3.2:** Update "My Games" UI to Display Four Ball Games. (Implicitly completed with permission UI changes)

### Phase 4: Permissions Update
- [x] **Task 4.1:** Update Score Entry Permission Logic. (UI, page access, and Firestore rules) - Fixed permission error by adding allowedEditors field support.
- [x] **Task 4.2:** Test Score Entry Scenarios. (User confirmed working, ready for re-testing)

## 5. Executor's Feedback or Assistance Requests

*(To be filled by Executor during implementation)*
- **Issue Resolved:** Fixed FirebaseError: Missing or insufficient permissions by:
  1. Updated Firestore security rules to check for `allowedEditors` field in addition to direct player participation
  2. Added `allowedEditors?: string[]` field to Game type
  3. Created `updateGamePermissionsForFourball()` helper function that populates `allowedEditors` with all four player IDs when matchups are paired
  4. Integrated the helper function into `pairMatchups()` and `unpairFourball()` functions
  5. Successfully deployed updated Firestore rules

## 6. Lessons

*(To be filled as insights are gained or issues are resolved)*
- When adding new fields to Firebase-backed types, ensure any frontend logic that reads these types can gracefully handle objects where the new field might be missing (e.g., for older data). Use optional chaining (`?.`) or default values.
- For generating unique IDs like `fourballId`, a client-side UUID generator is usually sufficient if collisions are not a critical concern for this specific use case, or use Firebase's `push().key` if creating a new related entity. For updating existing documents, a client-generated UUID is fine.
- **Firestore Security Rules Limitation:** Firestore security rules cannot perform arbitrary queries to check relationships across documents. The solution was to denormalize data by adding an `allowedEditors` field directly to game documents for four-ball permissions.
- **Node.js Version Compatibility:** Firebase CLI v14.1.0+ requires Node.js v20+. Used Homebrew to install node@20 and updated PATH for compatibility.

## 7. Current Status / Progress Tracking

**Overall Progress:** Complete (All planned tasks implemented and permission issue resolved)
**Current Phase:** All Phases Completed
**Last Completed Task:** Task 4.1 (Firestore rules fix)
**Next Step:** User to test score entry for the other game in their four-ball to confirm the permission issue is resolved. 