import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArchiveSection } from '../features/tournament2026/components/HistorySection';
import { PlayerHistoryProvider } from '../features/tournament2026/components/PlayerHistory';
import type {
  LegacyTournamentView,
  PlayerRow,
  PlayerTournamentStatsRow,
} from '../services/tournament2026Queries';

describe('ArchiveSection', () => {
  it('shows migrated annual player scores without misleading 0-hole totals', () => {
    const { container } = renderArchive({ history: [], players, playerStats });
    const view = within(container);

    fireEvent.click(view.getByText('Players'));

    expect(view.getAllByText('Score')).not.toHaveLength(0);
    expect(view.getAllByText('Raw')).not.toHaveLength(0);
    expect(view.getAllByText('Handicap')).not.toHaveLength(0);
    expect(view.getAllByText('84')).not.toHaveLength(0);
    expect(view.getAllByText('68')).not.toHaveLength(0);
    expect(view.queryByText('0/0')).not.toBeInTheDocument();
    expect(view.queryByText('68/0')).not.toBeInTheDocument();
  });

  it('keeps tournament archive separate from player archive', () => {
    const { container } = renderArchive({ history, players, playerStats: [] });
    const view = within(container);

    expect(view.getByText('Ruff Ryder XII')).toBeInTheDocument();
    expect(view.getByText('15 games')).toBeInTheDocument();

    fireEvent.click(view.getByText('Players'));

    expect(view.queryByText('Ruff Ryder XII')).not.toBeInTheDocument();
    expect(view.getByText('No player stat rows have been saved yet.')).toBeInTheDocument();
  });

  it('filters player archive by team and sorts numeric columns', () => {
    const { container } = renderArchive({ history: [], players: sortPlayers, playerStats: sortPlayerStats });
    const view = within(container);

    fireEvent.click(view.getByText('Players'));
    fireEvent.click(view.getByText('2025'));

    expect(view.getByText('3 players')).toBeInTheDocument();
    expect(getPlayerArchiveRowNames(container)).toEqual(['Dan', 'Tom', 'Zoe']);

    fireEvent.click(view.getByText('🇺🇸 USA'));

    expect(view.getByText('2 players')).toBeInTheDocument();
    expect(getPlayerArchiveRowNames(container)).toEqual(['Tom', 'Zoe']);
    expect(view.queryByText('Dan')).not.toBeInTheDocument();

    fireEvent.click(view.getByText('All'));
    clickSortButton(container, 'Holes won sort');

    expect(getPlayerArchiveRowNames(container)).toEqual(['Zoe', 'Tom', 'Dan']);

    clickSortButton(container, 'Holes won desc');

    expect(getPlayerArchiveRowNames(container)).toEqual(['Dan', 'Tom', 'Zoe']);
  });

  it('opens a full player history popover from a player row', () => {
    const { container } = renderArchive({ history: [], players: sortPlayers, playerStats: fullHistoryPlayerStats });
    const view = within(container);

    fireEvent.click(view.getByText('Players'));
    fireEvent.click(view.getByText('2025'));
    clickPlayerHistoryButton(container, 'sort-player-1');

    const dialog = container.querySelector('[role="dialog"][aria-label="Tom history"]');
    expect(dialog).not.toBeNull();
    if (!dialog) {
      throw new Error('Missing Tom history dialog');
    }
    const dialogView = within(dialog as HTMLElement);

    expect(dialogView.getByText('Player history')).toBeInTheDocument();
    expect(dialogView.getByText('2025')).toBeInTheDocument();
    expect(dialogView.getByText('2024')).toBeInTheDocument();
    expect(dialogView.getAllByText('84')).not.toHaveLength(0);
    expect(dialogView.getAllByText('82')).not.toHaveLength(0);
  });
});

function renderArchive({
  history,
  players,
  playerStats,
}: {
  history: LegacyTournamentView[];
  players: PlayerRow[];
  playerStats: PlayerTournamentStatsRow[];
}) {
  return render(
    <PlayerHistoryProvider players={players} playerStats={playerStats}>
      <ArchiveSection history={history} players={players} playerStats={playerStats} />
    </PlayerHistoryProvider>
  );
}

function clickSortButton(container: HTMLElement, label: string): void {
  clickLabeledButton(container, label);
}

function clickLabeledButton(container: HTMLElement, label: string): void {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.getAttribute('aria-label')?.toLowerCase() === label.toLowerCase()
  );

  if (!button) {
    const labels = Array.from(container.querySelectorAll('button'))
      .map((candidate) => candidate.getAttribute('aria-label') ?? candidate.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(', ');
    throw new Error(`Missing sort button: ${label}. Available: ${labels}`);
  }

  fireEvent.click(button);
}

