// src/utils/statsAnalysis.ts
import { Player } from '../types/player';
import { Game, HoleScore as GameHoleScore } from '../types/game'; // Renamed to avoid conflict if any
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
          statMessage = `💣 ${playerName} had a tough time, taking ${maxStrokes} strokes on hole ${holeScore.holeNumber}.`;
        }
      };

      checkScore(holeScore.usaPlayerScore, game.usaPlayerId);
      checkScore(holeScore.europePlayerScore, game.europePlayerId);
    });
  });
  
  // Only return if maxStrokes is significant (e.g. > par or a high number like 6+)
  // For now, let's return if any maxStrokes > 0 found and it's not just a normal high score.
  // Example: only if maxStrokes is, say, >= 7, or significantly above par.
  // This condition can be refined based on what's considered "fun" or noteworthy.
  if (maxStrokes >= 7) { // Arbitrary threshold for "fun fact" worthy blow-up hole
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
          holeInOneMessages.push(`🎯 UNBELIEVABLE! ${playerName} got a HOLE-IN-ONE on hole ${holeScore.holeNumber}!`);
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

interface PlayerScoreSequence {
  holeNumber: number;
  score: number;
  // par: number; // Removed as it's unused for Par 3 birdie calculation
}

/**
 * Finds players who had a streak of three birdies (or more).
 * Birdie is 1 stroke under par.
 */
export function findBirdieStreaks(data: AnalyzableTournamentData): string[] {
  const birdieStreakMessages: string[] = [];
  if (!data || !data.games || !data.players || data.games.length === 0) return [];

  data.games.forEach(game => {
    const processPlayerStreaks = (playerId: string, playerHoleScores: GameHoleScore[]) => {
      if (!playerId) return;
      const playerName = getPlayerNameById(playerId, data.players);
      
      const scores: PlayerScoreSequence[] = playerHoleScores.map(h => ({
        holeNumber: h.holeNumber,
        // Determine if it's USA or Europe player's score based on current context
        score: game.usaPlayerId === playerId ? (h.usaPlayerScore ?? Infinity) : (h.europePlayerScore ?? Infinity),
        // par: h.parScore // Removed as it's unused
      })).filter(s => s.score !== Infinity).sort((a, b) => a.holeNumber - b.holeNumber);

      let consecutiveBirdies = 0;
      let streakStartHole: number | null = null;

      for (let i = 0; i < scores.length; i++) {
        const ps = scores[i];
        if (ps.score === 2) { // Birdie on a Par 3
          consecutiveBirdies++;
          if (consecutiveBirdies === 1) {
            streakStartHole = ps.holeNumber;
          }
          if (consecutiveBirdies === 3) {
            // Found a streak of 3. Check if it continues for more.
            let currentStreakEndHole = ps.holeNumber;
            for (let j = i + 1; j < scores.length; j++) {
              const nextScore = scores[j];
              if (nextScore.holeNumber === currentStreakEndHole + 1 && nextScore.score === 2) {
                consecutiveBirdies++;
                currentStreakEndHole = nextScore.holeNumber;
              } else {
                break;
              }
            }
            birdieStreakMessages.push(
              `🔥 ${playerName} is on FIRE with ${consecutiveBirdies} birdies in a row (holes ${streakStartHole}-${currentStreakEndHole})!`
            );
            i = scores.findIndex(s => s.holeNumber === currentStreakEndHole); // Move index past this streak
            consecutiveBirdies = 0;
            streakStartHole = null;
          }
        } else {
          consecutiveBirdies = 0;
          streakStartHole = null;
        }
      }
    };

    // It's possible a game might not have one of the players (e.g. singles match setup incomplete)
    if (game.usaPlayerId) {
      processPlayerStreaks(game.usaPlayerId, game.holes);
    }
    if (game.europePlayerId && game.europePlayerId !== game.usaPlayerId) { // Avoid double processing if by some chance IDs were same
       processPlayerStreaks(game.europePlayerId, game.holes);
    }
  });
  return birdieStreakMessages;
}

/**
 * Finds Eagles (2 under par) and Albatrosses/Double Eagles (3 under par).
 */
export function findBetterThanBirdie(data: AnalyzableTournamentData): string[] {
  const messages: string[] = [];
  if (!data || !data.games || !data.players || data.games.length === 0) return [];

  data.games.forEach(game => {
    game.holes.forEach(holeScore => {
      const checkScore = (score: number | null, playerId: string, /* par: number, */ holeNum: number) => {
        if (score === null) return;
        const playerName = getPlayerNameById(playerId, data.players);
        // On a Par 3 course:
        // Eagle (2 under par) is a score of 1 (Hole-in-One)
        if (score === 1) { // Par 3 - 2 = 1
          messages.push(`🦅 ${playerName} aced hole ${holeNum} for an Eagle (Hole-in-One)!`);
        }
        // Albatross (3 under par) on a Par 3 would be a score of 0, which is typically impossible.
      };

      // We still pass holeScore.parScore, but the logic inside checkScore now assumes Par 3 for eagle calc.
      checkScore(holeScore.usaPlayerScore, game.usaPlayerId, /* holeScore.parScore, */ holeScore.holeNumber);
      checkScore(holeScore.europePlayerScore, game.europePlayerId, /* holeScore.parScore, */ holeScore.holeNumber);
    });
  });
  return messages;
}

/**
 * Finds the player with the most birdies in a single game/round.
 */
export function findMostBirdiesInARound(data: AnalyzableTournamentData): string | null {
  if (!data || !data.games || !data.players || data.games.length === 0) return null;

  let maxBirdies = 0;
  let statMessage: string | null = null;

  data.games.forEach(game => {
    const countPlayerBirdies = (playerId: string, playerHoleScores: GameHoleScore[]) => {
      if (!playerId) return 0;
      let birdieCount = 0;
      playerHoleScores.forEach(h => {
        const score = game.usaPlayerId === playerId ? h.usaPlayerScore : h.europePlayerScore;
        if (score === 2) { // Birdie on a Par 3
          birdieCount++;
        }
      });
      return birdieCount;
    };

    const usaBirdies = countPlayerBirdies(game.usaPlayerId, game.holes);
    const europeBirdies = countPlayerBirdies(game.europePlayerId, game.holes);

    if (usaBirdies > maxBirdies) {
      maxBirdies = usaBirdies;
      const playerName = getPlayerNameById(game.usaPlayerId, data.players);
      statMessage = `🐦 ${playerName} went on a BIRDIE BARRAGE, carding ${maxBirdies} birdies in their round!`;
    }
    if (europeBirdies > maxBirdies) {
      maxBirdies = europeBirdies;
      const playerName = getPlayerNameById(game.europePlayerId, data.players);
      statMessage = `🐦 ${playerName} went on a BIRDIE BARRAGE, carding ${maxBirdies} birdies in their round!`;
    } else if (europeBirdies === maxBirdies && maxBirdies > 0 && game.usaPlayerId !== game.europePlayerId) {
        // Handle ties if it's a different player
        const usaPlayerName = getPlayerNameById(game.usaPlayerId, data.players);
        const europePlayerName = getPlayerNameById(game.europePlayerId, data.players);
        statMessage = `🐦🐦 Birdie fest! Both ${usaPlayerName} and ${europePlayerName} carded ${maxBirdies} birdies in their rounds!`;
    }
  });

  // Only return if a decent number of birdies were made, e.g., 3+
  return maxBirdies >= 3 ? statMessage : null;
}

/**
 * Finds games with a significant number of consecutive tied holes (Grind Match).
 * A tied hole in match play means neither player won the hole.
 */
export function findGrindMatches(data: AnalyzableTournamentData): string[] {
  const messages: string[] = [];
  if (!data || !data.games || !data.players || data.games.length === 0) return [];

  const CONSECUTIVE_TIE_THRESHOLD = 4; // E.g., 4 or more consecutive tied holes

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
 * Finds dominating performances (large margin of victory in match play).
 * Uses game.points.adjusted for the final result.
 */
export function findDominatingWins(data: AnalyzableTournamentData): string[] {
  const messages: string[] = [];
  if (!data || !data.games || !data.players || data.games.length === 0) return [];

  const DOMINATING_MARGIN_THRESHOLD = 3; // E.g., winning by 3 or more points

  data.games.forEach(game => {
    if (game.isComplete && game.points && game.points.adjusted) {
      const usaScore = game.points.adjusted.USA;
      const europeScore = game.points.adjusted.EUROPE;
      const margin = Math.abs(usaScore - europeScore);

      if (margin >= DOMINATING_MARGIN_THRESHOLD) {
        let winnerName: string;
        let loserName: string;
        if (usaScore > europeScore) {
          winnerName = getPlayerNameById(game.usaPlayerId, data.players);
          loserName = getPlayerNameById(game.europePlayerId, data.players);
        } else {
          winnerName = getPlayerNameById(game.europePlayerId, data.players);
          loserName = getPlayerNameById(game.usaPlayerId, data.players);
        }
        messages.push(
          `👑 DOMINATION! ${winnerName} secured a commanding victory over ${loserName} with a margin of ${margin} points!`
        );
      }
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

  const SIGNIFICANT_HANDICAP_DIFFERENCE = 5; // E.g., underdog has at least 5 strokes more handicap

  data.games.forEach(game => {
    const gameUsesHandicaps = game.useHandicaps !== undefined ? game.useHandicaps : data.tournamentInfo.useHandicaps;

    if (game.isComplete && gameUsesHandicaps && game.usaPlayerHandicap !== undefined && game.europePlayerHandicap !== undefined) {
      const usaHcp = game.usaPlayerHandicap;
      const europeHcp = game.europePlayerHandicap;
      const usaWon = game.points.adjusted.USA > game.points.adjusted.EUROPE;
      const europeWon = game.points.adjusted.EUROPE > game.points.adjusted.USA;

      let underdogPlayerId: string | null = null;
      let favoredPlayerId: string | null = null;
      let handicapDiff = 0;

      if (usaHcp > europeHcp + SIGNIFICANT_HANDICAP_DIFFERENCE && usaWon) {
        underdogPlayerId = game.usaPlayerId;
        favoredPlayerId = game.europePlayerId;
        handicapDiff = usaHcp - europeHcp;
      } else if (europeHcp > usaHcp + SIGNIFICANT_HANDICAP_DIFFERENCE && europeWon) {
        underdogPlayerId = game.europePlayerId;
        favoredPlayerId = game.usaPlayerId;
        handicapDiff = europeHcp - usaHcp;
      }

      if (underdogPlayerId && favoredPlayerId) {
        const underdogName = getPlayerNameById(underdogPlayerId, data.players);
        const favoredName = getPlayerNameById(favoredPlayerId, data.players);
        messages.push(
          `🚨 UPSET ALERT! ${underdogName} (Hcp ${handicapDiff > 0 ? '+':''}${data.players.find(p=>p.id === underdogPlayerId)?.averageScore /* quick way to get hcp for display, ideally use actual game hcp */}) overcame the odds to defeat ${favoredName} (Hcp ${data.players.find(p=>p.id === favoredPlayerId)?.averageScore}) despite a ${handicapDiff}-stroke handicap difference!`
        );
        // A bit clunky to get handicap for display in the message this way. The game object itself has the handicaps (usaPlayerHandicap, europePlayerHandicap)
        // Let's refine the message to use those directly.
        const underdogDisplayHcp = underdogPlayerId === game.usaPlayerId ? usaHcp : europeHcp;
        const favoredDisplayHcp = favoredPlayerId === game.usaPlayerId ? usaHcp : europeHcp;
         messages.pop(); // Remove the previous clunky message
         messages.push(
           `🚨 UPSET ALERT! ${underdogName} (Hcp ${underdogDisplayHcp}) overcame the odds to defeat ${favoredName} (Hcp ${favoredDisplayHcp}) despite a significant handicap difference!`
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

  const birdieStreaks = findBirdieStreaks(analyzableData);
  funFacts.push(...birdieStreaks);

  const betterThanBirdie = findBetterThanBirdie(analyzableData);
  funFacts.push(...betterThanBirdie);

  const mostBirdiesRound = findMostBirdiesInARound(analyzableData);
  if (mostBirdiesRound) funFacts.push(mostBirdiesRound);
  
  const grindMatches = findGrindMatches(analyzableData);
  funFacts.push(...grindMatches);

  const dominatingWins = findDominatingWins(analyzableData);
  funFacts.push(...dominatingWins);

  const upsetAlerts = findUpsetAlerts(analyzableData);
  funFacts.push(...upsetAlerts);

  if (funFacts.length === 0) {
    return ["No particularly wild stats from the tournament yet, but the competition is heating up!"];
  }

  // Optional: shuffle or limit the number of facts shown at once
  // return funFacts.sort(() => 0.5 - Math.random()).slice(0, 3); // Example: Show 3 random facts
  return funFacts;
} 