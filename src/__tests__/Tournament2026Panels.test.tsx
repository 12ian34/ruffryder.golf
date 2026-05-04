import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_NEWSROOM_ARTIFACT_KINDS } from '../features/tournament2026/aiOverview';
import { AdminSetupSection } from '../features/tournament2026/components/AdminSetupSection';
import { LeaderboardSection } from '../features/tournament2026/components/LeaderboardSection';
import { PlayerAiOverview } from '../features/tournament2026/components/PlayerAiOverview';
import { PlayerHistoryProvider } from '../features/tournament2026/components/PlayerHistory';
import { TournamentActivitySection } from '../features/tournament2026/components/TournamentActivitySection';
import {
  generateAiNewsroomArtifacts,
  generatePlayerAiOverview,
  generateTournamentAiOverview,
} from '../services/aiOverviewService';
import {
  clearFixtureScores2026,
  clearHoleScore2026,
  deleteFixture2026,
  fetchAuditLogExport2026,
  saveHoleScore2026,
  updateCourseHole2026,
  updateSegmentCpiEnabled,
} from '../services/tournament2026Queries';
import type {
  AiNewsroomArtifactRow,
  AiPlayerOverviewRow,
  AiTournamentOverviewRow,
  AuditLogRow,
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

vi.mock('../services/tournament2026Queries', async () => {
  const actual = await vi.importActual<typeof import('../services/tournament2026Queries')>(
    '../services/tournament2026Queries'
  );

  return {
    ...actual,
    clearFixtureScores2026: vi.fn().mockResolvedValue(undefined),
    clearHoleScore2026: vi.fn().mockResolvedValue(undefined),
    deleteFixture2026: vi.fn().mockResolvedValue(undefined),
    fetchAuditLogExport2026: vi.fn().mockResolvedValue([]),
    saveHoleScore2026: vi.fn().mockResolvedValue(undefined),
    updateCourseHole2026: vi.fn().mockResolvedValue(undefined),
    updateFixture2026: vi.fn().mockResolvedValue(undefined),
    updateSegmentCpiEnabled: vi.fn().mockResolvedValue(undefined),
  };
});

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

    expect(view.getByText('live leaderboard')).toBeInTheDocument();
    expect(view.getByText('Overall Score')).toBeInTheDocument();
    expect(view.getByText('Holes Won')).toBeInTheDocument();
    expect(view.getAllByText('Overall').length).toBeGreaterThan(0);
    expect(view.getAllByText('Foursomes').length).toBeGreaterThan(0);
    expect(view.getAllByText('Singles').length).toBeGreaterThan(0);
    expect(view.getByText('Win Pressure')).toBeInTheDocument();
    expect(view.getByText('Derived forecast from the live saved board. forecast, not fate.')).toBeInTheDocument();
    expect(view.getByText('All square with 1 hole still live.')).toBeInTheDocument();
    expect(view.getByText(/4\/5 holes · 80%/)).toBeInTheDocument();
    expect(view.getByText('Front 9: Match halved')).toBeInTheDocument();
    expect(view.getByText('Singles A: All square')).toBeInTheDocument();
    expect(view.getByText('Captain note')).toBeInTheDocument();
    expect(view.getByText('Highlights Commentary')).toBeInTheDocument();
    expect(view.getByText('Tournament Overview')).toBeInTheDocument();
    expect(view.getByText('Newsroom')).toBeInTheDocument();
    const scoreMovement = view.getByText('Score Movement').closest('details');
    expect(scoreMovement).not.toBeNull();
    expect(within(scoreMovement!).getAllByText('Ian').length).toBeGreaterThan(0);
    expect(within(scoreMovement!).getAllByText('Tom').length).toBeGreaterThan(0);
    expect(within(scoreMovement!).queryAllByText('HCP').length).toBe(0);
    expect(within(scoreMovement!).queryByText(/Group 1 H/)).not.toBeInTheDocument();
    const fixtureProgress = view.getByText('Fixture Progress').closest('details');
    expect(fixtureProgress).not.toBeNull();
    expect(within(fixtureProgress!).getAllByText('Ian').length).toBeGreaterThan(0);
    expect(within(fixtureProgress!).getAllByText('Tom').length).toBeGreaterThan(0);
    expect(within(fixtureProgress!).getAllByText('HCP').length).toBeGreaterThan(0);
    expect(within(fixtureProgress!).getByText('Group 1')).toBeInTheDocument();
    expect(view.queryByText('AI Tournament Overview')).not.toBeInTheDocument();
    expect(view.queryByText('AI Newsroom')).not.toBeInTheDocument();
    expect(generateTournamentAiOverview).not.toHaveBeenCalled();
    expect(generateAiNewsroomArtifacts).not.toHaveBeenCalled();

    fireEvent.click(within(fixtureProgress!).getByText('Fixture Progress').closest('summary') as HTMLElement);
    fireEvent.click(within(fixtureProgress!).getByRole('button', { name: 'Open Group 1 details', hidden: true }));

    const dialog = document.body.querySelector('[role="dialog"][aria-label="Group 1 fixture details"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    const dialogView = within(dialog);
    expect(dialogView.getByText('Fixture details')).toBeInTheDocument();
    expect(dialogView.getAllByText('Ian vs Tom').length).toBeGreaterThan(0);
    expect(dialogView.getByText('H12')).toBeInTheDocument();
    expect(dialogView.getByText('Unplayed')).toBeInTheDocument();
  });

  it('does not call an empty board live or all square when there is no active tournament', () => {
    const { container } = render(
      <LeaderboardSection
        tournament={null}
        fixtures={[]}
        players={players}
        courseHoles={[]}
        aiTournamentOverview={null}
        aiNewsroomArtifacts={[]}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    const header = container.querySelector('header') as HTMLElement;
    const headerView = within(header);

    expect(headerView.getByText('setup needed')).toBeInTheDocument();
    expect(headerView.getByText('no active tournament')).toBeInTheDocument();
    expect(headerView.queryByText('live')).not.toBeInTheDocument();
    expect(headerView.queryByText('All square')).not.toBeInTheDocument();
    expect(view.getByText('0 highlights')).toBeInTheDocument();
    expect(view.getByText('No wild highlights yet. Save more scores and this reel will fill in.')).toBeInTheDocument();
  });

  it('shows a not-started status before the first saved score', () => {
    const { container } = render(
      <LeaderboardSection
        tournament={tournament}
        fixtures={[unscoredFixture]}
        players={players}
        courseHoles={[]}
        aiTournamentOverview={tournamentOverview}
        aiNewsroomArtifacts={newsroomArtifacts}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    const header = container.querySelector('header') as HTMLElement;
    const headerView = within(header);

    expect(headerView.getByText('not started')).toBeInTheDocument();
    expect(headerView.getByText('awaiting first saved hole')).toBeInTheDocument();
    expect(headerView.queryByText('live')).not.toBeInTheDocument();
    expect(headerView.queryByText('All square')).not.toBeInTheDocument();
    expect(view.getByText('0 highlights')).toBeInTheDocument();
    expect(view.getByText('No wild highlights yet. Save more scores and this reel will fill in.')).toBeInTheDocument();
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
    const highlightsSummary = view.getByText('Highlights Reel').closest('summary');
    const highlightsDetails = highlightsSummary?.closest('details');

    expect(highlightsSummary).not.toBeNull();
    expect(container.querySelectorAll('details[open]')).toHaveLength(0);
    expect(highlightsDetails).not.toHaveAttribute('open');

    fireEvent.click(highlightsSummary!);

    expect(highlightsDetails).toHaveAttribute('open');

    fireEvent.click(highlightsSummary!);

    expect(highlightsDetails).not.toHaveAttribute('open');
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
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('renders a flat collapsed operations list by default', () => {
    const { container } = render(<AdminSetupSection data={adminData} onSaved={vi.fn()} />);
    const view = within(container);
    const taskRows = Array.from(container.querySelectorAll('section[aria-labelledby="admin-title"] > div > details'));

    expect(view.getByText('admin')).toBeInTheDocument();
    expect(view.getByText('tournament operations')).toBeInTheDocument();
    expect(taskRows).toHaveLength(5);
    expect(container.querySelectorAll('section[aria-labelledby="admin-title"] > div > details[open]')).toHaveLength(0);
    expect(taskRows.map((row) => row.querySelector('h3')?.textContent)).toEqual([
      'Tournament',
      'Players',
      'Fixtures',
      'Course',
      'Activity',
    ]);
  });

  it('keeps open admin task headers sticky and lets the title return to the section start', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { container } = render(<AdminSetupSection data={adminData} onSaved={vi.fn()} />);
      const playersTask = getAdminTask(container, 'Players');
      playersTask.scrollIntoView = scrollIntoView;
      const summary = playersTask.querySelector('summary') as HTMLElement;

      expect(summary).toHaveClass('sticky', 'top-0');

      fireEvent.click(summary);

      await waitFor(() => expect(within(summary).getByText('Top')).toBeInTheDocument());
      const returnButton = within(summary).getByText('Top').closest('button') as HTMLButtonElement;

      fireEvent.click(returnButton);

      expect(scrollIntoView).toHaveBeenCalledWith({
        block: 'start',
        behavior: 'smooth',
      });
      expect(playersTask.open).toBe(true);
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('shows linked profile name and email inside the player edit modal', () => {
    const linkedProfile = {
      ...adminProfile,
      id: 'profile-ian',
      email: 'ian@ruffryder.golf',
      display_name: 'Ian Login',
      linked_player_id: 'usa-1',
      team: 'USA',
    } as ProfileRow;
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          players: fixtureBuilderPlayers,
          profiles: [linkedProfile],
        }}
        onSaved={vi.fn()}
      />
    );
    openAdminTask(container, 'Players');

    const playerTask = getAdminTask(container, 'Players');
    expect(getAdminPlayerRowNames(container)).toContain('Ian');

    const ianRow = container.querySelector('[data-player-row-name="Ian"]');
    if (!ianRow) {
      throw new Error('Missing Ian player row');
    }

    fireEvent.click(ianRow);

    expect(playerTask.textContent).toContain('Ian Login');
    expect(playerTask.textContent).toContain('ian@ruffryder.golf');
  });

  it('filters and sorts the admin player roster table', () => {
    const linkedProfile = {
      ...adminProfile,
      id: 'profile-ian',
      email: 'ian@ruffryder.golf',
      display_name: 'Ian Login',
      linked_player_id: 'usa-1',
      team: 'USA',
    } as ProfileRow;
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          players: fixtureBuilderPlayers,
          profiles: [linkedProfile],
        }}
        onSaved={vi.fn()}
      />
    );
    openAdminTask(container, 'Players');
    const playerTask = getAdminTask(container, 'Players');
    const playerTaskView = within(playerTask);

    fireEvent.click(getAdminPlayerSortButton(container, 'Name'));

    expect(getAdminPlayerRowNames(container).slice(0, 3)).toEqual(['Alex', 'Ian', 'Max']);

    fireEvent.click(getAdminPlayerSortButton(container, 'Name'));

    expect(getAdminPlayerRowNames(container).slice(0, 3)).toEqual(['Tom', 'Sam', 'Reyno']);

    fireEvent.change(playerTaskView.getByLabelText('Filter roster'), { target: { value: 'ian@ruffryder.golf' } });

    expect(getAdminPlayerRowNames(container)).toEqual(['Ian']);

    fireEvent.change(playerTaskView.getByLabelText('Filter roster'), { target: { value: '' } });
    fireEvent.click(playerTaskView.getByRole('button', { name: 'Open', hidden: true }));

    expect(getAdminPlayerRowNames(container)).not.toContain('Ian');
  });

  it('edits course yardage and stroke index from tappable metadata tiles', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          courseHoles: [{ holeNumber: 1, par: 3, yardage: 124, strokeIndex: 16 }],
        }}
        onSaved={onSaved}
      />
    );
    const view = within(container);
    openAdminTask(container, 'Course');

    expect(view.getByText('H01')).toBeInTheDocument();
    expect(view.getByText('124')).toBeInTheDocument();
    expect(view.getByText('16')).toBeInTheDocument();

    fireEvent.click(view.getByRole('button', { name: 'Edit Yards', hidden: true }));
    fireEvent.change(view.getByLabelText('Yards'), { target: { value: '131' } });
    fireEvent.click(view.getByRole('button', { name: 'Done Yards', hidden: true }));
    expect(view.getByRole('button', { name: 'Edit Yards', hidden: true })).toHaveTextContent('131');

    fireEvent.click(view.getByRole('button', { name: 'Edit SI', hidden: true }));
    fireEvent.keyDown(view.getByLabelText('SI'), { key: 'Escape' });
    expect(view.getByRole('button', { name: 'Edit SI', hidden: true })).toHaveTextContent('16');

    fireEvent.click(view.getByRole('button', { name: 'Edit SI', hidden: true }));
    fireEvent.change(view.getByLabelText('SI'), { target: { value: '12' } });
    fireEvent.click(view.getByRole('button', { name: 'Save', hidden: true }));

    await waitFor(() => {
      expect(updateCourseHole2026).toHaveBeenCalledWith({
        holeNumber: 1,
        strokeIndex: 12,
        par: 3,
        yardage: 131,
      });
    });
    expect(onSaved).toHaveBeenCalled();
    expect(track2026).toHaveBeenCalledWith('course_hole_updated', { hole_number: 1 });
  });

  it('shows explicit fixture templates without auto-filling player slots', () => {
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          activeTournament: activeAdminTournament,
          players: fixtureBuilderPlayers,
        }}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    openAdminTask(container, 'Fixtures');

    expect(view.getByRole('button', { name: 'Create fixture', hidden: true })).toBeInTheDocument();
    expect(view.getByText('No fixtures have been created yet.')).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: 'Create fixture', hidden: true }));

    expect(view.getByText('2-player full 18')).toBeInTheDocument();
    expect(view.getByText('4-player standard match')).toBeInTheDocument();
    expect(view.getByText('6-player flexible match')).toBeInTheDocument();
    expect(
      view.getByText(/USA vs USA, Europe vs Europe, and USA vs Europe all work/)
    ).toBeInTheDocument();

    const usaSlotsPanel = view.getByText('USA slots').closest('div') as HTMLElement;
    const europeSlotsPanel = view.getByText('Europe slots').closest('div') as HTMLElement;
    const usaSlotSelects = within(usaSlotsPanel).getAllByLabelText(/Slot \d/);
    const europeSlotSelects = within(europeSlotsPanel).getAllByLabelText(/Slot \d/);

    expect(usaSlotSelects).toHaveLength(2);
    expect(europeSlotSelects).toHaveLength(2);
    for (const select of [...usaSlotSelects, ...europeSlotSelects]) {
      expect(select).toHaveValue('');
    }

    fireEvent.click(view.getByText('6-player flexible match'));

    expect(within(usaSlotsPanel).getAllByLabelText(/Slot \d/)).toHaveLength(3);
    expect(within(europeSlotsPanel).getAllByLabelText(/Slot \d/)).toHaveLength(3);
    expect(view.getByText('Front 9 players')).toBeInTheDocument();
    for (const select of [
      ...within(usaSlotsPanel).getAllByLabelText(/Slot \d/),
      ...within(europeSlotsPanel).getAllByLabelText(/Slot \d/),
    ]) {
      expect(select).toHaveValue('');
    }
  });

  it('hides players already assigned to the tournament and current fixture draft', () => {
    const { container } = render(
      <PlayerHistoryProvider players={fixtureBuilderPlayers} playerStats={[]}>
        <AdminSetupSection
          data={{
            ...adminData,
            activeTournament: activeAdminTournament,
            players: fixtureBuilderPlayers,
            fixtures: [fixtureWithAssignedPlayers],
          }}
          onSaved={vi.fn()}
        />
      </PlayerHistoryProvider>
    );
    const view = within(container);
    openAdminTask(container, 'Fixtures');

    expect(view.getByText('Assigned group')).toBeInTheDocument();
    const fixtureRow = view.getByText('Assigned group').closest('article') as HTMLElement;
    const fixtureRowView = within(fixtureRow);

    expect(fixtureRowView.getByText('Ian')).toBeInTheDocument();
    expect(fixtureRowView.getByText('Tom')).toBeInTheDocument();
    expect(fixtureRowView.getByText('88')).toBeInTheDocument();
    expect(fixtureRowView.getByText('78')).toBeInTheDocument();

    fireEvent.click(fixtureRowView.getByLabelText('Open Ian history'));

    expect(view.getByText('Current handicap')).toBeInTheDocument();
    expect(container.querySelector('[role="dialog"][aria-label="Ian history"]')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(view.getByRole('button', { name: 'Create fixture', hidden: true }));

    const usaSlotsPanel = view.getByText('USA slots').closest('div') as HTMLElement;
    const europeSlotsPanel = view.getByText('Europe slots').closest('div') as HTMLElement;
    const usaSlotSelects = within(usaSlotsPanel).getAllByLabelText(/Slot \d/);
    const europeSlotSelects = within(europeSlotsPanel).getAllByLabelText(/Slot \d/);

    expect(getSelectOptionValues(usaSlotSelects[0])).toEqual(['', 'usa-2', 'usa-3']);
    expect(getSelectOptionValues(europeSlotSelects[0])).toEqual(['', 'europe-2', 'europe-3']);
    expect(getSelectOptionLabels(usaSlotSelects[0])).toContain('Sam · USA · HCP 82 · Tier 2');
    expect(getSelectOptionLabels(europeSlotSelects[0])).toContain('Alex · EUROPE · HCP 84 · Tier 2');

    fireEvent.change(usaSlotSelects[0], { target: { value: 'usa-2' } });

    const updatedUsaSlotSelects = within(usaSlotsPanel).getAllByLabelText(/Slot \d/);
    expect(getSelectOptionValues(updatedUsaSlotSelects[0])).toContain('usa-2');
    expect(getSelectOptionValues(updatedUsaSlotSelects[1])).not.toContain('usa-2');
  });

  it('keeps fixture correction and CPI controls in the admin Fixtures task', () => {
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          activeTournament: activeAdminTournament,
          fixtures: [fixture],
          players: fixtureBuilderPlayers,
        }}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    openAdminTask(container, 'Fixtures');

    expect(view.getByLabelText('Fixture name')).toHaveValue('Group 1');
    expect(view.getByText('Clear scores')).toBeInTheDocument();
    expect(view.getByText('CPI enabled')).toBeInTheDocument();
    expect(view.queryByText('Corrections')).not.toBeInTheDocument();
  });

  it('shows full-18 same-team singles as side-based correction selects', () => {
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          activeTournament: activeAdminTournament,
          fixtures: [sameTeamFullCourseFixture],
          players: fixtureBuilderPlayers,
        }}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    openAdminTask(container, 'Fixtures');

    expect(view.getByText('Fixture repair')).toBeInTheDocument();
    const repairRow = view.getByText('Editing Europe mirror match').closest('.border-t') as HTMLElement;
    expect(repairRow).not.toBeNull();
    const repairView = within(repairRow);

    const sideASelect = repairView.getByLabelText('Side A');
    const sideBSelect = repairView.getByLabelText('Side B');

    expect(getSelectOptionValues(sideASelect)).toEqual(['', 'europe-1']);
    expect(getSelectOptionValues(sideBSelect)).toEqual(['', 'europe-2']);
    expect(getSelectOptionLabels(sideASelect)).toContain('Tom · EUROPE · HCP 78 · Tier 2');
    expect(getSelectOptionLabels(sideBSelect)).toContain('Alex · EUROPE · HCP 84 · Tier 2');
    expect(repairView.queryByLabelText('USA')).not.toBeInTheDocument();
  });

  it('exports the full audit log from the admin Activity task', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:audit-log'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    const originalCreateElement = document.createElement.bind(document);
    const linkClick = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);

      if (tagName.toLowerCase() === 'a') {
        Object.defineProperty(element, 'click', {
          configurable: true,
          value: linkClick,
        });
      }

      return element;
    }) as typeof document.createElement);
    vi.mocked(fetchAuditLogExport2026).mockResolvedValueOnce([auditLogRow]);

    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          auditLogs: [auditLogRow],
        }}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    openAdminTask(container, 'Activity');

    fireEvent.click(view.getByRole('button', { name: 'Export CSV', hidden: true }));

    await waitFor(() => expect(fetchAuditLogExport2026).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view.getByText('Exported 1 audit rows as CSV.')).toBeInTheDocument());
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(linkClick).toHaveBeenCalledTimes(1);
    expect(track2026).toHaveBeenCalledWith('audit_log_export_completed', {
      source: 'admin_activity',
      row_count: 1,
    });
  });

  it('requires confirmation before clearing fixture scores or deleting a fixture', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          activeTournament: activeAdminTournament,
          fixtures: [fixture],
          players,
        }}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    openAdminTask(container, 'Fixtures');

    fireEvent.click(view.getByText('Clear scores'));
    fireEvent.click(view.getByText('Delete'));

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(clearFixtureScores2026).not.toHaveBeenCalled();
    expect(deleteFixture2026).not.toHaveBeenCalled();
  });

  it('opens fixture details from the admin fixture title with edit controls', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          activeTournament: activeAdminTournament,
          fixtures: [fixture],
          players,
        }}
        onSaved={onSaved}
      />
    );
    const view = within(container);
    openAdminTask(container, 'Fixtures');

    fireEvent.click(view.getByRole('button', { name: 'Group 1', hidden: true }));

    const dialog = document.body.querySelector('[role="dialog"][aria-label="Group 1 fixture details"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    const dialogView = within(dialog);
    expect(dialogView.getByText('Admin edit')).toBeInTheDocument();
    expect(dialogView.getByLabelText('Fixture name')).toHaveValue('Group 1');
    expect(dialogView.getByText('4/5 holes - 80%')).toBeInTheDocument();

    const holeOne = dialogView.getByText('H1').parentElement?.parentElement as HTMLElement;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(within(holeOne).getByText('Clear'));

    expect(confirmSpy).toHaveBeenCalledWith('Clear score for H1? This cannot be undone.');
    expect(clearHoleScore2026).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.change(within(holeOne).getByLabelText('USA score'), { target: { value: '6' } });
    fireEvent.click(within(holeOne).getByText('Update'));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith('Update H1 to USA 6, Europe 5?');
      expect(saveHoleScore2026).toHaveBeenCalledWith(
        expect.objectContaining({
          holeNumber: 1,
          usaScore: 6,
          europeScore: 5,
          updatedBy: 'profile-admin',
        })
      );
    });

    fireEvent.click(dialogView.getByText('CPI enabled'));

    await waitFor(() => {
      expect(updateSegmentCpiEnabled).toHaveBeenCalledWith(
        expect.objectContaining({
          segment: expect.objectContaining({ id: 'segment-singles' }),
          enabled: false,
          updatedBy: 'profile-admin',
        })
      );
      expect(onSaved).toHaveBeenCalledTimes(2);
    });
  });

  it('shows tournament details read-only until edit opens the popover form', () => {
    const activeTournament = {
      id: 'tournament-1',
      name: 'Ruff Ryders Cup 2026',
      year: 2026,
      cpi_threshold: 7,
      is_active: true,
      is_complete: false,
      completed_at: null,
      created_at: '2026-05-03T08:00:00.000Z',
      updated_at: '2026-05-03T08:00:00.000Z',
    } as TournamentRow;
    const { container } = render(
      <AdminSetupSection
        data={{
          ...adminData,
          activeTournament,
          tournaments: [activeTournament],
        }}
        onSaved={vi.fn()}
      />
    );
    const view = within(container);
    const tournamentRow = container.querySelector('section[aria-labelledby="admin-title"] > div > details');

    fireEvent.click(tournamentRow?.querySelector('summary') as HTMLElement);

    expect(view.getAllByText('Ruff Ryders Cup 2026').length).toBeGreaterThan(0);
    expect(view.getAllByText(/CPI threshold 7/).length).toBeGreaterThan(0);
    expect(view.queryByLabelText('Name')).not.toBeInTheDocument();

    fireEvent.click(view.getByText('Edit'));

    expect(view.getByText('Edit Ruff Ryders Cup 2026')).toBeInTheDocument();
    expect(view.getByLabelText('Name')).toHaveValue('Ruff Ryders Cup 2026');
    expect(view.getByLabelText('CPI threshold')).toHaveValue(7);
  });
});

