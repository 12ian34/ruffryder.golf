import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArchiveSection } from '../features/tournament2026/components/HistorySection';
import type {
  LegacyTournamentView,
  PlayerRow,
  PlayerTournamentStatsRow,
} from '../services/tournament2026Queries';

describe('ArchiveSection', () => {
  it('shows migrated annual player scores without misleading 0-hole totals', () => {
    const { container } = render(
      <ArchiveSection history={[]} players={players} playerStats={playerStats} />
    );
    const view = within(container);

    fireEvent.click(view.getByText('Players'));

    expect(view.getByText('Score 84')).toBeInTheDocument();
    expect(view.getByText('Score 68')).toBeInTheDocument();
    expect(view.queryByText('0/0')).not.toBeInTheDocument();
    expect(view.queryByText('68/0')).not.toBeInTheDocument();
  });

  it('keeps tournament archive separate from player archive', () => {
    const { container } = render(
      <ArchiveSection history={history} players={players} playerStats={[]} />
    );
    const view = within(container);

    expect(view.getByText('Ruff Ryder XII')).toBeInTheDocument();
    expect(view.getByText('15 games')).toBeInTheDocument();

    fireEvent.click(view.getByText('Players'));

    expect(view.queryByText('Ruff Ryder XII')).not.toBeInTheDocument();
    expect(view.getByText('No player stat rows have been saved yet.')).toBeInTheDocument();
  });
});

const players = [
  { id: 'player-1', name: 'Tom', team: 'USA', current_cpi: 84 },
  { id: 'player-2', name: 'Dan', team: 'EUROPE', current_cpi: 68 },
] as PlayerRow[];

const playerStats = [
  {
    id: 'stat-1',
    player_id: 'player-1',
    tournament_id: null,
    source: 'migrated_firestore',
    completion_year: 2024,
    singles_holes_played: 0,
    singles_strokes: 0,
    singles_average: null,
    holes_won: 0,
    holes_halved: 0,
    cpi_after: 84,
    legacy_payload: { score: 84, year: 2024 },
    completed_at: '2025-06-09T08:57:35.018Z',
    created_at: '2025-06-09T08:57:35.018Z',
  },
  {
    id: 'stat-2',
    player_id: 'player-2',
    tournament_id: null,
    source: 'migrated_firestore',
    completion_year: 2025,
    singles_holes_played: 0,
    singles_strokes: 68,
    singles_average: null,
    holes_won: 8,
    holes_halved: 0,
    cpi_after: 68,
    legacy_payload: { score: 68, year: 2025 },
    completed_at: '2025-06-09T08:57:35.018Z',
    created_at: '2025-06-09T08:57:35.018Z',
  },
] as PlayerTournamentStatsRow[];

const history = [
  {
    id: 'legacy-1',
    legacy_firebase_id: 'firebase-1',
    name: 'Ruff Ryder XII',
    year: 2025,
    total_raw_usa: 10,
    total_raw_europe: 20,
    total_legacy_adjusted_usa: 12,
    total_legacy_adjusted_europe: 18,
    projected_raw_usa: 10,
    projected_raw_europe: 20,
    projected_legacy_adjusted_usa: 12,
    projected_legacy_adjusted_europe: 18,
    legacy_handicap_method: 'legacy_add_strokes_to_opponent',
    is_complete: true,
    completed_at: '2025-06-09T08:57:35.018Z',
    source_payload: {},
    created_at: '2025-06-09T08:57:35.018Z',
    updated_at: '2025-06-09T08:57:35.018Z',
    games: Array.from({ length: 15 }, (_, index) => ({
      id: `game-${index}`,
      legacy_tournament_id: 'legacy-1',
      legacy_firebase_id: `firebase-game-${index}`,
      usa_player_legacy_id: null,
      europe_player_legacy_id: null,
      usa_player_id: null,
      europe_player_id: null,
      usa_player_name: 'Tom',
      europe_player_name: 'Dan',
      status: 'complete',
      use_legacy_handicap: false,
      legacy_handicap_strokes: 0,
      legacy_higher_handicap_team: null,
      stroke_raw_usa: 70,
      stroke_raw_europe: 72,
      stroke_legacy_adjusted_usa: 70,
      stroke_legacy_adjusted_europe: 72,
      match_raw_usa: 10,
      match_raw_europe: 8,
      match_legacy_adjusted_usa: 10,
      match_legacy_adjusted_europe: 8,
      points_raw_usa: 2,
      points_raw_europe: 0,
      points_legacy_adjusted_usa: 2,
      points_legacy_adjusted_europe: 0,
      holes: [],
      source_payload: {},
      created_at: '2025-06-09T08:57:35.018Z',
      updated_at: '2025-06-09T08:57:35.018Z',
    })),
  },
] as LegacyTournamentView[];
