import { doc, updateDoc, getDoc, getDocs, collection, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import { calculateGamePoints } from './gamePoints';

export async function updateTournamentScores(tournamentId: string) {
  try {
    // Get all games for the tournament
    const gamesSnapshot = await getDocs(collection(db, 'tournaments', tournamentId, 'games'));
    const games = gamesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Game[];

    // Get tournament document
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    const tournamentData = tournamentDoc.data();
    
    if (!tournamentData) {
      throw new Error('Tournament not found');
    }

    // Initialize scores with zeros
    const initialScores = { 
      raw: { USA: 0, EUROPE: 0 },
      adjusted: { USA: 0, EUROPE: 0 }
    };

    // Calculate total points from completed games only
    const totalPoints = games.length > 0 ? games
      .filter(game => game.isComplete)
      .reduce((total, game) => {
        const gamePoints = calculateGamePoints(game);
        return {
          raw: {
            USA: total.raw.USA + gamePoints.raw.USA,
            EUROPE: total.raw.EUROPE + gamePoints.raw.EUROPE
          },
          adjusted: {
            USA: total.adjusted.USA + gamePoints.adjusted.USA,
            EUROPE: total.adjusted.EUROPE + gamePoints.adjusted.EUROPE
          }
        };
      }, initialScores) : initialScores;

    // Calculate projected points (including all games)
    const projectedPoints = games.length > 0 ? games.reduce((total, game) => {
      const gamePoints = calculateGamePoints(game);
      return {
        raw: {
          USA: total.raw.USA + gamePoints.raw.USA,
          EUROPE: total.raw.EUROPE + gamePoints.raw.EUROPE
        },
        adjusted: {
          USA: total.adjusted.USA + gamePoints.adjusted.USA,
          EUROPE: total.adjusted.EUROPE + gamePoints.adjusted.EUROPE
        }
      };
    }, initialScores) : initialScores;

    // Create the progress entry
    const progressEntry = {
      score: totalPoints,
      completedGames: games.filter(g => g.isComplete).length,
      timestamp: new Date().toISOString()
    };

    // Only update if there are changes
    const currentTotalScore = tournamentData.totalScore || initialScores;
    const currentProjectedScore = tournamentData.projectedScore || initialScores;

    const hasChanges = 
      currentTotalScore.raw.USA !== totalPoints.raw.USA ||
      currentTotalScore.raw.EUROPE !== totalPoints.raw.EUROPE ||
      currentTotalScore.adjusted.USA !== totalPoints.adjusted.USA ||
      currentTotalScore.adjusted.EUROPE !== totalPoints.adjusted.EUROPE ||
      currentProjectedScore.raw.USA !== projectedPoints.raw.USA ||
      currentProjectedScore.raw.EUROPE !== projectedPoints.raw.EUROPE ||
      currentProjectedScore.adjusted.USA !== projectedPoints.adjusted.USA ||
      currentProjectedScore.adjusted.EUROPE !== projectedPoints.adjusted.EUROPE;

    if (hasChanges) {
      // Preserve all required fields while updating scores
      await updateDoc(tournamentRef, {
        // Preserve existing fields
        name: tournamentData.name,
        year: tournamentData.year,
        isActive: tournamentData.isActive,
        useHandicaps: tournamentData.useHandicaps,
        teamConfig: tournamentData.teamConfig,
        handicapStrokes: tournamentData.handicapStrokes,
        higherHandicapTeam: tournamentData.higherHandicapTeam,
        matchups: tournamentData.matchups,
        createdAt: tournamentData.createdAt,
        // Update scores
        totalScore: totalPoints,
        projectedScore: projectedPoints,
        progress: arrayUnion(progressEntry)
      });
    }

    return { totalPoints, projectedPoints };
  } catch (error: any) {
    throw error;
  }
} 