const tournament = {
  id: 'tournament-1',
  name: 'Ruff Ryders Cup 2026',
  year: 2026,
} as TournamentRow;

const activeAdminTournament = {
  id: 'tournament-1',
  name: 'Ruff Ryders Cup 2026',
  year: 2026,
  cpi_threshold: 7,
  is_active: true,
  is_complete: false,
  completed_at: null,
  legacy_firebase_id: null,
  created_at: '2026-05-03T08:00:00.000Z',
  updated_at: '2026-05-03T08:00:00.000Z',
} as TournamentRow;

const players = [
  { ...createPlayerRow('player-1', 'Ian', 'USA', 88), custom_emoji: ':horse:' },
  createPlayerRow('player-2', 'Tom', 'EUROPE', 78),
] as PlayerRow[];

const fixtureBuilderPlayers = [
  createPlayerRow('usa-1', 'Ian', 'USA', 88),
  createPlayerRow('usa-2', 'Sam', 'USA', 82),
  createPlayerRow('usa-3', 'Reyno', 'USA', 91),
  createPlayerRow('europe-1', 'Tom', 'EUROPE', 78),
  createPlayerRow('europe-2', 'Alex', 'EUROPE', 84),
  createPlayerRow('europe-3', 'Max', 'EUROPE', 80),
] as PlayerRow[];

