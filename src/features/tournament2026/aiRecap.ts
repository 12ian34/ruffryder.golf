import {
  calculateFixtureProgress,
  calculateSegmentMatchPlayStatus,
  type MatchPlayStatus,
} from '../../domain/2026/matchPlayStatus';
import {
  calculatePointTotals,
  calculateSegmentPoints,
  isOneVOneFixture,
  type PointsBreakdown,
  type TeamPoints,
} from '../../domain/2026/points';
import type { CourseHoleMetadata } from '../../domain/2026/course';
import type {
  FixtureView,
  HoleScoreRow,
  PlayerRow,
  TournamentRow,
} from '../../services/tournament2026Queries';
import { buildPointsProgressTimeline, generateTournamentHighlights } from './insights';
import {
  calculateTotals,
  formatSegmentKind,
  formatSegmentMatchup,
  getSegmentOutcomeLabel,
  getSegmentSideLabels,
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
  scoreboard: {
    pointsOnTable: PointsBreakdown;
    provisionalPoints: PointsBreakdown;
    hasOneVOne: boolean;
  };
  momentum: {
    holesWon: {
      overall: TeamScore;
      foursomes: TeamScore;
      singles: TeamScore;
    };
  };
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
  points: {
    matchPlayOnTable: TeamPoints;
    matchPlayProvisional: TeamPoints;
    strokePlayOnTable: TeamPoints | null;
    strokePlayProvisional: TeamPoints | null;
  };
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
  const pointTotals = calculatePointTotals(fixtures);
  const generatedHighlights = generateTournamentHighlights({ tournament, fixtures, players, courseHoles })
    .slice(0, MAX_HIGHLIGHTS);
  const highlights = generatedHighlights.length > 0 ? generatedHighlights : [EMPTY_HIGHLIGHTS_FALLBACK];
  const recentMovement = buildPointsProgressTimeline(fixtures, players)
    .slice(-MAX_MOVEMENT_POINTS)
    .map((point) => ({
      label: point.label,
      scoreline: `Provisional points: USA ${formatPointValue(point.usa)} - Europe ${formatPointValue(point.europe)}`,
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
    scoreboard: {
      pointsOnTable: pointTotals.onTable,
      provisionalPoints: pointTotals.provisional,
      hasOneVOne: pointTotals.hasOneVOne,
    },
    momentum: {
      holesWon: totals,
    },
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
    'Scoring rule: scoreboard.provisionalPoints and scoreboard.pointsOnTable are the official match score. momentum.holesWon is only momentum, never the result.',
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
  const isOneVOne = isOneVOneFixture(fixture);

  return {
    name: fixture.name ?? `Fixture ${fixture.sort_order + 1}`,
    progress: `${progress.completedHoles}/${progress.totalHoles} holes (${progress.percent}%)`,
    segments: fixture.segments
      .slice(0, MAX_SEGMENTS_PER_FIXTURE)
      .map((segment) => {
        const status = calculateSegmentMatchPlayStatus(segment);

        return {
          name: segment.name ?? formatSegmentKind(segment.kind),
          kind: formatSegmentKind(segment.kind),
          matchup: formatSegmentMatchup(segment, players),
          status: formatSegmentStatus(status, segment, fixture, players),
          score: summarizeSegmentScore(segment.holeScores),
          points: calculateSegmentPoints(segment, { isOneVOneFixture: isOneVOne }),
          recentHoles: summarizeRecentHoles(segment, fixture, players),
        };
      }),
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

function summarizeRecentHoles(
  segment: FixtureView['segments'][number],
  fixture: FixtureView,
  players: PlayerRow[]
): string[] {
  return segment.holeScores
    .filter((score) => score.outcome !== 'unplayed')
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
    .slice(-MAX_RECENT_HOLES_PER_SEGMENT)
    .map((score) => {
      const result =
        score.outcome === 'USA' || score.outcome === 'EUROPE'
          ? `${getSegmentOutcomeLabel(segment, players, score.outcome, {
              fixture,
              includeTeam: segment.kind === 'foursomes',
            })} won`
          : 'halved';
      return `H${score.hole_number}: ${score.usa_score ?? '-'}-${score.europe_score ?? '-'} (${result})`;
    });
}

function formatSegmentStatus(
  status: MatchPlayStatus,
  segment: FixtureView['segments'][number],
  fixture: FixtureView,
  players: PlayerRow[]
): string {
  if (!status.leader) {
    return status.label;
  }

  const labels = getSegmentSideLabels(segment, players, {
    fixture,
    includeTeam: segment.kind === 'foursomes',
  });
  const leader = status.leader === 'USA' ? labels.usa : labels.europe;

  switch (status.state) {
    case 'won':
      return status.holesRemaining === 0
        ? `${leader} wins by ${status.margin}`
        : `${leader} wins ${status.margin} & ${status.holesRemaining}`;
    case 'dormie':
      return `${leader} dormie ${status.margin}`;
    case 'in_progress':
      return `${leader} ${status.margin} up`;
    case 'halved':
    case 'not_started':
      return status.label;
    default: {
      const exhaustiveCheck: never = status.state;
      return exhaustiveCheck;
    }
  }
}

function formatPointValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}
