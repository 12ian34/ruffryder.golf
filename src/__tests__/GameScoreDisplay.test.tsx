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
        strokePlayScore: {
          USA: 70,
          EUROPE: 75,
          adjustedUSA: 70,
          adjustedEUROPE: 75
        }
      };
      const { container } = render(<GameScoreDisplay game={winningGame} useHandicaps={false} />);
      
      expect(container.querySelector('[data-testid="stroke-play-usa"]')).toHaveClass('text-green-500');
      expect(container.querySelector('[data-testid="stroke-play-europe"]')).not.toHaveClass('text-green-500');
    });

    it('should show green color for winning team in match play', () => {
      const winningGame = {
        ...mockGame,
        matchPlayScore: {
          USA: 3,
          EUROPE: 1,
          adjustedUSA: 3,
          adjustedEUROPE: 1
        }
      };
      const { container } = render(<GameScoreDisplay game={winningGame} useHandicaps={false} />);
      
      expect(container.querySelector('[data-testid="match-play-usa"]')).toHaveClass('text-green-500');
      expect(container.querySelector('[data-testid="match-play-europe"]')).not.toHaveClass('text-green-500');
    });
  });
}); 