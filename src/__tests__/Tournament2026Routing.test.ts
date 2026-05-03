import { describe, expect, it } from 'vitest';
import { getSupabaseEmailRedirectTo } from '../pages/Tournament2026';

describe('Tournament2026 routing helpers', () => {
  it('uses the app root as the Supabase email redirect target', () => {
    window.history.pushState({}, '', '/2026');

    expect(getSupabaseEmailRedirectTo()).toBe('http://localhost');
  });
});
