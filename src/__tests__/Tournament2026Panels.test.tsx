import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_NEWSROOM_ARTIFACT_KINDS } from '../features/tournament2026/aiOverview';
import { AdminSetupSection } from '../features/tournament2026/components/AdminSetupSection';
import { LeaderboardSection } from '../features/tournament2026/components/LeaderboardSection';
import { PlayerAiOverview } from '../features/tournament2026/components/PlayerAiOverview';
import { TournamentActivitySection } from '../features/tournament2026/components/TournamentActivitySection';
import {
  generateAiNewsroomArtifacts,
  generatePlayerAiOverview,
  generateTournamentAiOverview,
} from '../services/aiOverviewService';
import type {
  AiNewsroomArtifactRow,
  AiPlayerOverviewRow,
  AiTournamentOverviewRow,
  FixtureView,
  PlayerRow,
  PlayerTournamentStatsRow,
  ProfileRow,
  TournamentActivityRow,
  Tournament2026Data,
  TournamentRow,
} from '../services/tournament2026Queries';
import { track2026 } from '../utils/analytics';

vi.mock('../services/aiOverviewService', () => ({
  generateAiNewsroomArtifacts: vi.fn().mockResolvedValue([]),
  generatePlayerAiOverview: vi.fn().mockResolvedValue({}),
  generateTournamentAiOverview: vi.fn().mockResolvedValue({}),
}));

vi.mock('../features/tournament2026/components/LiveTournamentProgressChart', () => ({
  LiveTournamentProgressChart: () => <div>Mock score chart</div>,
}));

vi.mock('../utils/analytics', () => ({
  track2026: vi.fn(),
}));

describe('2026 leaderboard panel', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders live totals, fixture progress, and segment match statuses without triggering fresh AI when artifacts are current', () => {
    const { container } = render(
      <LeaderboardSection
        tournament={tournament}
        fixtures={[fixture]}
        players={players}
        courseHoles={[]}
        aiTournamentOverview={tournamentOverview}
        aiNewsroomArtifacts={newsroomArtifacts}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);

    expect(view.getByText('Live Leaderboard')).toBeInTheDocument();
    expect(view.getByText('Overall')).toBeInTheDocument();
    expect(view.getByText('Foursomes')).toBeInTheDocument();
    expect(view.getByText('Singles')).toBeInTheDocument();
    expect(view.getByText('Group 1')).toBeInTheDocument();
    expect(view.getByText('4/5 holes · 80%')).toBeInTheDocument();
    expect(view.getByText('Front 9: Match halved')).toBeInTheDocument();
    expect(view.getByText('Singles A: All square')).toBeInTheDocument();
    expect(view.getByText('Captain note')).toBeInTheDocument();
    expect(view.getByText('Highlights Commentary')).toBeInTheDocument();
    expect(generateTournamentAiOverview).not.toHaveBeenCalled();
    expect(generateAiNewsroomArtifacts).not.toHaveBeenCalled();
  });

  it('lets secondary leaderboard sections collapse and reopen', () => {
    const { container } = render(
      <LeaderboardSection
        tournament={tournament}
        fixtures={[fixture]}
        players={players}
        courseHoles={[]}
        aiTournamentOverview={tournamentOverview}
        aiNewsroomArtifacts={newsroomArtifacts}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    const scoreStorySummary = view.getByText('Score Story').closest('summary');
    const scoreStoryDetails = scoreStorySummary?.closest('details');

    expect(scoreStorySummary).not.toBeNull();
    expect(scoreStoryDetails).toHaveAttribute('open');

    fireEvent.click(scoreStorySummary!);

    expect(scoreStoryDetails).not.toHaveAttribute('open');

    fireEvent.click(scoreStorySummary!);

    expect(scoreStoryDetails).toHaveAttribute('open');
  });

  it('generates missing AI leaderboard artifacts and refreshes data after service success', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    vi.mocked(generateTournamentAiOverview).mockResolvedValueOnce(tournamentOverview);
    vi.mocked(generateAiNewsroomArtifacts).mockResolvedValueOnce(newsroomArtifacts);

    render(
      <LeaderboardSection
        tournament={tournament}
        fixtures={[]}
        players={players}
        courseHoles={[]}
        aiTournamentOverview={null}
        aiNewsroomArtifacts={[]}
        onSaved={onSaved}
      />
    );

    await waitFor(() => {
      expect(generateTournamentAiOverview).toHaveBeenCalledWith(
        expect.objectContaining({
          tournamentId: 'tournament-1',
          sourceHoleScoreCount: 0,
        })
      );
      expect(generateAiNewsroomArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({ tournamentId: 'tournament-1' })
      );
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2));
    expect(track2026).toHaveBeenCalledWith(
      'ai_tournament_overview_generated',
      expect.objectContaining({ tournament_id: 'tournament-1', trigger: 'initial' })
    );
    expect(track2026).toHaveBeenCalledWith(
      'ai_newsroom_generated',
      expect.objectContaining({ tournament_id: 'tournament-1', trigger: 'initial' })
    );
  });
});