const fixtureWithAssignedPlayers = {
  id: 'assigned-fixture-1',
  name: 'Assigned group',
  sort_order: 0,
  participants: [
    { player_id: 'usa-1', team: 'USA', slot: 1, player: fixtureBuilderPlayers[0] },
    { player_id: 'europe-1', team: 'EUROPE', slot: 1, player: fixtureBuilderPlayers[3] },
  ],
  segments: [],
} as unknown as FixtureView;

const sameTeamFullCourseFixture = {
  id: 'same-team-full-course',
  name: 'Europe mirror match',
  sort_order: 1,
  participants: [
    { player_id: 'europe-1', team: 'EUROPE', slot: 1, player: fixtureBuilderPlayers[3] },
    { player_id: 'europe-2', team: 'EUROPE', slot: 2, player: fixtureBuilderPlayers[4] },
  ],
  segments: [
    {
      id: 'same-team-singles',
      name: 'Singles A',
      kind: 'singles',
      hole_start: 1,
      hole_end: 18,
      sort_order: 0,
      cpi_enabled: true,
      usa_player_id: 'europe-1',
      europe_player_id: 'europe-2',
      players: [
        { player_id: 'europe-1', team: 'EUROPE', slot: 1, player: fixtureBuilderPlayers[3] },
        { player_id: 'europe-2', team: 'EUROPE', slot: 2, player: fixtureBuilderPlayers[4] },
      ],
      holeScores: [],
    },
  ],
} as unknown as FixtureView;

