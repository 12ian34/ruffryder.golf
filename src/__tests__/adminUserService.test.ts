import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateAdminUserAccess2026 } from '../services/adminUserService';
import { getSupabaseClient } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}));

describe('admin user access service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts an authenticated admin access action to the Netlify function', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'session-token' } },
        }),
      },
    } as unknown as ReturnType<typeof getSupabaseClient>);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await updateAdminUserAccess2026({
      profileId: 'profile-1',
      action: 'deactivate',
      reason: 'No longer playing',
    });

    expect(fetchMock).toHaveBeenCalledWith('/.netlify/functions/admin-user-access', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId: 'profile-1',
        action: 'deactivate',
        reason: 'No longer playing',
      }),
    });
  });

  it('surfaces server errors from the access function', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'session-token' } },
        }),
      },
    } as unknown as ReturnType<typeof getSupabaseClient>);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ error: 'Only admins can manage user access.' }),
      })
    );

    await expect(
      updateAdminUserAccess2026({ profileId: 'profile-1', action: 'delete' })
    ).rejects.toThrow('Only admins can manage user access.');
  });
});
