import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

let browserClient: SupabaseClient<Database> | null = null;

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  missingKeys: Array<keyof ImportMetaEnv>;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, property);

    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const missingKeys: Array<keyof ImportMetaEnv> = [];

  if (!getEnvValue('VITE_SUPABASE_URL')) {
    missingKeys.push('VITE_SUPABASE_URL');
  }

  if (!getEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY')) {
    missingKeys.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  }

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
  };
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = getRequiredEnv('VITE_SUPABASE_URL');
  const supabasePublishableKey = getRequiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

  browserClient = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}

function getRequiredEnv(key: keyof ImportMetaEnv): string {
  const value = getEnvValue(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getEnvValue(key: keyof ImportMetaEnv): string | undefined {
  const value = import.meta.env[key];

  return typeof value === 'string' && value.trim() ? value : undefined;
}
