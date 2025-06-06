# Project: Player Tier Management and Display

## Background and Motivation

The user wants to introduce a "tier" system for players. Each player will be assigned a tier, which is an integer from 1 to about 4, with 1 being the highest tier. This tier system will serve as a guideline for creating matchups in tournaments, pairing players of similar skill levels (e.g., Tier 1 vs. Tier 1).

The key requirements are:
1.  **Admin-only editing**: Only administrators should be able to assign and update player tiers.
2.  **Visibility**: The player tiers should be visible in the main player list and on the "Create Matchup" screen.
3.  **Guideline, not a rule**: The tier system should guide matchup creation but not strictly enforce it.

This feature will help in organizing more balanced and competitive matches.

## Key Challenges and Analysis

1.  **Database Schema Modification**: The `players` data structure in **Firestore** needs to be updated to include a `tier` field. This will be handled by updating the player documents directly, so no separate migration is needed. This is now part of Task 3.
2.  **Admin UI for Tier Management**: A new UI or modification to the existing player management UI is needed for admins to set/update the `tier` for each player. This needs to be protected by role-based access control.
3.  **Data Fetching**: The application's data fetching logic for players needs to be updated to include the new `tier` field.
4.  **UI Updates**:
    *   The main player list/table needs a new column or display element for the tier.
    *   The "Create Matchup" screen needs to display the tier for each player to assist in pairing.
5.  **Type Safety**: TypeScript types for players (`Player`) will need to be updated to include the optional `tier` property.

## High-level Task Breakdown

### Task 1: Update Database Schema
- **Description**: Add a `tier` column of type `integer` to the `players` table in Supabase.
- **Success Criteria**: The `players` table in Supabase has a new `tier` column. This can be verified in the Supabase table editor.

### Task 2: Update Player Types
- **Description**: Update the `Player` type definition in the application to include the new `tier` attribute.
- **Files**: `src/lib/types.ts` (or wherever Player type is defined).
- **Success Criteria**: The `Player` type in TypeScript includes an optional `tier: number;` property.

### Task 3: Update Admin Player Management UI
- **Description**: Modify the player editing interface to allow admins to set or update a player's tier. This will likely involve adding a number input field to the edit player form.
- **Files**: `src/app/admin/players/edit-player-form.tsx` (or similar).
- **Success Criteria**: An admin can successfully edit a player's tier and the change is persisted in the database.

### Task 4: Display Tiers in Player List
- **Description**: Update the main player list to display the tier for each player.
- **Files**: `src/app/players/page.tsx` or a player table component.
- **Success Criteria**: The player list/table shows a "Tier" column or displays the tier next to the player's name.

### Task 5: Display Tiers in Create Matchup Screen
- **Description**: Update the "Create Matchup" screen to show player tiers, helping admins make balanced pairings.
- **Files**: `src/app/admin/matchups/create/page.tsx` (or similar).
- **Success Criteria**: When creating a matchup, the tiers of the selectable players are visible.

### Task 6: Testing
- **Description**: End-to-end testing of the new tier functionality.
- **Success Criteria**:
    - Admins can create/update tiers.
    - Non-admins cannot edit tiers.
    - Tiers are displayed correctly in all specified locations.
    - Matchups can still be created with players from different tiers.

## Project Status Board

- [ ] ~~Task 1: Update Database Schema~~ (merged with Task 3)
- [x] Task 2: Update Player Types
- [x] Task 3: Update Admin Player Management UI
- [x] Task 4: Display Tiers in Player List
- [x] Task 5: Display Tiers in Create Matchup Screen
- [x] Task 6: Testing

## Current Status / Progress Tracking

**Status**: All tasks are complete. The player tier system has been implemented and is ready for review.

## Executor's Feedback or Assistance Requests

*The tier system is fully implemented and tested. Please review the changes and confirm that everything is working as expected. Key areas to check are the player management page for editing tiers, the main player list, and the create matchup screen.*

## Lessons

*When data isn't appearing as expected, trace it from the initial fetch (hook) through to the component and any utility functions. Granular logging is key.*
*Verify Firestore query conditions (`where('field', '==', 'value')`) match the exact field names and values in the database.*
***Crucially, confirm the exact Firestore data structure, including collection/subcollection paths, AND fundamental game parameters (like all holes being Par 3) with the user if there's any ambiguity. Incorrect assumptions here can lead to significant debugging time and incorrect logic.***
