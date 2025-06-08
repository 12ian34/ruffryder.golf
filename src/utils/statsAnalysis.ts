// src/utils/statsAnalysis.ts
import { Player } from '../types/player';
import { Game } from '../types/game';
import { Tournament } from '../types/tournament';

// This interface defines the structure of data the analysis functions will work with.
// The hook (Task 4) will be responsible for fetching and assembling this data.
export interface AnalyzableTournamentData {
  tournamentInfo: Tournament; // Basic info about the tournament itself
  games: Game[];             // All games played in this tournament
  players: Player[];         // A list of all unique players involved for easy name lookup
}

// Helper to get player name from ID
function getPlayerNameById(playerId: string, players: Player[]): string {
  const player = players.find(p => p.id === playerId);
  return player ? player.name : 'An unknown player';
}

/**
 * Finds the player who took the most strokes on a single hole in the tournament.
 */
export function findMostStrokesOnHole(data: AnalyzableTournamentData): string | null {
  let maxStrokes = 0;
  let statMessage: string | null = null;

  if (!data || !data.games || !data.players || data.games.length === 0) return null;

  data.games.forEach(game => {
    game.holes.forEach(holeScore => {
      const checkScore = (score: number | null, playerId: string) => {
        if (score !== null && score > maxStrokes) {
          maxStrokes = score;
          const playerName = getPlayerNameById(playerId, data.players);
          statMessage = `💣 BLOW UP ALERT! ${playerName} had a tough time, taking ${maxStrokes} strokes on hole ${holeScore.holeNumber}.`;
        }
      };

      checkScore(holeScore.usaPlayerScore, game.usaPlayerId);
      checkScore(holeScore.europePlayerScore, game.europePlayerId);
    });
  });
  
  // Only return if maxStrokes is significant (e.g. > par or a high number like 6+)
  // For now, let's return if any maxStrokes > 0 found and it's not just a normal high score.
  // Example: only if maxStrokes is, say, >= 6, or significantly above par.
  // This condition can be refined based on what's considered "fun" or noteworthy.
  if (maxStrokes >= 6) { // Arbitrary threshold for "fun fact" worthy blow-up hole
    return statMessage;
  }
  return null;
}

/**
 * Finds players who got a hole-in-one.
 */
export function findHoleInOnes(data: AnalyzableTournamentData): string[] {
  const holeInOneMessages: string[] = [];
  if (!data || !data.games || !data.players || data.games.length === 0) {
    // console.log('[findHoleInOnes] No data or empty games/players list.');
    return [];
  }
  // console.log('[findHoleInOnes] Processing games:', data.games);

  data.games.forEach(game => {
    // console.log(`[findHoleInOnes] Checking game: ${game.id}, USA Player: ${game.usaPlayerId}, Europe Player: ${game.europePlayerId}`);
    game.holes.forEach(holeScore => {
      // console.log(`[findHoleInOnes] Hole ${holeScore.holeNumber}, Par: ${holeScore.parScore}, USA Score: ${holeScore.usaPlayerScore}, Europe Score: ${holeScore.europePlayerScore}`);
      const addHoleInOneMessage = (score: number | null, playerId: string) => {
        // A true hole-in-one is 1 stroke on a par > 1 hole.
        if (score === 1 && holeScore.parScore > 1) {
          const playerName = getPlayerNameById(playerId, data.players);
          // console.log(`[findHoleInOnes] HOLE IN ONE DETECTED for ${playerName} on hole ${holeScore.holeNumber}`);
          holeInOneMessages.push(`🎯 HOLE-IN-ONE! ${playerName} got an ace on hole ${holeScore.holeNumber}!`);
        } else if (score === 1) {
          // console.log(`[findHoleInOnes] Score of 1 detected for player ${playerId} on hole ${holeScore.holeNumber}, but par is ${holeScore.parScore}. Not a HIO.`);
        }
      };

      addHoleInOneMessage(holeScore.usaPlayerScore, game.usaPlayerId);
      addHoleInOneMessage(holeScore.europePlayerScore, game.europePlayerId);
    });
  });
  return holeInOneMessages;
}

