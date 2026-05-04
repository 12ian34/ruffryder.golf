import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileSection } from '../features/tournament2026/components/ProfileSection';
import type { ProfileRow } from '../services/tournament2026Queries';

describe('ProfileSection theme toggle', () => {
  it('keeps theme controls out of the Profile page body', () => {
    const { container } = render(
      <ProfileSection
        tournament={null}
        profile={profile}
        players={[]}
        playerStats={[]}
        aiPlayerOverviews={[]}
        onSignOut={vi.fn().mockResolvedValue(undefined)}
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const view = within(container);

    expect(view.getByText('player access')).toBeInTheDocument();
    expect(view.queryByLabelText(/Switch to .* theme/)).not.toBeInTheDocument();
  });
});

const profile: ProfileRow = {
  access_disabled_at: null,
  access_disabled_by: null,
  access_disabled_reason: null,
  created_at: '2026-05-04T00:00:00.000Z',
  custom_emoji: null,
  display_name: 'Ian',
  email: 'ian@example.com',
  firebase_uid: null,
  id: 'profile-1',
  is_admin: false,
  linked_player_id: null,
  team: null,
  updated_at: '2026-05-04T00:00:00.000Z',
};
