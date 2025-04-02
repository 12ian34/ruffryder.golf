import { doc, updateDoc, getDoc, getDocs, collection, arrayUnion, serverTimestamp } from 'firebase/firestore';
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

    // Calculate total points from completed games only
    const totalPoints = games
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
      }, { 
        raw: { USA: 0, EUROPE: 0 },
        adjusted: { USA: 0, EUROPE: 0 }
      });

    // Calculate projected points (including all games)
    const projectedPoints = games.reduce((total, game) => {
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
    }, { 
      raw: { USA: 0, EUROPE: 0 },
      adjusted: { USA: 0, EUROPE: 0 }
    });

    // Create the progress entry
    const progressEntry = {
      score: totalPoints,
      completedGames: games.filter(g => g.isComplete).length
    };

    // Update tournament document
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      totalScore: totalPoints,
      projectedScore: projectedPoints,
      progress: arrayUnion(progressEntry)
    });

    // Update the timestamp separately
    const progressArray = (await getDoc(tournamentRef)).data()?.progress || [];
    const lastProgressIndex = progressArray.length - 1;
    if (lastProgressIndex >= 0) {
      await updateDoc(tournamentRef, {
        [`progress.${lastProgressIndex}.timestamp`]: serverTimestamp()
      });
    }

    return { totalPoints, projectedPoints };
  } catch (error) {
    console.error('Error updating tournament scores:', error);
    throw error;
  }
} 