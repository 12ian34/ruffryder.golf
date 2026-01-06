import { describe, it, expect } from 'vitest';
import {
  findMostStrokesOnHole,
  findHoleInOnes,
  findAllBirdies,
  findParsByTier3Players,
  findGrindMatches,
  findUpsetAlerts,
  generateFunFacts,
  AnalyzableTournamentData,
} from '../utils/statsAnalysis';
import type { Game, HoleScore } from '../types/game';
import type { Player } from '../types/player';
import type { Tournament } from '../types/tournament';

// Helper to create a basic hole score
function createHoleScore(
  holeNumber: number,
  usaScore: number | null,
  europeScore: number | null,
  options: Partial<HoleScore> = {}
): HoleScore {
  return {
    holeNumber,
    strokeIndex: holeNumber,
    parScore: 3,
    usaPlayerScore: usaScore,
    europePlayerScore: europeScore,
    usaPlayerAdjustedScore: usaScore,
    europePlayerAdjustedScore: europeScore,
    usaPlayerMatchPlayScore: usaScore !== null && europeScore !== null 
      ? (usaScore < europeScore ? 1 : usaScore > europeScore ? 0 : 0)
      : 0,
    europePlayerMatchPlayScore: usaScore !== null && europeScore !== null 
      ? (europeScore < usaScore ? 1 : europeScore > usaScore ? 0 : 0)
      : 0,
    usaPlayerMatchPlayAdjustedScore: 0,
    europePlayerMatchPlayAdjustedScore: 0,
    ...options,
  };
}

// Helper to create a basic game
function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'game1',
    tournamentId: 'tournament1',
    usaPlayerId: 'usa1',
    usaPlayerName: 'USA Player',
    europePlayerId: 'europe1',
    europePlayerName: 'Europe Player',
    handicapStrokes: 0,
    higherHandicapTeam: 'USA',
    holes: Array(18).fill(null).map((_, i) => createHoleScore(i + 1, 4, 4)),
    strokePlayScore: { USA: 72, EUROPE: 72, adjustedUSA: 72, adjustedEUROPE: 72 },
    matchPlayScore: { USA: 0, EUROPE: 0, adjustedUSA: 0, adjustedEUROPE: 0 },
    points: { raw: { USA: 1, EUROPE: 1 }, adjusted: { USA: 1, EUROPE: 1 } },
    isComplete: true,
    isStarted: true,
    playerIds: ['usa1', 'europe1'],
    status: 'complete',
    ...overrides,
  };
}

// Helper to create a basic player
function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player1',
    name: 'Test Player',
    team: 'USA',
    historicalScores: [],
    ...overrides,
  };
}

// Helper to create a basic tournament
function createTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'tournament1',
    name: 'Test Tournament',
    year: 2024,
    isActive: true,
    useHandicaps: true,
    teamConfig: 'USA_VS_EUROPE',
    handicapStrokes: 0,
    higherHandicapTeam: 'USA',
    totalScore: { raw: { USA: 0, EUROPE: 0 }, adjusted: { USA: 0, EUROPE: 0 } },
    projectedScore: { raw: { USA: 0, EUROPE: 0 }, adjusted: { USA: 0, EUROPE: 0 } },
    progress: [],
    matchups: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create analyzable data
function createAnalyzableData(
  games: Game[] = [],
  players: Player[] = [],
  tournament: Partial<Tournament> = {}
): AnalyzableTournamentData {
  return {
    tournamentInfo: createTournament(tournament),
    games,
    players,
  };
}

