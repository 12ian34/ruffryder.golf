import { createClient } from '@supabase/supabase-js';
import { RUFF_RYDERS_TONE_CONTEXT } from './ai-tone-context.mjs';

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function getErrorStatus(error) {
  return Number.isInteger(error?.status) ? error.status : 500;
}

export function getPublicErrorMessage(error) {
  return error instanceof Error ? error.message : 'AI generation failed.';
}

export function parseJsonBody(body) {
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw httpError(400, 'Request must be valid JSON.');
  }
}

export function validateString(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(400, `${fieldName} is required.`);
  }

  if (value.length > maxLength) {
    throw httpError(413, `${fieldName} is too long.`);
  }

  return value.trim();
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export async function requireAuthenticatedSupabase(authorizationHeader) {
  const token = parseBearerToken(authorizationHeader);

  if (!token) {
    throw httpError(401, 'Sign in before generating an AI overview.');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw httpError(500, 'AI overview auth is not configured.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw httpError(401, 'Sign in before generating an AI overview.');
  }

  return { supabase, user: data.user };
}

export async function generateMarkdownWithOpenAI(userPrompt, maxOutputTokens = 420) {
  if (!process.env.OPENAI_API_KEY) {
    throw httpError(500, 'AI overview is not configured.');
  }

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
                'You write Ruff Ryders Cup AI overviews.',
                RUFF_RYDERS_TONE_CONTEXT,
                'Return concise Markdown for a mobile dark scoreboard UI.',
                'Use formatting and emojis only when they improve scanability or flavour.',
                'Do not invent scores, results, quotes, crimes, injuries, or events not present in the provided context.',
              ].join(' '),
            },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userPrompt }],
        },
      ],
      max_output_tokens: maxOutputTokens,
    }),
  });

  if (!response.ok) {
    throw httpError(502, 'AI overview generation failed.');
  }

  const data = await response.json();
  const markdown = extractResponseText(data).trim();

  if (!markdown) {
    throw httpError(502, 'AI overview generation returned an empty response.');
  }

  return markdown;
}

function parseBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
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
