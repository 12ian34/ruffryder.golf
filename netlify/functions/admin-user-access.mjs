import { createClient } from '@supabase/supabase-js';
import {
  getErrorStatus,
  getPublicErrorMessage,
  httpError,
  jsonResponse,
  parseJsonBody,
  requireAuthenticatedSupabase,
  validateString,
} from './ai-function-utils.mjs';

const DEACTIVATION_BAN_DURATION = '876000h';
const MAX_REASON_LENGTH = 280;

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedSupabase(event.headers.authorization);
    await assertCurrentUserIsAdmin(supabase, user.id);

    const body = parseJsonBody(event.body);
    const profileId = validateString(body?.profileId, 'profileId', 120);
    const action = validateAction(body?.action);
    const reason = normalizeReason(body?.reason);

    if (profileId === user.id) {
      throw httpError(400, 'Admins cannot change their own access from this panel.');
    }

    const serviceClient = createServiceRoleClient();
    const targetProfile = await fetchProfile(serviceClient, profileId);

    if (action === 'deactivate') {
      await deactivateUser(serviceClient, targetProfile.id, user.id, reason);
    } else if (action === 'reactivate') {
      await reactivateUser(serviceClient, targetProfile.id);
    } else {
      await deleteUser(serviceClient, targetProfile.id);
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    return jsonResponse(getErrorStatus(error), { error: getPublicErrorMessage(error) });
  }
}

async function assertCurrentUserIsAdmin(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error || !data?.is_admin) {
    throw httpError(403, 'Only admins can manage user access.');
  }
}

function createServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw httpError(500, 'User access admin is not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function fetchProfile(serviceClient, profileId) {
  const { data, error } = await serviceClient
    .from('profiles')
    .select('id, display_name, email')
    .eq('id', profileId)
    .single();

  if (error || !data) {
    throw httpError(404, 'Profile not found.');
  }

  return data;
}

async function deactivateUser(serviceClient, profileId, actorId, reason) {
  const { error: authError } = await serviceClient.auth.admin.updateUserById(profileId, {
    ban_duration: DEACTIVATION_BAN_DURATION,
  });

  if (authError) {
    throw httpError(502, authError.message || 'Failed to deactivate auth user.');
  }

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({
      is_admin: false,
      linked_player_id: null,
      team: null,
      access_disabled_at: new Date().toISOString(),
      access_disabled_by: actorId,
      access_disabled_reason: reason || 'Disabled by admin',
    })
    .eq('id', profileId);

  if (profileError) {
    throw httpError(502, profileError.message || 'Failed to mark profile disabled.');
  }
}

async function reactivateUser(serviceClient, profileId) {
  const { error: authError } = await serviceClient.auth.admin.updateUserById(profileId, {
    ban_duration: 'none',
  });

  if (authError) {
    throw httpError(502, authError.message || 'Failed to reactivate auth user.');
  }

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({
      access_disabled_at: null,
      access_disabled_by: null,
      access_disabled_reason: null,
    })
    .eq('id', profileId);

  if (profileError) {
    throw httpError(502, profileError.message || 'Failed to mark profile active.');
  }
}

async function deleteUser(serviceClient, profileId) {
  const { error } = await serviceClient.auth.admin.deleteUser(profileId, false);

  if (error) {
    throw httpError(502, error.message || 'Failed to delete auth user.');
  }
}

function validateAction(action) {
  if (action === 'deactivate' || action === 'reactivate' || action === 'delete') {
    return action;
  }

  throw httpError(400, 'Unsupported user access action.');
}

function normalizeReason(reason) {
  if (typeof reason !== 'string') {
    return '';
  }

  return reason.trim().slice(0, MAX_REASON_LENGTH);
}
