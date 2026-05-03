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

const MAX_BODY_BYTES = 28_000;
const MAX_CUSTOM_PROMPT_LENGTH = 600;

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (Buffer.byteLength(event.body || '', 'utf8') > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: 'AI player overview request is too large.' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedSupabase(event.headers.authorization);
    const body = parseJsonBody(event.body);
    const playerId = validateString(body?.playerId, 'playerId', 80);
    const context = validatePlayerContext(body?.context);
    const customPrompt = typeof body?.customPrompt === 'string'
      ? body.customPrompt.trim().slice(0, MAX_CUSTOM_PROMPT_LENGTH)
      : '';

    await assertCanGenerateForPlayer(supabase, playerId);

    const overviewMarkdown = await generateMarkdownWithOpenAI(
      buildPlayerPrompt(context, customPrompt),
      520
    );
    const { data, error } = await supabase
      .from('ai_player_overviews')
      .upsert(
        {
          player_id: playerId,
          overview_markdown: overviewMarkdown,
          custom_prompt: customPrompt || null,
          generated_by: user.id,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw httpError(403, error.message || 'Failed to save AI player overview.');
    }

    return jsonResponse(200, { overview: data });
  } catch (error) {
    return jsonResponse(getErrorStatus(error), { error: getPublicErrorMessage(error) });
  }
}

async function assertCanGenerateForPlayer(supabase, playerId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin, linked_player_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (error || !data) {
    throw httpError(401, 'Sign in before generating an AI player overview.');
  }

  if (!data.is_admin && data.linked_player_id !== playerId) {
    throw httpError(403, 'Only admins or the linked player can regenerate this overview.');
  }
}

function validatePlayerContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw httpError(400, 'Player context is required.');
  }

  if (JSON.stringify(context).length > MAX_BODY_BYTES) {
    throw httpError(413, 'Player context is too large.');
  }

  return context;
}

function buildPlayerPrompt(context, customPrompt) {
  return [
    'Generate a persisted player profile overview for everyone in The Ruff to see.',
    'Use Markdown. Aim for a short title plus 2-4 tight bullets or short paragraphs.',
    'Make it feel like a Ruff Ryder scouting dossier, not a generic sports bio.',
    'Anchor jokes in the provided player name, team, CPI, history rows, and known lore only.',
    'Do not invent new tournament results or personal facts.',
    customPrompt
      ? `The player asked for this direction. Follow it if it does not conflict with the facts: ${customPrompt}`
      : 'No custom direction was supplied.',
    '',
    JSON.stringify(context),
  ].join('\n');
}