describe('statsAnalysis', () => {
  describe('findMostStrokesOnHole', () => {
    it('returns null for empty data', () => {
      const result = findMostStrokesOnHole(createAnalyzableData());
      expect(result).toBeNull();
    });

    it('returns null when no games exist', () => {
      const data = createAnalyzableData([], [createPlayer()]);
      expect(findMostStrokesOnHole(data)).toBeNull();
    });

    it('returns null when max strokes is below threshold (< 6)', () => {
      const holes = Array(18).fill(null).map((_, i) => createHoleScore(i + 1, 5, 5));
      const game = createGame({ holes });
      const player = createPlayer({ id: 'usa1', name: 'Test USA' });
      const data = createAnalyzableData([game], [player]);
      
      expect(findMostStrokesOnHole(data)).toBeNull();
    });

    it('returns blow up alert when score >= 6', () => {
      const holes = Array(18).fill(null).map((_, i) => 
        i === 4 ? createHoleScore(5, 8, 4) : createHoleScore(i + 1, 4, 4)
      );
      const game = createGame({ holes });
      const player = createPlayer({ id: 'usa1', name: 'John' });
      const data = createAnalyzableData([game], [player]);
      
      const result = findMostStrokesOnHole(data);
      expect(result).toContain('BLOW UP ALERT');
      expect(result).toContain('John');
      expect(result).toContain('8 strokes');
      expect(result).toContain('hole 5');
    });

    it('finds worst score across multiple games', () => {
      const holes1 = Array(18).fill(null).map((_, i) => createHoleScore(i + 1, 6, 4));
      const holes2 = Array(18).fill(null).map((_, i) => 
        i === 0 ? createHoleScore(1, 4, 10) : createHoleScore(i + 1, 4, 4)
      );
      const game1 = createGame({ id: 'g1', holes: holes1 });
      const game2 = createGame({ id: 'g2', holes: holes2 });
      const players = [
        createPlayer({ id: 'usa1', name: 'USA Guy' }),
        createPlayer({ id: 'europe1', name: 'Europe Guy' }),
      ];
      const data = createAnalyzableData([game1, game2], players);
      
      const result = findMostStrokesOnHole(data);
      expect(result).toContain('10 strokes');
      expect(result).toContain('Europe Guy');
    });
  });

  describe('findHoleInOnes', () => {
    it('returns empty array for empty data', () => {
      const result = findHoleInOnes(createAnalyzableData());
      expect(result).toEqual([]);
    });

    it('returns empty array when no hole-in-ones exist', () => {
      const holes = Array(18).fill(null).map((_, i) => createHoleScore(i + 1, 3, 3));
      const game = createGame({ holes });
      const player = createPlayer({ id: 'usa1' });
      const data = createAnalyzableData([game], [player]);
      
      expect(findHoleInOnes(data)).toEqual([]);
    });

    it('detects a hole-in-one', () => {
      const holes = Array(18).fill(null).map((_, i) => 
        i === 6 ? createHoleScore(7, 1, 4) : createHoleScore(i + 1, 4, 4)
      );
      const game = createGame({ holes });
      const player = createPlayer({ id: 'usa1', name: 'Ace Master' });
      const data = createAnalyzableData([game], [player]);
      
      const result = findHoleInOnes(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('HOLE-IN-ONE');
      expect(result[0]).toContain('Ace Master');
      expect(result[0]).toContain('hole 7');
    });

    it('detects multiple hole-in-ones', () => {
      const holes = Array(18).fill(null).map((_, i) => {
        if (i === 2) return createHoleScore(3, 1, 4);
        if (i === 10) return createHoleScore(11, 4, 1);
        return createHoleScore(i + 1, 4, 4);
      });
      const game = createGame({ holes });
      const players = [
        createPlayer({ id: 'usa1', name: 'USA Ace' }),
        createPlayer({ id: 'europe1', name: 'Euro Ace' }),
      ];
      const data = createAnalyzableData([game], players);
      
      const result = findHoleInOnes(data);
      expect(result).toHaveLength(2);
    });

    it('does not count score of 1 on par 1 hole as hole-in-one', () => {
      const holes = Array(18).fill(null).map((_, i) => 
        createHoleScore(i + 1, 1, 1, { parScore: 1 })
      );
      const game = createGame({ holes });
      const player = createPlayer({ id: 'usa1' });
      const data = createAnalyzableData([game], [player]);
      
      expect(findHoleInOnes(data)).toEqual([]);
    });
  });

  describe('findAllBirdies', () => {
    it('returns empty array for empty data', () => {
      const result = findAllBirdies(createAnalyzableData());
      expect(result).toEqual([]);
    });

    it('detects birdies (score of 2 on par 3)', () => {
      const holes = Array(18).fill(null).map((_, i) => 
        i === 0 ? createHoleScore(1, 2, 4) : createHoleScore(i + 1, 4, 4)
      );
      const game = createGame({ holes });
      const player = createPlayer({ id: 'usa1', name: 'Birdie King' });
      const data = createAnalyzableData([game], [player]);
      
      const result = findAllBirdies(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('BIRDIE');
      expect(result[0]).toContain('Birdie King');
      expect(result[0]).toContain('hole 1');
    });

    it('counts birdies from both players', () => {
      const holes = Array(18).fill(null).map((_, i) => {
        if (i === 0) return createHoleScore(1, 2, 4);
        if (i === 5) return createHoleScore(6, 4, 2);
        return createHoleScore(i + 1, 4, 4);
      });
      const game = createGame({ holes });
      const players = [
        createPlayer({ id: 'usa1', name: 'USA Bird' }),
        createPlayer({ id: 'europe1', name: 'Euro Bird' }),
      ];
      const data = createAnalyzableData([game], players);
      
      const result = findAllBirdies(data);
      expect(result).toHaveLength(2);
    });
  });

  describe('findParsByTier3Players', () => {
    it('returns empty array when no tier 3 players', () => {
      const holes = Array(18).fill(null).map((_, i) => createHoleScore(i + 1, 3, 3));
      const game = createGame({ holes });
      const player = createPlayer({ id: 'usa1', tier: 1 });
      const data = createAnalyzableData([game], [player]);
      
      expect(findParsByTier3Players(data)).toEqual([]);
    });

    it('detects par by tier 3 player', () => {
      const holes = Array(18).fill(null).map((_, i) => 
        i === 0 ? createHoleScore(1, 3, 5) : createHoleScore(i + 1, 5, 5)
      );
      const game = createGame({ holes });
      const player = createPlayer({ id: 'usa1', name: 'Tier3 Guy', tier: 3 });
      const data = createAnalyzableData([game], [player]);
      
      const result = findParsByTier3Players(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('TIER 3 PAR');
      expect(result[0]).toContain('Tier3 Guy');
    });

    it('ignores pars by non-tier-3 players', () => {
      const holes = Array(18).fill(null).map((_, i) => createHoleScore(i + 1, 3, 3));
      const game = createGame({ holes });
      const players = [
        createPlayer({ id: 'usa1', tier: 1 }),
        createPlayer({ id: 'europe1', tier: 2 }),
      ];
      const data = createAnalyzableData([game], players);
      
      expect(findParsByTier3Players(data)).toEqual([]);
    });
  });

  describe('findGrindMatches', () => {
    it('returns empty array for empty data', () => {
      const result = findGrindMatches(createAnalyzableData());
      expect(result).toEqual([]);
    });

    it('detects grind match with 3+ consecutive tied holes', () => {
      // Create holes where holes 1-4 are all tied (both players score 4)
      const holes = Array(18).fill(null).map((_, i) => {
        const score = i < 4 ? 4 : (i % 2 === 0 ? 3 : 5);
        return createHoleScore(i + 1, score, score, {
          usaPlayerMatchPlayScore: 0,
          europePlayerMatchPlayScore: 0,
        });
      });
      const game = createGame({ holes });
      const players = [
        createPlayer({ id: 'usa1', name: 'Grinder USA' }),
        createPlayer({ id: 'europe1', name: 'Grinder EU' }),
      ];
      const data = createAnalyzableData([game], players);
      
      const result = findGrindMatches(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('GRIND ALERT');
      expect(result[0]).toContain('Grinder USA');
      expect(result[0]).toContain('Grinder EU');
    });

    it('does not report grind match with fewer than 3 consecutive tied holes', () => {
      // Create holes where only 2 consecutive holes are tied
      const holes = Array(18).fill(null).map((_, i) => {
        if (i < 2) {
          return createHoleScore(i + 1, 4, 4, {
            usaPlayerMatchPlayScore: 0,
            europePlayerMatchPlayScore: 0,
          });
        }
        return createHoleScore(i + 1, 3, 5, {
          usaPlayerMatchPlayScore: 1,
          europePlayerMatchPlayScore: 0,
        });
      });
      const game = createGame({ holes });
      const players = [
        createPlayer({ id: 'usa1' }),
        createPlayer({ id: 'europe1' }),
      ];
      const data = createAnalyzableData([game], players);
      
      expect(findGrindMatches(data)).toEqual([]);
    });
  });

  describe('findUpsetAlerts', () => {
    it('returns empty array for empty data', () => {
      const result = findUpsetAlerts(createAnalyzableData());
      expect(result).toEqual([]);
    });

    it('returns empty array when handicaps not used', () => {
      const game = createGame({
        isComplete: true,
        useHandicaps: false,
        usaPlayerHandicap: 20,
        europePlayerHandicap: 10,
        points: { raw: { USA: 2, EUROPE: 0 }, adjusted: { USA: 2, EUROPE: 0 } },
      });
      const players = [
        createPlayer({ id: 'usa1' }),
        createPlayer({ id: 'europe1' }),
      ];
      const data = createAnalyzableData([game], players, { useHandicaps: false });
      
      expect(findUpsetAlerts(data)).toEqual([]);
    });

    it('detects upset when higher handicap player wins', () => {
      const game = createGame({
        isComplete: true,
        useHandicaps: true,
        usaPlayerHandicap: 25, // Higher handicap (underdog)
        europePlayerHandicap: 10,
        points: { raw: { USA: 2, EUROPE: 0 }, adjusted: { USA: 2, EUROPE: 0 } },
      });
      const players = [
        createPlayer({ id: 'usa1', name: 'Underdog USA' }),
        createPlayer({ id: 'europe1', name: 'Favorite EU' }),
      ];
      const data = createAnalyzableData([game], players);
      
      const result = findUpsetAlerts(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('UPSET ALERT');
      expect(result[0]).toContain('Underdog USA');
      expect(result[0]).toContain('Favorite EU');
    });

    it('does not report upset when handicap difference is small', () => {
      const game = createGame({
        isComplete: true,
        useHandicaps: true,
        usaPlayerHandicap: 12, // Only 2 strokes difference (< threshold of 3)
        europePlayerHandicap: 10,
        points: { raw: { USA: 2, EUROPE: 0 }, adjusted: { USA: 2, EUROPE: 0 } },
      });
      const players = [
        createPlayer({ id: 'usa1' }),
        createPlayer({ id: 'europe1' }),
      ];
      const data = createAnalyzableData([game], players);
      
      expect(findUpsetAlerts(data)).toEqual([]);
    });

    it('does not report upset when favorite wins', () => {
      const game = createGame({
        isComplete: true,
        useHandicaps: true,
        usaPlayerHandicap: 10, // Lower handicap (favorite)
        europePlayerHandicap: 25,
        points: { raw: { USA: 2, EUROPE: 0 }, adjusted: { USA: 2, EUROPE: 0 } },
      });
      const players = [
        createPlayer({ id: 'usa1' }),
        createPlayer({ id: 'europe1' }),
      ];
      const data = createAnalyzableData([game], players);
      
      expect(findUpsetAlerts(data)).toEqual([]);
    });
  });

  describe('generateFunFacts', () => {
    it('returns loading message for null data', () => {
      const result = generateFunFacts(null);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('loading');
    });

    it('returns loading message for empty games', () => {
      const data = createAnalyzableData([], [createPlayer()]);
      const result = generateFunFacts(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('loading');
    });

    it('returns default message when no fun facts found', () => {
      // Create alternating wins to avoid grind match detection
      const holes = Array(18).fill(null).map((_, i) => {
        const usaWins = i % 2 === 0;
        return createHoleScore(i + 1, usaWins ? 3 : 5, usaWins ? 5 : 3, {
          usaPlayerMatchPlayScore: usaWins ? 1 : 0,
          europePlayerMatchPlayScore: usaWins ? 0 : 1,
        });
      });
      const game = createGame({ holes, isComplete: false });
      const players = [
        createPlayer({ id: 'usa1', name: 'USA Player', tier: 1 }),
        createPlayer({ id: 'europe1', name: 'Europe Player', tier: 1 }),
      ];
      const data = createAnalyzableData([game], players);
      
      const result = generateFunFacts(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('No particularly wild stats');
    });

    it('aggregates multiple fun facts', () => {
      // Game with a hole-in-one and a blow-up hole
      const holes = Array(18).fill(null).map((_, i) => {
        if (i === 0) return createHoleScore(1, 1, 4); // Hole-in-one
        if (i === 5) return createHoleScore(6, 10, 4); // Blow-up
        return createHoleScore(i + 1, 4, 4);
      });
      const game = createGame({ holes });
      const players = [
        createPlayer({ id: 'usa1', name: 'Multi-stat Player' }),
        createPlayer({ id: 'europe1', name: 'Other Player' }),
      ];
      const data = createAnalyzableData([game], players);
      
      const result = generateFunFacts(data);
      expect(result.length).toBeGreaterThan(1);
      expect(result.some(f => f.includes('HOLE-IN-ONE'))).toBe(true);
      expect(result.some(f => f.includes('BLOW UP'))).toBe(true);
    });
  });
});

