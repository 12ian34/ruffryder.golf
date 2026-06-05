import {
  generateMarkdownWithOpenAI,
  getErrorStatus,
  getPublicErrorMessage,
  httpError,
  jsonResponse,
  parseJsonBody,
  requireAuthenticatedSupabase,
  validateString,
} from './ai-function-utils.mjs';

const MAX_BODY_BYTES = 32_000;

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (Buffer.byteLength(event.body || '', 'utf8') > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: 'AI tournament overview request is too large.' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedSupabase(event.headers.authorization);
    const body = parseJsonBody(event.body);
    const tournamentId = validateString(body?.tournamentId, 'tournamentId', 80);
    const sourceHoleScoreCount = validateSourceHoleScoreCount(body?.sourceHoleScoreCount);
    const snapshot = validateSnapshot(body?.snapshot);

    const overviewMarkdown = await generateMarkdownWithOpenAI(buildTournamentPrompt(snapshot), 520);
    const { data, error } = await supabase
      .from('ai_tournament_overviews')
      .upsert(
        {
          tournament_id: tournamentId,
          overview_markdown: overviewMarkdown,
          source_hole_score_count: sourceHoleScoreCount,
          source_snapshot: snapshot,
          generated_by: user.id,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'tournament_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw httpError(403, error.message || 'Failed to save AI tournament overview.');
    }

    return jsonResponse(200, { overview: data });
  } catch (error) {
    return jsonResponse(getErrorStatus(error), { error: getPublicErrorMessage(error) });
  }
}

function validateSourceHoleScoreCount(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw httpError(400, 'sourceHoleScoreCount must be a non-negative integer.');
  }

  return value;
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || snapshot.version !== 1) {
    throw httpError(400, 'AI tournament overview request is missing a valid snapshot.');
  }

  if (JSON.stringify(snapshot).length > MAX_BODY_BYTES) {
    throw httpError(413, 'AI tournament overview snapshot is too large.');
  }

  return snapshot;
}

function buildTournamentPrompt(snapshot) {
  return [
    'Generate a persisted live tournament overview for The Ruff scoreboard.',
    'Use concise Markdown suitable for a compact card.',
    'The overview should summarize the current state and the biggest live narrative.',
    'Use snapshot.scoreboard.provisionalPoints and snapshot.scoreboard.pointsOnTable as the official score.',
    'Use snapshot.momentum.holesWon only as momentum context; never describe holes-won totals as the match score.',
    'Mention the score movement or lack of drama if useful.',
    'Do not invent new scores, holes, winners, or off-course incidents.',
    '',
    JSON.stringify(snapshot),
  ].join('\n');
}
