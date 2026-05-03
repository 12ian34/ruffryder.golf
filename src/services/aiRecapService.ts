import { buildAiRecapRequestBody, type AiRecapSnapshot } from '../features/tournament2026/aiRecap';
import { getSupabaseClient } from '../lib/supabase';

export interface GenerateAiRecapResult {
  recap: string;
}

export async function generateAiRecap(snapshot: AiRecapSnapshot): Promise<GenerateAiRecapResult> {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Sign in before generating an AI recap.');
  }

  const response = await fetch('/.netlify/functions/ai-recap', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildAiRecapRequestBody(snapshot)),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (response.status === 404 && window.location.port === '5173') {
      throw new Error('AI recap needs Netlify Dev locally. Run npm run dev and open http://localhost:3000.');
    }

    throw new Error(getErrorMessage(payload));
  }

  if (!isRecord(payload) || typeof payload.recap !== 'string') {
    throw new Error('AI recap returned an unexpected response.');
  }

  return { recap: payload.recap };
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

  return 'AI recap failed.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