/**
 * Finds every birdie in the tournament.
 * A birdie on a par 3 course is a score of 2.
 */
export function findAllBirdies(data: AnalyzableTournamentData): string[] {
  const messages: string[] = [];
  if (!data || !data.games || !data.players) return [];

  data.games.forEach(game => {
    game.holes.forEach(hole => {
      const checkPlayerScore = (score: number | null, playerId:string) => {
        if (score === 2) {
          const playerName = getPlayerNameById(playerId, data.players);
          messages.push(`🕊️ BIRDIE! ${playerName} makes a birdie on hole ${hole.holeNumber}!`);
        }
      };
      checkPlayerScore(hole.usaPlayerScore, game.usaPlayerId);
      checkPlayerScore(hole.europePlayerScore, game.europePlayerId);
    });
  });
  return messages;
}

/**
 * Finds every par made by a Tier 3 player.
 * A par on a par 3 course is a score of 3.
 */
export function findParsByTier3Players(data: AnalyzableTournamentData): string[] {
  const messages: string[] = [];
  if (!data || !data.games || !data.players) return [];

  const tier3Players = new Set(data.players.filter(p => p.tier === 3).map(p => p.id));
  if (tier3Players.size === 0) return [];

  data.games.forEach(game => {
    game.holes.forEach(hole => {
      const checkPlayerScore = (score: number | null, playerId: string) => {
        if (score === 3 && tier3Players.has(playerId)) {
          const playerName = getPlayerNameById(playerId, data.players);
          messages.push(`👀 TIER 3 PAR! Well, look at that. ${playerName} managed a par on hole ${hole.holeNumber}.`);
        }
      };
      checkPlayerScore(hole.usaPlayerScore, game.usaPlayerId);
      checkPlayerScore(hole.europePlayerScore, game.europePlayerId);
    });
  });
  return messages;
}

/**
 * Finds games with a significant number of consecutive tied holes (Grind Match).
 * A tied hole in match play means neither player won the hole.
 */
export function findGrindMatches(data: AnalyzableTournamentData): string[] {
  const messages: string[] = [];
  if (!data || !data.games || !data.players || data.games.length === 0) return [];

  const CONSECUTIVE_TIE_THRESHOLD = 3; // E.g., 3 or more consecutive tied holes

  data.games.forEach(game => {
    let consecutiveTies = 0;
    let maxConsecutiveTiesInGame = 0;
    let tiedStreakStartHole: number | null = null;

    // Sort holes to ensure correct sequence if not already sorted (though they usually are from DB)
    const sortedHoles = [...game.holes].sort((a, b) => a.holeNumber - b.holeNumber);

    for (const holeScore of sortedHoles) {
      // Assuming a tied hole in match play means scores for that hole are equal
      // A tied hole means these are equal (typically both 0.5 if points are awarded for ties, or both 0 if not).

      // MODIFIED Condition: 
      // 1. Hole must have been played (at least one stroke play score is not null)
      // 2. Match play scores for the hole must be equal.
      const holePlayed = holeScore.usaPlayerScore !== null || holeScore.europePlayerScore !== null;
      
      if (holePlayed && 
          holeScore.usaPlayerMatchPlayScore === holeScore.europePlayerMatchPlayScore) {
        consecutiveTies++;
        if (tiedStreakStartHole === null) tiedStreakStartHole = holeScore.holeNumber;
      } else {
        if (consecutiveTies > maxConsecutiveTiesInGame) {
          maxConsecutiveTiesInGame = consecutiveTies;
        }
        // If a streak of sufficient length ended, record it (optional, if we want to report any ended streak)
        // For now, we only care about the longest streak in the game if it meets the threshold overall.
        consecutiveTies = 0;
        tiedStreakStartHole = null;
      }
    }
    // Check after loop for a streak that went to the end of the game
    if (consecutiveTies > maxConsecutiveTiesInGame) {
      maxConsecutiveTiesInGame = consecutiveTies;
    }

    if (maxConsecutiveTiesInGame >= CONSECUTIVE_TIE_THRESHOLD) {
      const p1Name = getPlayerNameById(game.usaPlayerId, data.players);
      const p2Name = getPlayerNameById(game.europePlayerId, data.players);
      messages.push(
        `🤝 GRIND ALERT! ${p1Name} vs ${p2Name} featured a hard-fought streak of ${maxConsecutiveTiesInGame} consecutive tied holes!`
      );
    }
  });
  return messages;
}

