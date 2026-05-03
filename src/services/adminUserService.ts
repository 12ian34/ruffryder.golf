import { getSupabaseClient } from '../lib/supabase';

export type AdminUserAccessAction = 'deactivate' | 'reactivate' | 'delete';

export interface AdminUserAccessInput {
  profileId: string;
  action: AdminUserAccessAction;
  reason?: string;
}

export async function updateAdminUserAccess2026(input: AdminUserAccessInput): Promise<void> {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Sign in before managing user access.');
  }

  const response = await fetch('/.netlify/functions/admin-user-access', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (response.status === 404 && window.location.port === '5173') {
      throw new Error('User access admin needs Netlify Dev locally. Run npm run dev and open http://localhost:3000.');
    }

    throw new Error(getErrorMessage(payload));
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown): string {
  if (isRecord(payload) && typeof payload.error === 'string') {
    return payload.error;
  }

  return 'User access update failed.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
