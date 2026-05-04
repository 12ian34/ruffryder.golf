import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../types/supabase';

const supabaseJsMock = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: supabaseJsMock.createClient,
}));

describe('Supabase browser client', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('reports missing browser-safe Supabase environment variables', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', ' ');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    const { getSupabaseConfigStatus } = await import('../lib/supabase');

    expect(getSupabaseConfigStatus()).toEqual({
      isConfigured: false,
      missingKeys: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'],
    });
  });

  it('creates and reuses a configured browser client', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    const client = { from: vi.fn() } as unknown as SupabaseClient<Database>;
    supabaseJsMock.createClient.mockReturnValue(client);
    const { getSupabaseClient } = await import('../lib/supabase');

    expect(getSupabaseClient()).toBe(client);
    expect(getSupabaseClient()).toBe(client);
    expect(supabaseJsMock.createClient).toHaveBeenCalledTimes(1);
    expect(supabaseJsMock.createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'publishable-key',
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      }
    );
  });

  it('throws when a required Supabase environment variable is missing at client access time', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    const { getSupabaseClient } = await import('../lib/supabase');

    expect(() => getSupabaseClient()).toThrow(
      'Missing required environment variable: VITE_SUPABASE_PUBLISHABLE_KEY'
    );
    expect(supabaseJsMock.createClient).not.toHaveBeenCalled();
  });

  it('proxies Supabase method access through the lazy browser client', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    const from = vi.fn();
    supabaseJsMock.createClient.mockReturnValue({ from });
    const { supabase } = await import('../lib/supabase');

    supabase.from('players');

    expect(from).toHaveBeenCalledWith('players');
  });
});
