import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScoreEntrySection } from '../features/tournament2026/components/ScoreEntrySection';
import type { CourseHoleMetadata } from '../domain/2026/course';
import {
  clearHoleScore2026,
  saveHoleScore2026,
  type FixtureView,
  type PlayerRow,
  type ProfileRow,
  type TournamentRow,
} from '../services/tournament2026Queries';

vi.mock('../services/tournament2026Queries', async () => {
  const actual = await vi.importActual<typeof import('../services/tournament2026Queries')>(
    '../services/tournament2026Queries'
  );

  return {
    ...actual,
    clearHoleScore2026: vi.fn().mockResolvedValue(undefined),
    saveHoleScore2026: vi.fn().mockResolvedValue(undefined),
    updateSegmentCpiEnabled: vi.fn().mockResolvedValue(undefined),
  };
});

describe('ScoreEntrySection', () => {
  const onSaved = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('explains the no-active-tournament state with player-facing next steps', () => {
    const onViewArchive = vi.fn();
    const onViewProfile = vi.fn();
    const { container } = render(
      <ScoreEntrySection
        tournament={null}
        fixtures={[]}
        players={[]}
        courseHoles={[]}
        profile={profile}
        onViewArchive={onViewArchive}
        onViewProfile={onViewProfile}
        onSaved={onSaved}
      />
    );
    const view = within(container);

    expect(view.getByText('setup needed')).toBeInTheDocument();
    expect(view.getByText(/An admin needs to start the tournament/)).toBeInTheDocument();
    expect(view.getByText(/put your player in a fixture or game/)).toBeInTheDocument();
    expect(view.queryByText(/Create an active tournament/)).not.toBeInTheDocument();
    expect(view.getByText(/browse past tournaments in the Archive/)).toBeInTheDocument();
    expect(view.getByText(/generate your AI scouting dossier/)).toBeInTheDocument();

    fireEvent.click(view.getByText('View Archive'));
    fireEvent.click(view.getByText('Open Profile'));

    expect(onViewArchive).toHaveBeenCalledTimes(1);
    expect(onViewProfile).toHaveBeenCalledTimes(1);
  });

  it('shows played holes collapsed alongside the active hole', async () => {
    const { container } = render(
      <ScoreEntrySection
        tournament={tournament}
        fixtures={[fixture]}
        players={players}
        courseHoles={courseHoles}
        profile={profile}
        onSaved={onSaved}
      />
    );
    const view = within(container);

    expect(view.getByText('355 m')).toBeInTheDocument();
    expect(view.getByText('index')).toBeInTheDocument();
    expect(view.getByText('par')).toBeInTheDocument();
    expect(view.getByText('length')).toBeInTheDocument();
    expect(view.getByText('now hole 2')).toBeInTheDocument();
    expect(view.getByText('hole 2')).toBeInTheDocument();
    expect(view.getByText('hole 1')).toBeInTheDocument();
    expect(view.getByText('1/2')).toBeInTheDocument();
    expect(view.getByText('USA dormie 1')).toBeInTheDocument();
    expect(view.getByText('1/2 played')).toBeInTheDocument();
    expect(view.getByText(/saved \d/)).toBeInTheDocument();
    expect(view.getByText('by Ian')).toBeInTheDocument();
    expect(view.getByText('edit')).toBeInTheDocument();
    expect(view.queryByText('Save now')).not.toBeInTheDocument();
    expect(view.queryByText(/Save all/)).not.toBeInTheDocument();

    fireEvent.click(view.getAllByLabelText('Show lengths in yards')[0]);

    expect(view.getByText('388 yds')).toBeInTheDocument();

    fireEvent.change(view.getAllByLabelText('USA score')[0], { target: { value: '6' } });

    expect(view.getByText('Add both')).toBeInTheDocument();
    expect(view.queryByText(/Save all/)).not.toBeInTheDocument();

    fireEvent.change(view.getAllByLabelText('Europe score')[0], { target: { value: '4' } });
    expect(view.getByText('Save now')).toBeInTheDocument();
    fireEvent.click(view.getByText('Save now'));

    await waitFor(() => {
      expect(saveHoleScore2026).toHaveBeenCalledTimes(1);
    });
    expect(saveHoleScore2026).toHaveBeenCalledWith(
      expect.objectContaining({
        holeNumber: 2,
        usaScore: 6,
        europeScore: 4,
      })
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('opens fixture result details from the score-entry title', () => {
    const { container } = render(
      <ScoreEntrySection
        tournament={tournament}
        fixtures={[fixture]}
        players={players}
        courseHoles={courseHoles}
        profile={profile}
        onSaved={onSaved}
      />
    );
    const view = within(container);

    fireEvent.click(view.getByText('Alpha'));

    const dialog = document.body.querySelector('[role="dialog"][aria-label="Alpha fixture details"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    const dialogView = within(dialog);
    expect(dialogView.getByText('Front nine')).toBeInTheDocument();
    expect(dialogView.getByText('H2')).toBeInTheDocument();
    expect(dialogView.getByText('Unplayed')).toBeInTheDocument();
  });

  it('autosaves a complete dirty row after a short debounce', async () => {
    vi.useFakeTimers();
    const { container } = render(
      <ScoreEntrySection
        tournament={tournament}
        fixtures={[fixture]}
        players={players}
        courseHoles={courseHoles}
        profile={profile}
        onSaved={onSaved}
      />
    );
    const view = within(container);

    fireEvent.change(view.getAllByLabelText('USA score')[0], { target: { value: '6' } });
    fireEvent.change(view.getAllByLabelText('Europe score')[0], { target: { value: '5' } });

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(saveHoleScore2026).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('persists failed drafts and lets users retry all failed score rows', async () => {
    vi.useFakeTimers();
    vi.mocked(saveHoleScore2026).mockRejectedValueOnce(new Error('Network error'));
    const { container } = render(
      <ScoreEntrySection
        tournament={tournament}
        fixtures={[fixture]}
        players={players}
        courseHoles={courseHoles}
        profile={profile}
        onSaved={onSaved}
      />
    );
    const view = within(container);

    fireEvent.change(view.getAllByLabelText('USA score')[0], { target: { value: '5' } });
    fireEvent.change(view.getAllByLabelText('Europe score')[0], { target: { value: '4' } });

    expect(window.localStorage.getItem('rrc:2026:score-draft:tournament-1:segment-1:2')).toBe(
      JSON.stringify({ usaScore: '5', europeScore: '4' })
    );

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(view.getByText('1 score row failed to save')).toBeInTheDocument();
    });
    expect(view.getByText('Retry all')).toBeInTheDocument();

    vi.mocked(saveHoleScore2026).mockResolvedValueOnce(undefined);
    fireEvent.click(view.getByText('Retry all'));

    await waitFor(() => {
      expect(saveHoleScore2026).toHaveBeenCalledTimes(2);
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('rrc:2026:score-draft:tournament-1:segment-1:2')).toBeNull();
  });

  it('does not show admin correction controls in My Game', () => {
    const { container } = render(
      <ScoreEntrySection
        tournament={tournament}
        fixtures={[completedFixture]}
        players={players}
        courseHoles={courseHoles}
        profile={profile}
        onSaved={onSaved}
      />
    );
    const view = within(container);

    expect(view.getAllByText('edit').length).toBeGreaterThan(0);
    expect(view.queryByText('clear')).not.toBeInTheDocument();
    expect(view.queryByText('Disable CPI')).not.toBeInTheDocument();
    expect(clearHoleScore2026).not.toHaveBeenCalled();
  });

  it('groups concurrent back-nine singles by hole', () => {
    const { container } = render(
      <ScoreEntrySection
        tournament={tournament}
        fixtures={[groupedFixture]}
        players={groupedPlayers}
        courseHoles={[
          ...courseHoles,
          { holeNumber: 10, yardage: 150, par: 3, strokeIndex: 12 },
          { holeNumber: 11, yardage: 410, par: 3, strokeIndex: 4 },
        ]}
        profile={profile}
        onSaved={onSaved}
      />
    );
    const view = within(container);

    fireEvent.click(view.getByText('Back 9'));

    expect(view.getByText('Back 9 Singles')).toBeInTheDocument();
    expect(view.getByText('now hole 10')).toBeInTheDocument();
    expect(view.getAllByText('hole 10')).toHaveLength(1);
    expect(view.queryByText('hole 11')).not.toBeInTheDocument();
    expect(view.getByLabelText('Ian score')).toBeInTheDocument();
    expect(view.getByLabelText('Tommy score')).toBeInTheDocument();
    expect(view.getByLabelText('Sam score')).toBeInTheDocument();
    expect(view.getByLabelText('Alex score')).toBeInTheDocument();
    expect(view.getByText('CPI enabled. Ian HCP 98; Tommy HCP 78. Gap 20.')).toBeInTheDocument();
    expect(view.queryByText(/receives strokes/)).not.toBeInTheDocument();
  });
});

const tournament = {
  id: 'tournament-1',
  cpi_threshold: 7,
} as TournamentRow;

const profile = {
  id: 'profile-1',
  is_admin: true,
} as ProfileRow;

const players = [] as PlayerRow[];

const courseHoles: CourseHoleMetadata[] = [
  { holeNumber: 1, yardage: 401, par: 3, strokeIndex: 3 },
  { holeNumber: 2, yardage: 388, par: 3, strokeIndex: 7 },
];

const fixture = {
  id: 'fixture-1',
  name: 'Alpha',
  sort_order: 0,
  participants: [],
  segments: [
    {
      id: 'segment-1',
      fixture_id: 'fixture-1',
      name: 'Front nine',
      kind: 'foursomes',
      hole_start: 1,
      hole_end: 2,
      sort_order: 0,
      cpi_enabled: false,
      usa_player_id: null,
      europe_player_id: null,
      players: [],
      holeScores: [
        {
          id: 'score-1',
          segment_id: 'segment-1',
          hole_number: 1,
          usa_score: 4,
          europe_score: 5,
          usa_net_score: 4,
          europe_net_score: 5,
          outcome: 'USA',
          cpi_applied: false,
          cpi_difference: 0,
          cpi_strokes_usa: 0,
          cpi_strokes_europe: 0,
          updated_by: 'profile-1',
          updatedByProfile: { id: 'profile-1', display_name: 'Ian' },
          updated_at: '2026-05-02T20:00:00.000Z',
        },
      ],
    },
  ],
} as unknown as FixtureView;

const completedFixture = {
  ...fixture,
  segments: [
    {
      ...fixture.segments[0],
      holeScores: [
        ...fixture.segments[0].holeScores,
        {
          id: 'score-2',
          segment_id: 'segment-1',
          hole_number: 2,
          usa_score: 4,
          europe_score: 4,
          usa_net_score: 4,
          europe_net_score: 4,
          outcome: 'halved',
          cpi_applied: false,
          cpi_difference: 0,
          cpi_strokes_usa: 0,
          cpi_strokes_europe: 0,
          updated_by: 'profile-1',
          updatedByProfile: { id: 'profile-1', display_name: 'Ian' },
          updated_at: '2026-05-02T20:05:00.000Z',
        },
      ],
    },
  ],
} as unknown as FixtureView;

const groupedPlayers = [
  { id: 'player-1', name: 'Ian', team: 'USA', current_cpi: 98 },
  { id: 'player-2', name: 'Tommy', team: 'EUROPE', current_cpi: 78 },
  { id: 'player-3', name: 'Sam', team: 'USA', current_cpi: 88 },
  { id: 'player-4', name: 'Alex', team: 'EUROPE', current_cpi: 84 },
] as PlayerRow[];

const groupedFixture = {
  id: 'fixture-2',
  name: 'Back nine group',
  sort_order: 1,
  participants: [],
  segments: [
    {
      id: 'segment-front',
      fixture_id: 'fixture-2',
      name: 'Front nine',
      kind: 'foursomes',
      hole_start: 1,
      hole_end: 1,
      sort_order: 0,
      cpi_enabled: false,
      usa_player_id: null,
      europe_player_id: null,
      players: [],
      holeScores: [],
    },
    {
      id: 'segment-singles-a',
      fixture_id: 'fixture-2',
      name: 'Singles A',
      kind: 'singles',
      hole_start: 10,
      hole_end: 11,
      sort_order: 1,
      cpi_enabled: true,
      usa_player_id: 'player-1',
      europe_player_id: 'player-2',
      players: [],
      holeScores: [],
    },
    {
      id: 'segment-singles-b',
      fixture_id: 'fixture-2',
      name: 'Singles B',
      kind: 'singles',
      hole_start: 10,
      hole_end: 11,
      sort_order: 2,
      cpi_enabled: true,
      usa_player_id: 'player-3',
      europe_player_id: 'player-4',
      players: [],
      holeScores: [],
    },
  ],
} as unknown as FixtureView;
