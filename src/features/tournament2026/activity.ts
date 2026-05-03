import { calculateSegmentMatchPlayStatus } from '../../domain/2026/matchPlayStatus';
import type {
  FixtureView,
  HoleScoreView,
  SegmentView,
  TournamentActivityRow,
} from '../../services/tournament2026Queries';

export type TournamentActivityCategory =
  | 'score'
  | 'match'
  | 'setup'
  | 'course'
  | 'profile'
  | 'finalization';

export interface TournamentActivityTimelineEvent {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  category: TournamentActivityCategory;
  actorLabel: string | null;
}

export function buildTournamentActivityTimeline({
  activity,
  fixtures,
}: {
  activity: TournamentActivityRow[];
  fixtures: FixtureView[];
}): TournamentActivityTimelineEvent[] {
  return [
    ...activity.map(formatAuditActivity).filter(isTimelineEvent),
    ...buildMatchMilestoneEvents(fixtures),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

function formatAuditActivity(row: TournamentActivityRow): TournamentActivityTimelineEvent | null {
  switch (row.table_name) {
    case 'hole_scores':
      return {
        id: `audit-${row.id}`,
        title: formatScoreTitle(row.action),
        detail: joinDetail([
          row.fixture_name ?? 'Fixture',
          row.segment_name ?? formatSegmentKind(row.segment_kind),
          row.hole_number ? `H${row.hole_number}` : null,
          formatHoleScore(row),
          formatOutcome(row.outcome),
        ]),
        occurredAt: row.occurred_at,
        category: 'score',
        actorLabel: row.actor_display_name,
      };
    case 'fixtures':
      return createSetupEvent(row, `${formatAction(row.action)} fixture`, row.fixture_name);
    case 'fixture_players':
      return createSetupEvent(row, `${formatAction(row.action)} fixture player`, row.fixture_name);
    case 'segments':
      return {
        id: `audit-${row.id}`,
        title: formatSegmentTitle(row),
        detail: joinDetail([
          row.fixture_name ?? 'Fixture',
          row.segment_name ?? formatSegmentKind(row.segment_kind),
          formatChangedFields(row.changed_fields),
        ]),
        occurredAt: row.occurred_at,
        category: 'setup',
        actorLabel: row.actor_display_name,
      };
    case 'segment_players':
      return createSetupEvent(row, `${formatAction(row.action)} segment player`, row.segment_name);
    case 'players':
      return createSetupEvent(row, `${formatAction(row.action)} player`, row.player_name);
    case 'profiles':
      return {
        id: `audit-${row.id}`,
        title: `${formatAction(row.action)} profile`,
        detail: formatChangedFields(row.changed_fields) ?? 'Profile details changed',
        occurredAt: row.occurred_at,
        category: 'profile',
        actorLabel: row.actor_display_name,
      };
    case 'course_holes':
      return {
        id: `audit-${row.id}`,
        title: `${formatAction(row.action)} course hole`,
        detail: joinDetail([row.hole_number ? `H${row.hole_number}` : null, formatChangedFields(row.changed_fields)]),
        occurredAt: row.occurred_at,
        category: 'course',
        actorLabel: row.actor_display_name,
      };
    case 'tournaments':
      return {
        id: `audit-${row.id}`,
        title: formatTournamentTitle(row),
        detail: formatChangedFields(row.changed_fields) ?? 'Tournament settings changed',
        occurredAt: row.occurred_at,
        category: hasFinalizationFields(row.changed_fields) ? 'finalization' : 'setup',
        actorLabel: row.actor_display_name,
      };
    case 'player_tournament_stats':
      return {
        id: `audit-${row.id}`,
        title: `${formatAction(row.action)} player stats`,
        detail: row.player_name ?? 'Tournament history updated',
        occurredAt: row.occurred_at,
        category: 'finalization',
        actorLabel: row.actor_display_name,
      };
    case 'tournament_progress':
      return null;
    default:
      return null;
  }
}

function buildMatchMilestoneEvents(fixtures: FixtureView[]): TournamentActivityTimelineEvent[] {
  const events: TournamentActivityTimelineEvent[] = [];

  for (const fixture of fixtures) {
    for (const segment of fixture.segments) {
      const scoredHoles = segment.holeScores.filter((score) => score.outcome !== 'unplayed');

      if (scoredHoles.length === 0) {
        continue;
      }

      const firstScore = getEarliestScore(scoredHoles);
      const segmentLabel = getSegmentLabel(segment);
      const fixtureLabel = fixture.name ?? `Fixture ${fixture.sort_order + 1}`;

      events.push({
        id: `match-started-${segment.id}`,
        title: `${segmentLabel} started`,
        detail: `${fixtureLabel} - first saved score H${firstScore.hole_number}`,
        occurredAt: firstScore.created_at,
        category: 'match',
        actorLabel: firstScore.updatedByProfile?.display_name ?? null,
      });

      const finish = getFinishMilestone(segment, scoredHoles);

      if (finish) {
        events.push({
          id: `match-finished-${segment.id}`,
          title: `${segmentLabel} finished`,
          detail: `${fixtureLabel} - ${finish.status.label}`,
          occurredAt: finish.score.updated_at,
          category: 'match',
          actorLabel: finish.score.updatedByProfile?.display_name ?? null,
        });
      }
    }
  }

  return events;
}

function getFinishMilestone(
  segment: SegmentView,
  scoredHoles: HoleScoreView[]
): { score: HoleScoreView; status: ReturnType<typeof calculateSegmentMatchPlayStatus> } | null {
  const scoresByHole = [...scoredHoles].sort((a, b) => a.hole_number - b.hole_number);
  const progressiveScores: HoleScoreView[] = [];

  for (const score of scoresByHole) {
    progressiveScores.push(score);

    const status = calculateSegmentMatchPlayStatus({
      ...segment,
      holeScores: progressiveScores,
    });

    if (status.state === 'won' || status.state === 'halved') {
      return { score, status };
    }
  }

  return null;
}

function createSetupEvent(
  row: TournamentActivityRow,
  title: string,
  primaryDetail: string | null
): TournamentActivityTimelineEvent {
  return {
    id: `audit-${row.id}`,
    title,
    detail: joinDetail([primaryDetail, formatChangedFields(row.changed_fields)]),
    occurredAt: row.occurred_at,
    category: 'setup',
    actorLabel: row.actor_display_name,
  };
}

function formatScoreTitle(action: string): string {
  switch (action) {
    case 'insert':
      return 'Score saved';
    case 'update':
      return 'Score corrected';
    case 'delete':
      return 'Score cleared';
    default:
      return 'Score changed';
  }
}

function formatSegmentTitle(row: TournamentActivityRow): string {
  if (row.action === 'update' && row.changed_fields?.includes('cpi_enabled')) {
    return row.cpi_enabled ? 'CPI enabled' : 'CPI disabled';
  }

  return `${formatAction(row.action)} segment`;
}

function formatTournamentTitle(row: TournamentActivityRow): string {
  if (row.action === 'update' && hasFinalizationFields(row.changed_fields)) {
    return row.tournament_is_complete ? 'Tournament finalized' : 'Tournament reopened';
  }

  return `${formatAction(row.action)} tournament`;
}

function hasFinalizationFields(fields: string[] | null): boolean {
  return Boolean(fields?.some((field) => field === 'is_complete' || field === 'completed_at'));
}

function formatAction(action: string): string {
  switch (action) {
    case 'insert':
      return 'Created';
    case 'update':
      return 'Updated';
    case 'delete':
      return 'Deleted';
    default:
      return 'Changed';
  }
}

function formatSegmentKind(kind: string | null): string | null {
  if (!kind) {
    return null;
  }

  return kind === 'foursomes' ? 'Foursomes' : 'Singles';
}

function formatHoleScore(row: TournamentActivityRow): string | null {
  if (row.usa_score === null && row.europe_score === null) {
    return null;
  }

  return `USA ${formatScoreValue(row.usa_score)}, EUR ${formatScoreValue(row.europe_score)}`;
}

function formatScoreValue(value: number | null): string {
  return value === null ? '-' : value.toString();
}

function formatOutcome(outcome: string | null): string | null {
  switch (outcome) {
    case 'USA':
      return 'USA won the hole';
    case 'EUROPE':
      return 'Europe won the hole';
    case 'halved':
      return 'Hole halved';
    case 'unplayed':
    case null:
      return null;
    default:
      return null;
  }
}

function formatChangedFields(fields: string[] | null): string | null {
  if (!fields?.length) {
    return null;
  }

  const formatted = fields.slice(0, 4).map((field) => field.replace(/_/g, ' '));
  const suffix = fields.length > formatted.length ? ` +${fields.length - formatted.length} more` : '';

  return `Changed ${formatted.join(', ')}${suffix}`;
}

function joinDetail(values: Array<string | null>): string {
  const detail = values.filter((value): value is string => Boolean(value?.trim())).join(' - ');

  return detail || 'Activity recorded';
}

function getSegmentLabel(segment: SegmentView): string {
  return segment.name ?? `${formatSegmentKind(segment.kind) ?? 'Match'} ${segment.sort_order + 1}`;
}

function getEarliestScore(scores: HoleScoreView[]): HoleScoreView {
  return scores.reduce((earliest, score) =>
    new Date(score.created_at).getTime() < new Date(earliest.created_at).getTime() ? score : earliest
  );
}

function isTimelineEvent(
  event: TournamentActivityTimelineEvent | null
): event is TournamentActivityTimelineEvent {
  return event !== null;
}