describe('2026 tournament activity panel', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a clear empty state when there are no audit rows or match milestones', () => {
    const { container } = render(<TournamentActivitySection activity={[]} fixtures={[]} />);
    const view = within(container);

    expect(view.getByText('0 events')).toBeInTheDocument();
    expect(
      view.getByText('No tournament activity yet. Saved scores and setup changes will appear here.')
    ).toBeInTheDocument();
  });

  it('shows the latest 20 events first and expands older activity on demand', () => {
    const { container } = render(<TournamentActivitySection activity={createActivityRows(25)} fixtures={[]} />);
    const view = within(container);

    expect(view.getByText('25 events')).toBeInTheDocument();
    expect(view.getByText('By User 0')).toBeInTheDocument();
    expect(view.queryByText('By User 24')).not.toBeInTheDocument();

    fireEvent.click(view.getByText('Show all 25 events (5 older)'));

    expect(view.getByText('By User 24')).toBeInTheDocument();
    expect(track2026).toHaveBeenCalledWith('tournament_activity_view_toggled', {
      is_showing_all: true,
      event_count: 25,
    });
  });
});

describe('2026 player AI overview panel', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders existing overview copy and hides generation controls for read-only contexts', () => {
    const { container } = render(
      <PlayerAiOverview
        player={players[0]}
        playerStats={playerStats}
        overview={playerOverview}
        canRegenerate={false}
        source="history_popover"
      />
    );
    const view = within(container);

    expect(view.getByText('Clinical singles menace.')).toBeInTheDocument();
    expect(view.queryByText('Regenerate')).not.toBeInTheDocument();
    expect(view.queryByLabelText('Optional direction')).not.toBeInTheDocument();
  });

  it('sends custom direction to the AI service and refreshes saved data', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    vi.mocked(generatePlayerAiOverview).mockResolvedValueOnce(playerOverview);

    const { container } = render(
      <PlayerAiOverview
        player={players[0]}
        playerStats={playerStats}
        overview={null}
        canRegenerate
        source="profile"
        onSaved={onSaved}
      />
    );
    const view = within(container);

    fireEvent.change(view.getByLabelText('Optional direction'), {
      target: { value: 'Mention the back-nine CPI jump.' },
    });
    fireEvent.click(view.getByText('Generate'));

    await waitFor(() =>
      expect(generatePlayerAiOverview).toHaveBeenCalledWith({
        playerId: 'player-1',
        context: {
          player: {
            id: 'player-1',
            name: 'Ian',
            team: 'USA',
            currentCpi: 88,
            customEmoji: ':horse:',
          },
          history: [
            {
              year: 2026,
              source: 'app',
              singlesHolesPlayed: 9,
              singlesStrokes: 42,
              singlesAverage: 4.67,
              holesWon: 5,
              holesHalved: 1,
              cpiAfter: 84,
            },
          ],
        },
        customPrompt: 'Mention the back-nine CPI jump.',
      })
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText('Optional direction')).toHaveValue('');
    expect(track2026).toHaveBeenCalledWith('ai_player_overview_generated', {
      player_id: 'player-1',
      source: 'profile',
      was_regeneration: false,
      has_custom_prompt: true,
    });
  });

  it('surfaces AI generation errors without calling the saved callback', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    vi.mocked(generatePlayerAiOverview).mockRejectedValueOnce(new Error('AI booth is offline'));

    const { container } = render(
      <PlayerAiOverview
        player={players[0]}
        playerStats={playerStats}
        overview={playerOverview}
        canRegenerate
        source="profile"
        onSaved={onSaved}
      />
    );
    const view = within(container);

    fireEvent.click(view.getByText('Regenerate'));

    expect(await view.findByText('AI booth is offline')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(track2026).toHaveBeenCalledWith('ai_player_overview_failed', {
      player_id: 'player-1',
      source: 'profile',
      was_regeneration: true,
      has_custom_prompt: false,
      error: 'AI booth is offline',
    });
  });
});

describe('2026 admin setup panel', () => {
  it('renders a flat collapsed operations list by default', () => {
    const { container } = render(<AdminSetupSection data={adminData} onSaved={vi.fn()} />);
    const view = within(container);
    const taskRows = Array.from(container.querySelectorAll('section[aria-labelledby="admin-title"] > div > details'));

    expect(view.getByText('Admin')).toBeInTheDocument();
    expect(view.getByText('Tournament operations')).toBeInTheDocument();
    expect(taskRows).toHaveLength(6);
    expect(container.querySelectorAll('section[aria-labelledby="admin-title"] > div > details[open]')).toHaveLength(0);
    expect(taskRows.map((row) => row.querySelector('h3')?.textContent)).toEqual([
      'Tournament',
      'Players',
      'Fixtures',
      'Course',
      'Activity',
      'Corrections',
    ]);
  });
});

