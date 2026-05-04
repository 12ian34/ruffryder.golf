import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
} from '../../domain/2026/matchPlayStatus';
import type { CourseHoleMetadata } from '../../domain/2026/course';
import type {
  FixtureView,
  HoleScoreRow,
  PlayerRow,
  TournamentRow,
} from '../../services/tournament2026Queries';
import { buildProgressTimeline, generateTournamentHighlights } from './insights';
import {
  calculateTotals,
  formatSegmentKind,
  formatSegmentMatchup,
  type TeamScore,
} from './viewUtils';

export interface AiRecapSnapshot {
  version: 1;
  generatedAt: string;
  tournament: {
    name: string;
    year: number;
    isComplete: boolean;
    cpiThreshold: number;
  } | null;
  totals: {
    overall: TeamScore;
    foursomes: TeamScore;
    singles: TeamScore;
  };
  highlights: string[];
  recentMovement: AiRecapMovementPoint[];
  fixtures: AiRecapFixtureSummary[];
}

export interface AiRecapMovementPoint {
  label: string;
  scoreline: string;
  updatedAt: string;
}

export interface AiRecapFixtureSummary {
  name: string;
  progress: string;
  segments: AiRecapSegmentSummary[];
}

export interface AiRecapSegmentSummary {
  name: string;
  kind: string;
  matchup: string;
  status: string;
  score: TeamScore;
  recentHoles: string[];
}

export interface AiRecapRequestBody {
  snapshot: AiRecapSnapshot;
}

const MAX_HIGHLIGHTS = 8;
const MAX_MOVEMENT_POINTS = 8;
const MAX_FIXTURES = 12;
const MAX_SEGMENTS_PER_FIXTURE = 6;
const MAX_RECENT_HOLES_PER_SEGMENT = 3;
const EMPTY_HIGHLIGHTS_FALLBACK = 'No wild highlights yet. Save more scores and this reel will fill in.';

export function buildAiRecapSnapshot({
  tournament,
  fixtures,
  players,
  courseHoles,
  generatedAt = new Date().toISOString(),
}: {
  tournament: TournamentRow | null;
  fixtures: FixtureView[];
  players: PlayerRow[];
  courseHoles: CourseHoleMetadata[];
  generatedAt?: string;
}): AiRecapSnapshot {
  const totals = calculateTotals(fixtures);
  const generatedHighlights = generateTournamentHighlights({ tournament, fixtures, players, courseHoles })
    .slice(0, MAX_HIGHLIGHTS);
  const highlights = generatedHighlights.length > 0 ? generatedHighlights : [EMPTY_HIGHLIGHTS_FALLBACK];
  const recentMovement = buildProgressTimeline(fixtures, players)
    .slice(-MAX_MOVEMENT_POINTS)
    .map((point) => ({
      label: point.label,
      scoreline: `USA ${point.usa} - Europe ${point.europe}${point.halved > 0 ? `, ${point.halved} halved` : ''}`,
      updatedAt: point.updatedAt,
    }));

  return {
    version: 1,
    generatedAt,
    tournament: tournament
      ? {
          name: tournament.name,
          year: tournament.year,
          isComplete: tournament.is_complete,
          cpiThreshold: tournament.cpi_threshold,
        }
      : null,
    totals,
    highlights,
    recentMovement,
    fixtures: fixtures.slice(0, MAX_FIXTURES).map((fixture) => summarizeFixture(fixture, players)),
  };
}

export function buildAiRecapPrompt(snapshot: AiRecapSnapshot): string {
  return [
    'Write a live Ruff Ryders Cup tournament recap from this score snapshot.',
    'Voice: sharp, funny, clubhouse broadcast energy, but still factual.',
    'Length: concise Markdown, maximum 120 words.',
    'Formatting: headings, bold emphasis, bullets, and numbered lists are allowed when useful.',
    'Emojis: allowed sparingly, maximum two, only when they add flavour.',
    'Rules: do not invent scores, injuries, weather, quotes, or events not in the snapshot.',
    'If little has happened, say the board is still waiting for drama.',
    '',
    JSON.stringify(snapshot),
  ].join('\n');
}

export function buildAiRecapRequestBody(snapshot: AiRecapSnapshot): AiRecapRequestBody {
  return { snapshot };
}

function summarizeFixture(fixture: FixtureView, players: PlayerRow[]): AiRecapFixtureSummary {
  const progress = calculateFixtureProgress(fixture.segments);

  return {
    name: fixture.name ?? `Fixture ${fixture.sort_order + 1}`,
    progress: `${progress.completedHoles}/${progress.totalHoles} holes (${progress.percent}%)`,
    segments: fixture.segments
      .slice(0, MAX_SEGMENTS_PER_FIXTURE)
      .map((segment) => ({
        name: segment.name ?? formatSegmentKind(segment.kind),
        kind: formatSegmentKind(segment.kind),
        matchup: formatSegmentMatchup(segment, players),
        status: calculateSegmentMatchPlayStatus(segment).label,
        score: summarizeSegmentScore(segment.holeScores),
        recentHoles: summarizeRecentHoles(segment.holeScores),
      })),
  };
}

function summarizeSegmentScore(scores: HoleScoreRow[]): TeamScore {
  return scores.reduce<TeamScore>(
    (total, score) => {
      if (score.outcome === 'USA') {
        total.USA += 1;
      } else if (score.outcome === 'EUROPE') {
        total.EUROPE += 1;
      } else if (score.outcome === 'halved') {
        total.halved += 1;
      } else {
        total.unplayed += 1;
      }

      return total;
    },
    { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 }
  );
}

function summarizeRecentHoles(scores: HoleScoreRow[]): string[] {
  return scores
    .filter((score) => score.outcome !== 'unplayed')
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
    .slice(-MAX_RECENT_HOLES_PER_SEGMENT)
    .map((score) => {
      const result = score.outcome === 'halved' ? 'halved' : `${score.outcome} won`;
      return `H${score.hole_number}: ${score.usa_score ?? '-'}-${score.europe_score ?? '-'} (${result})`;
    });
}
