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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('only shows row save actions for changed rows and can save all dirty rows', async () => {
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

    expect(view.getByText('401 yds')).toBeInTheDocument();
    expect(view.getAllByText('Par 4')).toHaveLength(2);
    expect(view.getByText('1/2')).toBeInTheDocument();
    expect(view.getByText('USA dormie 1')).toBeInTheDocument();
    expect(view.getByText('1/2 played')).toBeInTheDocument();
    expect(view.getByText(/Saved \d/)).toBeInTheDocument();
    expect(view.getByText('By Ian')).toBeInTheDocument();
    expect(view.queryByText('Save now')).not.toBeInTheDocument();
    expect(view.queryByText(/Save all/)).not.toBeInTheDocument();

    fireEvent.change(view.getAllByLabelText('USA score')[0], { target: { value: '6' } });

    expect(view.getByText('Save now')).toBeInTheDocument();
    expect(view.queryByText(/Save all/)).not.toBeInTheDocument();

    fireEvent.change(view.getAllByLabelText('Europe score')[1], { target: { value: '4' } });

    fireEvent.click(view.getByText('Save all (2)'));

    await waitFor(() => {
      expect(saveHoleScore2026).toHaveBeenCalledTimes(2);
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
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

    await act(async () => {
      vi.advanceTimersByTime(700);
      await Promise.resolve();
    });

    expect(saveHoleScore2026).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('lets admins clear one saved hole score', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
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

    fireEvent.click(view.getByText('Clear'));

    await waitFor(() => {
      expect(clearHoleScore2026).toHaveBeenCalledWith({
        tournament,
        scoreId: 'score-1',
      });
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
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
  { holeNumber: 1, yardage: 401, par: 4, strokeIndex: 3 },
  { holeNumber: 2, yardage: 388, par: 4, strokeIndex: 7 },
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