/**
 * Finds Upset Alerts (higher handicap player wins).
 * Considers game.useHandicaps or tournamentInfo.useHandicaps.
 */
export function findUpsetAlerts(data: AnalyzableTournamentData): string[] {
  const messages: string[] = [];
  if (!data || !data.games || !data.players || data.games.length === 0) return [];

  const SIGNIFICANT_HANDICAP_DIFFERENCE = 3; // E.g., underdog has at least 3 strokes more handicap

  data.games.forEach(game => {
    const gameUsesHandicaps = game.useHandicaps !== undefined ? game.useHandicaps : data.tournamentInfo.useHandicaps;

    if (game.isComplete && gameUsesHandicaps && game.usaPlayerHandicap !== undefined && game.europePlayerHandicap !== undefined) {
      const usaHcp = game.usaPlayerHandicap;
      const europeHcp = game.europePlayerHandicap;
      const usaWon = game.points.adjusted.USA > game.points.adjusted.EUROPE;
      const europeWon = game.points.adjusted.EUROPE > game.points.adjusted.USA;

      let underdogPlayerId: string | null = null;
      let favoredPlayerId: string | null = null;

      if (usaHcp > europeHcp + SIGNIFICANT_HANDICAP_DIFFERENCE && usaWon) {
        underdogPlayerId = game.usaPlayerId;
        favoredPlayerId = game.europePlayerId;
      } else if (europeHcp > usaHcp + SIGNIFICANT_HANDICAP_DIFFERENCE && europeWon) {
        underdogPlayerId = game.europePlayerId;
        favoredPlayerId = game.usaPlayerId;
      }

      if (underdogPlayerId && favoredPlayerId) {
        const underdogName = getPlayerNameById(underdogPlayerId, data.players);
        const favoredName = getPlayerNameById(favoredPlayerId, data.players);
        const underdogDisplayHcp = underdogPlayerId === game.usaPlayerId ? usaHcp : europeHcp;
        const favoredDisplayHcp = favoredPlayerId === game.usaPlayerId ? usaHcp : europeHcp;
         messages.push(
           `🚨 UPSET ALERT! ${underdogName} (Hcp ${underdogDisplayHcp}) overcame the odds to defeat ${favoredName} (Hcp ${favoredDisplayHcp})!`
         );

      }
    }
  });
  return messages;
}

// --- Main Function to Generate All Fun Facts ---
export function generateFunFacts(analyzableData: AnalyzableTournamentData | null): string[] {
  if (!analyzableData || !analyzableData.games || analyzableData.games.length === 0) {
    // Added check for games array length for more robustness
    return ["Tournament data is still loading or no games have been played yet. Check back soon!"];
  }
  
  const funFacts: string[] = [];

  const mostStrokes = findMostStrokesOnHole(analyzableData);
  if (mostStrokes) funFacts.push(mostStrokes);

  const holeInOnes = findHoleInOnes(analyzableData);
  funFacts.push(...holeInOnes);

  const allBirdies = findAllBirdies(analyzableData);
  funFacts.push(...allBirdies);

  const tier3Pars = findParsByTier3Players(analyzableData);
  funFacts.push(...tier3Pars);
  
  const grindMatches = findGrindMatches(analyzableData);
  funFacts.push(...grindMatches);

  const upsetAlerts = findUpsetAlerts(analyzableData);
  funFacts.push(...upsetAlerts);

  if (funFacts.length === 0) {
    return ["No particularly wild stats from the tournament yet, but the competition is heating up!"];
  }

  // Optional: shuffle or limit the number of facts shown at once
  // return funFacts.sort(() => 0.5 - Math.random()).slice(0, 3); // Example: Show 3 random facts
  return funFacts;
} 