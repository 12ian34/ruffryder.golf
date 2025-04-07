import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import GameScoreDisplay from '../components/shared/GameScoreDisplay';
import type { Game } from '../types/game';

describe('GameScoreDisplay', () => {
  const mockGame: Game = {
    id: '1',
    tournamentId: '1',
    usaPlayerId: '1',
    usaPlayerName: 'USA Player',
    usaPlayerHandicap: 5,
    europePlayerId: '2',
    europePlayerName: 'Europe Player',
    europePlayerHandicap: 10,
    handicapStrokes: 5,
    higherHandicapTeam: 'EUROPE',
    holes: [],
    strokePlayScore: {
      USA: 75,
      EUROPE: 80,
      adjustedUSA: 75,
      adjustedEUROPE: 75
    },
    matchPlayScore: {
      USA: 2,
      EUROPE: 1,
      adjustedUSA: 2,
      adjustedEUROPE: 2
    },
    points: {
      raw: { USA: 1, EUROPE: 0 },
      adjusted: { USA: 1, EUROPE: 0 }
    },
    isComplete: false,
    isStarted: true,
    playerIds: ['1', '2'],
    status: 'in_progress'
  };

  describe('Score Display', () => {
    it('should display stroke play scores correctly', () => {
      const { container } = render(<GameScoreDisplay game={mockGame} useHandicaps={false} />);
      
      expect(container.querySelector('[data-testid="stroke-play-label"]')).toHaveTextContent('Stroke Play');
      expect(container.querySelector('[data-testid="stroke-play-usa"]')).toHaveTextContent('75');
      expect(container.querySelector('[data-testid="stroke-play-europe"]')).toHaveTextContent('80');
    });

    it('should display match play scores correctly', () => {
      const { container } = render(<GameScoreDisplay game={mockGame} useHandicaps={false} />);
      
      expect(container.querySelector('[data-testid="match-play-label"]')).toHaveTextContent('Match Play');
      expect(container.querySelector('[data-testid="match-play-usa"]')).toHaveTextContent('2');
      expect(container.querySelector('[data-testid="match-play-europe"]')).toHaveTextContent('1');
    });

    it('should not display scores when game has not started', () => {
      const notStartedGame = { ...mockGame, isStarted: false };
      const { container } = render(<GameScoreDisplay game={notStartedGame} useHandicaps={false} />);
      
      expect(container.querySelector('[data-testid="stroke-play-label"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="match-play-label"]')).not.toBeInTheDocument();
    });
  });

  describe('Handicap Display', () => {
    it('should show adjusted scores when useHandicaps is true', () => {
      const { container } = render(<GameScoreDisplay game={mockGame} useHandicaps={true} />);
      
      // For stroke play
      expect(container.querySelector('[data-testid="stroke-play-usa"]')).toHaveTextContent('75');
      expect(container.querySelector('[data-testid="stroke-play-europe"]')).toHaveTextContent('75');
      expect(container.querySelector('[data-testid="stroke-play-europe-original"]')).toHaveTextContent('(80)');
      
      // For match play
      expect(container.querySelector('[data-testid="match-play-usa"]')).toHaveTextContent('2');
      expect(container.querySelector('[data-testid="match-play-europe"]')).toHaveTextContent('2');
      expect(container.querySelector('[data-testid="match-play-usa-original"]')).toHaveTextContent('(2)');
    });

    it('should not show original scores when useHandicaps is false', () => {
      const { container } = render(<GameScoreDisplay game={mockGame} useHandicaps={false} />);
      
      expect(container.querySelector('[data-testid="stroke-play-europe-original"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="match-play-europe-original"]')).not.toBeInTheDocument();
    });

    it('should not show scores or colors when game has not started', () => {
      const notStartedGame = { ...mockGame, isStarted: false };
      const { container } = render(<GameScoreDisplay game={notStartedGame} useHandicaps={false} />);
      
      expect(container.querySelector('[data-testid="stroke-play-usa"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="stroke-play-europe"]')).not.toBeInTheDocument();
    });
  });

  describe('Game Status', () => {
    it('should show correct status for in-progress game', () => {
      const { container } = render(<GameScoreDisplay game={mockGame} useHandicaps={false} />);
      
      const statusElement = container.querySelector('[data-testid="game-status"]');
      expect(statusElement).toHaveTextContent('In Progress');
      expect(statusElement).toHaveTextContent('⏳');
    });

    it('should show correct status for completed game', () => {
      const completedGame = { ...mockGame, isComplete: true };
      const { container } = render(<GameScoreDisplay game={completedGame} useHandicaps={false} />);
      
      const statusElement = container.querySelector('[data-testid="game-status"]');
      expect(statusElement).toHaveTextContent('Complete');
      expect(statusElement).toHaveTextContent('✓');
    });

    it('should show correct status for not started game', () => {
      const notStartedGame = { ...mockGame, isStarted: false };
      const { container } = render(<GameScoreDisplay game={notStartedGame} useHandicaps={false} />);
      
      const statusElement = container.querySelector('[data-testid="game-status"]');
      expect(statusElement).toHaveTextContent('Not Started');
      expect(statusElement).toHaveTextContent('⏸');
    });
  });

  describe('Compact Mode', () => {
    it('should apply compact styling when compact prop is true', () => {
      const { container } = render(
        <GameScoreDisplay game={mockGame} useHandicaps={false} compact={true} />
      );
      
      expect(container.querySelector('[data-testid="game-score-display"]')).toHaveClass('space-y-2');
    });

    it('should use default spacing when compact prop is false', () => {
      const { container } = render(
        <GameScoreDisplay game={mockGame} useHandicaps={false} compact={false} />
      );
      
      expect(container.querySelector('[data-testid="game-score-display"]')).toHaveClass('space-y-3');
    });
  });

  describe('Score Colors', () => {
    it('should show green color for winning team in stroke play', () => {
      const winningGame = {
        ...mockGame,
        isStarted: true,
        strokePlayScore: {
          USA: 72,
          EUROPE: 75,
          adjustedUSA: 72,
          adjustedEUROPE: 75
        }
      };

      const { container } = render(<GameScoreDisplay game={winningGame} useHandicaps={false} />);

      expect(container.querySelector('[data-testid="stroke-play-usa"]')).toHaveClass('text-usa-500');
      expect(container.querySelector('[data-testid="stroke-play-europe"]')).not.toHaveClass('text-usa-500');
    });

    it('should show green color for winning team in match play', () => {
      const winningGame = {
        ...mockGame,
        isStarted: true,
        matchPlayScore: {
          USA: 3,
          EUROPE: 2,
          adjustedUSA: 3,
          adjustedEUROPE: 2
        }
      };

      const { container } = render(<GameScoreDisplay game={winningGame} useHandicaps={false} />);

      expect(container.querySelector('[data-testid="match-play-usa"]')).toHaveClass('text-usa-500');
      expect(container.querySelector('[data-testid="match-play-europe"]')).not.toHaveClass('text-usa-500');
    });
  });

  describe('Hole-by-Hole Display', () => {
    it('should correctly display stroke-by-stroke progression', () => {
      const gameWithHoleScores = {
        ...mockGame,
        holes: [
          {
            holeNumber: 1,
            strokeIndex: 1,
            parScore: 4,
            usaPlayerScore: 4,
            europePlayerScore: 5,
            usaPlayerAdjustedScore: 4,
            europePlayerAdjustedScore: 5,
            usaPlayerMatchPlayScore: 1,
            europePlayerMatchPlayScore: 0,
            usaPlayerMatchPlayAdjustedScore: 1,
            europePlayerMatchPlayAdjustedScore: 0,
          },
          {
            holeNumber: 2,
            strokeIndex: 2,
            parScore: 4,
            usaPlayerScore: 5,
            europePlayerScore: 4,
            usaPlayerAdjustedScore: 5,
            europePlayerAdjustedScore: 4,
            usaPlayerMatchPlayScore: 0,
            europePlayerMatchPlayScore: 1,
            usaPlayerMatchPlayAdjustedScore: 0,
            europePlayerMatchPlayAdjustedScore: 1,
          }
        ],
        strokePlayScore: {
          USA: 9,
          EUROPE: 9,
          adjustedUSA: 9,
          adjustedEUROPE: 9
        },
        matchPlayScore: {
          USA: 1,
          EUROPE: 1,
          adjustedUSA: 1,
          adjustedEUROPE: 1
        }
      };

      const { container } = render(<GameScoreDisplay game={gameWithHoleScores} useHandicaps={false} />);
      
      // Verify stroke play progression
      expect(container.querySelector('[data-testid="stroke-play-usa"]')).toHaveTextContent('9');
      expect(container.querySelector('[data-testid="stroke-play-europe"]')).toHaveTextContent('9');
      
      // Verify match play progression
      expect(container.querySelector('[data-testid="match-play-usa"]')).toHaveTextContent('1');
      expect(container.querySelector('[data-testid="match-play-europe"]')).toHaveTextContent('1');
    });

    it('should correctly display strokes when USA is higher handicap team with 10 strokes', () => {
      const gameWithUSAHandicap = {
        ...mockGame,
        handicapStrokes: 10,
        higherHandicapTeam: 'USA' as 'USA' | 'EUROPE',
        strokePlayScore: {
          USA: 10,
          EUROPE: 8,
          adjustedUSA: 8,
          adjustedEUROPE: 8
        },
        matchPlayScore: {
          USA: 0,
          EUROPE: 2,
          adjustedUSA: 1,
          adjustedEUROPE: 1
        }
      };

      const { container } = render(<GameScoreDisplay game={gameWithUSAHandicap} useHandicaps={true} />);
      
      // Verify stroke play scores show adjustment
      expect(container.querySelector('[data-testid="stroke-play-usa"]')).toHaveTextContent('8');
      expect(container.querySelector('[data-testid="stroke-play-usa-original"]')).toHaveTextContent('(10)');
      
      // Verify match play scores show adjustment
      expect(container.querySelector('[data-testid="match-play-usa"]')).toHaveTextContent('1');
      expect(container.querySelector('[data-testid="match-play-europe-original"]')).toHaveTextContent('(2)');
    });

    it('should correctly display strokes when EUROPE is higher handicap team with 36+ strokes', () => {
      const gameWithEuropeHandicap = {
        ...mockGame,
        handicapStrokes: 40,
        higherHandicapTeam: 'EUROPE' as 'USA' | 'EUROPE',
        strokePlayScore: {
          USA: 8,
          EUROPE: 12,
          adjustedUSA: 8,
          adjustedEUROPE: 6
        },
        matchPlayScore: {
          USA: 2,
          EUROPE: 0,
          adjustedUSA: 0,
          adjustedEUROPE: 2
        }
      };

      const { container } = render(<GameScoreDisplay game={gameWithEuropeHandicap} useHandicaps={true} />);
      
      // Verify stroke play scores show adjustment
      expect(container.querySelector('[data-testid="stroke-play-europe"]')).toHaveTextContent('6');
      expect(container.querySelector('[data-testid="stroke-play-europe-original"]')).toHaveTextContent('(12)');
      
      // Verify match play scores show adjustment
      expect(container.querySelector('[data-testid="match-play-europe"]')).toHaveTextContent('2');
      expect(container.querySelector('[data-testid="match-play-usa-original"]')).toHaveTextContent('(2)');
    });
  });
}); 