const fixture = {
  id: 'fixture-1',
  name: 'Group 1',
  sort_order: 0,
  participants: [
    { player_id: 'player-1', team: 'USA', slot: 1, player: players[0] },
    { player_id: 'player-2', team: 'EUROPE', slot: 1, player: players[1] },
  ],
  segments: [
    {
      id: 'segment-front',
      name: 'Front 9',
      kind: 'foursomes',
      hole_start: 1,
      hole_end: 2,
      sort_order: 0,
      cpi_enabled: false,
      players: [
        { player_id: 'player-1', team: 'USA', slot: 1, player: players[0] },
        { player_id: 'player-2', team: 'EUROPE', slot: 1, player: players[1] },
      ],
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
      cpi_enabled: true,
      usa_player_id: 'player-1',
      europe_player_id: 'player-2',
      players: [],
      holeScores: [
        createHoleScore('score-3', 10, 'USA', '2026-05-03T08:10:00.000Z'),
        createHoleScore('score-4', 11, 'EUROPE', '2026-05-03T08:15:00.000Z'),
      ],
    },
  ],
} as unknown as FixtureView;

const unscoredFixture = {
  ...fixture,
  segments: fixture.segments.map((segment) => ({ ...segment, holeScores: [] })),
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

const auditLogRow = {
  id: 'audit-1',
  action: 'update',
  table_name: 'hole_scores',
  record_id: 'score-1',
  tournament_id: 'tournament-1',
  fixture_id: 'fixture-1',
  segment_id: 'segment-1',
  hole_score_id: 'score-1',
  player_id: 'player-1',
  actor_profile_id: 'profile-admin',
  actor_player_id: null,
  actor_display_name: 'Admin',
  actor_is_admin: true,
  changed_fields: ['usa_score', 'europe_score'],
  row_before: { usa_score: 4, europe_score: 5 },
  row_after: { usa_score: 3, europe_score: 5 },
  created_at: '2026-05-03T08:00:00.000Z',
} as AuditLogRow;

function createPlayerRow(id: string, name: string, team: 'USA' | 'EUROPE', currentCpi: number): PlayerRow {
  return {
    id,
    name,
    team,
    current_cpi: currentCpi,
    tier: 2,
    custom_emoji: null,
    legacy_firebase_id: null,
    created_at: '2026-05-03T08:00:00.000Z',
    updated_at: '2026-05-03T08:00:00.000Z',
  } as PlayerRow;
}

function getSelectOptionValues(select: HTMLElement): string[] {
  return Array.from((select as HTMLSelectElement).options).map((option) => option.value);
}

function getSelectOptionLabels(select: HTMLElement): string[] {
  return Array.from((select as HTMLSelectElement).options).map((option) => option.textContent ?? '');
}

function getAdminPlayerRowNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLTableRowElement>('[data-player-row-name]')).map(
    (row) => row.dataset.playerRowName ?? ''
  );
}

function getAdminPlayerSortButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="Sort players by ${label}"]`);

  if (!button) {
    throw new Error(`Missing player sort button: ${label}`);
  }

  return button;
}

function openAdminTask(container: HTMLElement, title: string): void {
  const task = getAdminTask(container, title);

  task.open = true;
}

function getAdminTask(container: HTMLElement, title: string): HTMLDetailsElement {
  const task = Array.from(
    container.querySelectorAll<HTMLDetailsElement>('section[aria-labelledby="admin-title"] > div > details')
  ).find((details) => details.querySelector('h3')?.textContent === title);

  if (!task) {
    throw new Error(`Missing admin task: ${title}`);
  }

  return task;
}

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
