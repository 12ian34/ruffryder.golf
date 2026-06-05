import { createHash } from 'node:crypto';
import {
  generateMarkdownWithOpenAI,
  getErrorStatus,
  getPublicErrorMessage,
  httpError,
  jsonResponse,
  parseJsonBody,
  requireAuthenticatedSupabase,
  stableStringify,
  validateString,
} from './ai-function-utils.mjs';

const ARTIFACT_DEFINITIONS = {
  highlights_commentary: {
    title: 'Highlights Commentary',
    instruction:
      'Turn the provided highlights reel into a tight clubhouse commentary card. Mention the sharpest factual highlights and keep it under 90 words.',
  },
  moment_of_round: {
    title: 'Moment Of The Round',
    instruction:
      'Pick the single biggest factual moment currently visible in the snapshot. If no obvious moment exists, call out that the round is still waiting for one. Keep it under 70 words.',
  },
  cheese_detector: {
    title: 'Cheese Detector',
    instruction:
      'Find the cheesiest factual win, joke-shaped swing, or corny scoreboard moment. Use the corn emoji if genuinely apt. If nothing cheesy exists, make the absence the joke. Keep it under 70 words.',
  },
  rivalry_watch: {
    title: 'Rivalry Generator',
    instruction:
      'Frame the best current or emerging rivalry from the fixture and segment data. Do not invent history beyond the snapshot. Keep it under 80 words.',
  },
  captains_briefing: {
    title: "Captain's Briefing",
    instruction:
      'Write a practical captain-style briefing: who is ahead, where pressure is building, and what to watch next. Markdown bullets are allowed. Keep it under 100 words.',
  },
  post_round_report: {
    title: 'Post-Round Match Report',
    instruction:
      'Write a final-style match report if the tournament is complete. If it is still live, write a live-not-final report and say what remains unresolved. Keep it under 110 words.',
  },
};

const ALLOWED_KINDS = Object.keys(ARTIFACT_DEFINITIONS);

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      throw httpError(405, 'Use POST to generate AI newsroom artifacts.');
    }

    const { supabase, user } = await requireAuthenticatedSupabase(event.headers.authorization);
    const body = parseJsonBody(event.body);
    const tournamentId = validateString(body.tournamentId, 'tournamentId', 80);
    const context = validateContext(body.context);
    const sourceHash = createHash('sha256').update(stableStringify(context)).digest('hex');

    const artifacts = await Promise.all(
      context.requestedKinds.map(async (kind) => {
        const definition = ARTIFACT_DEFINITIONS[kind];
        const markdown = await generateMarkdownWithOpenAI(buildArtifactPrompt(kind, context), 360);

        return {
          tournament_id: tournamentId,
          kind,
          title: definition.title,
          body_markdown: markdown,
          source_hash: sourceHash,
          source_hole_score_count: context.scoredHoleCount,
          source_snapshot: context.snapshot,
          generated_by: user.id,
          generated_at: new Date().toISOString(),
        };
      })
    );

    const { data, error } = await supabase
      .from('ai_newsroom_artifacts')
      .upsert(artifacts, { onConflict: 'tournament_id,kind' })
      .select('*');

    if (error) {
      throw httpError(500, 'AI newsroom artifacts could not be saved.');
    }

    return jsonResponse(200, { artifacts: data ?? [] });
  } catch (error) {
    return jsonResponse(getErrorStatus(error), { error: getPublicErrorMessage(error) });
  }
}

function validateContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw httpError(400, 'context is required.');
  }

  if (!value.snapshot || typeof value.snapshot !== 'object' || Array.isArray(value.snapshot)) {
    throw httpError(400, 'context.snapshot is required.');
  }

  if (!Number.isInteger(value.scoredHoleCount) || value.scoredHoleCount < 0) {
    throw httpError(400, 'context.scoredHoleCount must be a non-negative integer.');
  }

  if (!Array.isArray(value.requestedKinds) || value.requestedKinds.length === 0) {
    throw httpError(400, 'context.requestedKinds is required.');
  }

  const requestedKinds = value.requestedKinds.filter(
    (kind) => typeof kind === 'string' && ALLOWED_KINDS.includes(kind)
  );

  if (requestedKinds.length !== value.requestedKinds.length) {
    throw httpError(400, 'context.requestedKinds contains an unsupported kind.');
  }

  return {
    snapshot: value.snapshot,
    scoredHoleCount: value.scoredHoleCount,
    requestedKinds,
  };
}

function buildArtifactPrompt(kind, context) {
  const definition = ARTIFACT_DEFINITIONS[kind];

  return [
    `Generate this Ruff Ryders Cup AI newsroom card: ${definition.title}.`,
    definition.instruction,
    'Use context.snapshot.scoreboard.provisionalPoints and context.snapshot.scoreboard.pointsOnTable as the official score.',
    'Use context.snapshot.momentum.holesWon only as momentum context; never describe holes-won totals as the match score.',
    'Use concise Markdown only when useful. Emojis are allowed sparingly, including wild choices when apt.',
    'Stay factual: do not invent scores, quotes, injuries, weather, or off-snapshot lore.',
    '',
    JSON.stringify(context),
  ].join('\n');
}