function clickPlayerHistoryButton(container: HTMLElement, playerId: string): void {
  const button = container.querySelector(`[data-player-history-trigger="${playerId}"]`);

  if (!button) {
    const triggers = Array.from(container.querySelectorAll('[data-player-history-trigger]'))
      .map((candidate) => candidate.getAttribute('data-player-history-trigger') ?? '')
      .join(', ');
    throw new Error(`Missing player history button: ${playerId}. Available: ${triggers}`);
  }

  fireEvent.click(button);
}

function getPlayerArchiveRowNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('tbody tr')).map((row) => {
    const nameCell = row.querySelector('td');
    return nameCell?.textContent?.replace(/[🇺🇸🇪🇺]/gu, '').trim() ?? '';
  });
}

const players = [
  { id: 'player-1', name: 'Tom', team: 'USA', current_cpi: 84 },
  { id: 'player-2', name: 'Dan', team: 'EUROPE', current_cpi: 68 },
] as PlayerRow[];

const sortPlayers = [
  { id: 'sort-player-1', name: 'Tom', team: 'USA', current_cpi: 84 },
  { id: 'sort-player-2', name: 'Dan', team: 'EUROPE', current_cpi: 68 },
  { id: 'sort-player-3', name: 'Zoe', team: 'USA', current_cpi: 90 },
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

const sortPlayerStats = [
  {
    id: 'sort-stat-1',
    player_id: 'sort-player-1',
    tournament_id: null,
    source: 'migrated_firestore',
    completion_year: 2025,
    singles_holes_played: 0,
    singles_strokes: 0,
    singles_average: null,
    holes_won: 0,
    holes_halved: 0,
    cpi_after: 84,
    legacy_payload: { score: 84, holesWon: 4, pointsEarned: 1 },
    completed_at: '2025-06-09T08:57:35.018Z',
    created_at: '2025-06-09T08:57:35.018Z',
  },
  {
    id: 'sort-stat-2',
    player_id: 'sort-player-2',
    tournament_id: null,
    source: 'migrated_firestore',
    completion_year: 2025,
    singles_holes_played: 0,
    singles_strokes: 0,
    singles_average: null,
    holes_won: 0,
    holes_halved: 0,
    cpi_after: 68,
    legacy_payload: { score: 68, holesWon: 1, pointsEarned: 0 },
    completed_at: '2025-06-09T08:57:35.018Z',
    created_at: '2025-06-09T08:57:35.018Z',
  },
  {
    id: 'sort-stat-3',
    player_id: 'sort-player-3',
    tournament_id: null,
    source: 'migrated_firestore',
    completion_year: 2025,
    singles_holes_played: 0,
    singles_strokes: 0,
    singles_average: null,
    holes_won: 0,
    holes_halved: 0,
    cpi_after: 90,
    legacy_payload: { score: 90, holesWon: 12, pointsEarned: 2 },
    completed_at: '2025-06-09T08:57:35.018Z',
    created_at: '2025-06-09T08:57:35.018Z',
  },
] as PlayerTournamentStatsRow[];

const fullHistoryPlayerStats = [
  {
    id: 'full-stat-1',
    player_id: 'sort-player-1',
    tournament_id: null,
    source: 'migrated_firestore',
    completion_year: 2025,
    singles_holes_played: 0,
    singles_strokes: 0,
    singles_average: null,
    holes_won: 0,
    holes_halved: 0,
    cpi_after: 84,
    legacy_payload: { score: 84, scoreAdjusted: 83, holesWon: 4, pointsEarned: 1, pointsEarnedAdjusted: 1.5 },
    completed_at: '2025-06-09T08:57:35.018Z',
    created_at: '2025-06-09T08:57:35.018Z',
  },
  {
    id: 'full-stat-2',
    player_id: 'sort-player-1',
    tournament_id: null,
    source: 'migrated_firestore',
    completion_year: 2024,
    singles_holes_played: 0,
    singles_strokes: 0,
    singles_average: null,
    holes_won: 0,
    holes_halved: 0,
    cpi_after: 82,
    legacy_payload: { score: 82, scoreAdjusted: 80, holesWon: 6, pointsEarned: 2, pointsEarnedAdjusted: 2 },
    completed_at: '2024-06-09T08:57:35.018Z',
    created_at: '2024-06-09T08:57:35.018Z',
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
