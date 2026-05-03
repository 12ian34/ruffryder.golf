import type {
  AiPlayerOverviewContext,
  AiNewsroomArtifactContext,
} from '../features/tournament2026/aiOverview';
import type { AiRecapSnapshot } from '../features/tournament2026/aiRecap';
import { getSupabaseClient } from '../lib/supabase';
import type {
  AiPlayerOverviewRow,
  AiNewsroomArtifactRow,
  AiTournamentOverviewRow,
} from './tournament2026Queries';

export async function generatePlayerAiOverview({
  playerId,
  context,
  customPrompt,
}: {
  playerId: string;
  context: AiPlayerOverviewContext;
  customPrompt: string;
}): Promise<AiPlayerOverviewRow> {
  const payload = await postAiOverviewRequest('/.netlify/functions/ai-player-overview', {
    playerId,
    context,
    customPrompt,
  });

  if (!isRecord(payload) || !isRecord(payload.overview)) {
    throw new Error('AI player overview returned an unexpected response.');
  }

  return payload.overview as AiPlayerOverviewRow;
}

export async function generateTournamentAiOverview({
  tournamentId,
  snapshot,
  sourceHoleScoreCount,
}: {
  tournamentId: string;
  snapshot: AiRecapSnapshot;
  sourceHoleScoreCount: number;
}): Promise<AiTournamentOverviewRow> {
  const payload = await postAiOverviewRequest('/.netlify/functions/ai-tournament-overview', {
    tournamentId,
    snapshot,
    sourceHoleScoreCount,
  });

  if (!isRecord(payload) || !isRecord(payload.overview)) {
    throw new Error('AI tournament overview returned an unexpected response.');
  }

  return payload.overview as AiTournamentOverviewRow;
}

export async function generateAiNewsroomArtifacts({
  tournamentId,
  context,
}: {
  tournamentId: string;
  context: AiNewsroomArtifactContext;
}): Promise<AiNewsroomArtifactRow[]> {
  const payload = await postAiOverviewRequest('/.netlify/functions/ai-newsroom-artifacts', {
    tournamentId,
    context,
  });

  if (!isRecord(payload) || !Array.isArray(payload.artifacts)) {
    throw new Error('AI newsroom returned an unexpected response.');
  }

  return payload.artifacts as AiNewsroomArtifactRow[];
}

async function postAiOverviewRequest(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Sign in before generating an AI overview.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (response.status === 404 && window.location.port === '5173') {
      throw new Error('AI overviews need Netlify Dev locally. Run npm run dev and open http://localhost:3000.');
    }

    throw new Error(getErrorMessage(payload));
  }

  return payload;
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

  return 'AI overview failed.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