const tournament = {
  id: 'tournament-1',
  name: 'Ruff Ryders Cup 2026',
  year: 2026,
} as TournamentRow;

const players = [
  {
    id: 'player-1',
    name: 'Ian',
    team: 'USA',
    current_cpi: 88,
    custom_emoji: ':horse:',
  },
  {
    id: 'player-2',
    name: 'Tom',
    team: 'EUROPE',
    current_cpi: 78,
    custom_emoji: null,
  },
] as PlayerRow[];

const fixture = {
  id: 'fixture-1',
  name: 'Group 1',
  sort_order: 0,
  participants: [],
  segments: [
    {
      id: 'segment-front',
      name: 'Front 9',
      kind: 'foursomes',
      hole_start: 1,
      hole_end: 2,
      sort_order: 0,
      players: [],
      holeScores: [
        createHoleScore('score-1', 1, 'USA', '2026-05-03T08:00:00.000Z'),
        createHoleScore('score-2', 2, 'EUROPE', '2026-05-03T08:05:00.000Z'),
      ],
    },
    {
      id: 'segment-singles',
      name: 'Singles A',
      kind: 'singles',
      hole_start: 10,
      hole_end: 12,
      sort_order: 1,
      players: [],
      holeScores: [
        createHoleScore('score-3', 10, 'USA', '2026-05-03T08:10:00.000Z'),
        createHoleScore('score-4', 11, 'EUROPE', '2026-05-03T08:15:00.000Z'),
      ],
    },
  ],
} as unknown as FixtureView;

const tournamentOverview = {
  id: 'overview-1',
  tournament_id: 'tournament-1',
  overview_markdown: 'Captain note',
  source_hole_score_count: 4,
  generated_at: '2026-05-03T08:20:00.000Z',
} as AiTournamentOverviewRow;

const newsroomArtifacts = AI_NEWSROOM_ARTIFACT_KINDS.map((kind, index) => ({
  id: `artifact-${kind}`,
  tournament_id: 'tournament-1',
  kind,
  title: titleize(kind),
  body_markdown: `Body ${index + 1}`,
  source_hole_score_count: 4,
  generated_at: '2026-05-03T08:20:00.000Z',
})) as AiNewsroomArtifactRow[];

const playerStats = [
  {
    player_id: 'player-1',
    completion_year: 2026,
    source: 'app',
    singles_holes_played: 9,
    singles_strokes: 42,
    singles_average: 4.67,
    holes_won: 5,
    holes_halved: 1,
    cpi_after: 84,
  },
] as PlayerTournamentStatsRow[];

const playerOverview = {
  id: 'player-overview-1',
  player_id: 'player-1',
  overview_markdown: 'Clinical singles menace.',
  generated_at: '2026-05-03T08:20:00.000Z',
} as AiPlayerOverviewRow;

const adminProfile = {
  id: 'profile-admin',
  user_id: 'user-admin',
  email: 'admin@ruffryder.golf',
  display_name: 'Admin',
  custom_emoji: null,
  is_admin: true,
  linked_player_id: null,
  team: null,
  firebase_uid: null,
  access_disabled_at: null,
  access_disabled_by: null,
  access_disabled_reason: null,
  created_at: '2026-05-03T08:00:00.000Z',
  updated_at: '2026-05-03T08:00:00.000Z',
} as ProfileRow;

const adminData = {
  user: null,
  profile: adminProfile,
  profiles: [],
  tournaments: [],
  players: [],
  playerStats: [],
  aiPlayerOverviews: [],
  aiTournamentOverview: null,
  aiNewsroomArtifacts: [],
  auditLogs: [],
  activity: [],
  courseHoles: [],
  activeTournament: null,
  fixtures: [],
  history: [],
} as Tournament2026Data;

function createHoleScore(
  id: string,
  holeNumber: number,
  outcome: 'USA' | 'EUROPE' | 'halved' | 'unplayed',
  updatedAt: string
) {
  return {
    id,
    hole_number: holeNumber,
    outcome,
    usa_score: outcome === 'unplayed' ? null : 4,
    europe_score: outcome === 'unplayed' ? null : 5,
    created_at: updatedAt,
    updated_at: updatedAt,
    updatedByProfile: { id: 'profile-1', display_name: 'Ian' },
  };
}

function createActivityRows(count: number): TournamentActivityRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `activity-${index}`,
    table_name: 'profiles',
    action: 'update',
    changed_fields: ['display_name'],
    occurred_at: new Date(Date.UTC(2026, 4, 3, 12, 0, 0) - index * 1000).toISOString(),
    actor_display_name: `User ${index}`,
    fixture_name: null,
    segment_name: null,
    segment_kind: null,
    hole_number: null,
    usa_score: null,
    europe_score: null,
    outcome: null,
    player_name: null,
    cpi_enabled: null,
    tournament_is_complete: null,
  })) as TournamentActivityRow[];
}

function titleize(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
