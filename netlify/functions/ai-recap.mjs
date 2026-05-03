import { createClient } from '@supabase/supabase-js';
import { RUFF_RYDERS_TONE_CONTEXT } from './ai-tone-context.mjs';

const MAX_REQUEST_BYTES = 24_000;
const MAX_OUTPUT_TOKENS = 260;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(500, { error: 'AI recap is not configured.' });
  }

  if (byteLength(event.body || '') > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { error: 'AI recap request is too large.' });
  }

  try {
    await requireAuthenticatedUser(event.headers.authorization);
    const body = parseJsonBody(event.body);
    const snapshot = validateSnapshot(body?.snapshot);
    const recap = await generateRecap(snapshot);

    return jsonResponse(200, { recap });
  } catch (error) {
    const status = getErrorStatus(error);
    return jsonResponse(status, { error: getPublicErrorMessage(error) });
  }
}

async function requireAuthenticatedUser(authorizationHeader) {
  const token = parseBearerToken(authorizationHeader);

  if (!token) {
    throw httpError(401, 'Sign in before generating an AI recap.');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw httpError(500, 'AI recap auth is not configured.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw httpError(401, 'Sign in before generating an AI recap.');
  }
}

async function generateRecap(snapshot) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                'You are the Ruff Ryders Cup live tournament commentator.',
                RUFF_RYDERS_TONE_CONTEXT,
                'Use a sharp, funny clubhouse broadcast voice while staying factual.',
                'Return concise Markdown that works in a compact mobile scoreboard card.',
                'Use formatting only when it improves scanability: short headings, bold emphasis, bullets, or numbered lists are allowed.',
                'Emojis are allowed sparingly, maximum two, only when they add flavour.',
                'Keep it under 120 words.',
                'Do not invent scores, quotes, injuries, weather, or events not present in the snapshot.',
                'If little has happened, make the lack of drama itself the recap.',
              ].join(' '),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(snapshot),
            },
          ],
        },
      ],
      max_output_tokens: MAX_OUTPUT_TOKENS,
    }),
  });

  if (!response.ok) {
    throw httpError(502, 'AI recap generation failed.');
  }

  const data = await response.json();
  const recap = extractResponseText(data).trim();

  if (!recap) {
    throw httpError(502, 'AI recap generation returned an empty response.');
  }

  return recap;
}

function parseBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function parseJsonBody(body) {
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw httpError(400, 'AI recap request must be valid JSON.');
  }
}

function validateSnapshot(snapshot) {
  if (!isRecord(snapshot) || snapshot.version !== 1) {
    throw httpError(400, 'AI recap request is missing a valid snapshot.');
  }

  if (!isRecord(snapshot.totals) || !Array.isArray(snapshot.fixtures)) {
    throw httpError(400, 'AI recap snapshot is incomplete.');
  }

  if (JSON.stringify(snapshot).length > MAX_REQUEST_BYTES) {
    throw httpError(413, 'AI recap snapshot is too large.');
  }

  return snapshot;
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  if (!Array.isArray(data.output)) {
    return '';
  }

  return data.output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .map((content) => content.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getErrorStatus(error) {
  return Number.isInteger(error?.status) ? error.status : 500;
}

function getPublicErrorMessage(error) {
  return error instanceof Error ? error.message : 'AI recap failed.';
}
