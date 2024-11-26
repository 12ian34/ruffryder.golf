import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Game } from '../types/game';
import type { User } from '../types/user';
import type { Tournament } from '../types/tournament';
import ScoreEntry from './ScoreEntry';
import PlayerAvatar from './PlayerAvatar';
import GameCompletionModal from './GameCompletionModal';

interface GameManagementProps {
  userId: string | undefined;
}

interface PlayerAvatarData {
  id: string;
  name: string;
  customEmoji?: string;
}

export default function GameManagement({ userId }: GameManagementProps) {
  const [userGames, setUserGames] = useState<Game[]>([]);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameToComplete, setGameToComplete] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [playerAvatars, setPlayerAvatars] = useState<Map<string, PlayerAvatarData>>(new Map());

  const sortGames = (games: Game[]): Game[] => {
    return [...games].sort((a, b) => {
      if (a.isComplete !== b.isComplete) {
        return a.isComplete ? 1 : -1;
      }
      if (a.isStarted !== b.isStarted) {
        return a.isStarted ? -1 : 1;
      }
      return a.usaPlayerName.localeCompare(b.usaPlayerName);
    });
  };

  const updateTournamentProgress = async (
    tournamentId: string,
    games: Game[],
    tournament: Tournament
  ) => {
    const now = Date.now();
    if (lastUpdate && now - lastUpdate < 300000) {
      return;
    }

    const completedGames = games.filter(g => g.isComplete).length;
    const currentScore = calculateTournamentScore(games);

    if (
      tournament.totalScore?.USA === currentScore.USA &&
      tournament.totalScore?.EUROPE === currentScore.EUROPE &&
      tournament.progress?.length > 0
    ) {
      return;
    }

    const newProgress = {
      timestamp: new Date(),
      score: currentScore,
      completedGames
    };

    const updatedProgress = [...(tournament.progress || []), newProgress];

    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        totalScore: currentScore,
        progress: updatedProgress
      });
      setLastUpdate(now);
    } catch (err) {
      console.error('Error updating tournament progress:', err);
    }
  };

  const calculateTournamentScore = (games: Game[]) => {
    const currentScore = {
      USA: 0,
      EUROPE: 0
    };

    games.forEach(game => {
      if (game.isComplete) {
        const strokePlayPoint = game.strokePlayScore.USA < game.strokePlayScore.EUROPE ? 1 : 
                              game.strokePlayScore.USA === game.strokePlayScore.EUROPE ? 0.5 : 0;
        
        const matchPlayPoint = game.matchPlayScore.USA > game.matchPlayScore.EUROPE ? 1 :
                             game.matchPlayScore.USA === game.matchPlayScore.EUROPE ? 0.5 : 0;
        
        currentScore.USA += strokePlayPoint + matchPlayPoint;
        currentScore.EUROPE += (1 - strokePlayPoint) + (1 - matchPlayPoint);
      }
    });

    return currentScore;
  };

  const handleGameStatusChange = async (game: Game, newStatus: 'not_started' | 'in_progress' | 'complete') => {
    if (!isAdmin || !activeTournamentId) return;

    try {
      const updates: Partial<Game> = {};

      switch (newStatus) {
        case 'not_started':
          updates.isStarted = false;
          updates.isComplete = false;
          break;
        case 'in_progress':
          updates.isStarted = true;
          updates.isComplete = false;
          break;
        case 'complete':
          // Check if all holes have scores
          const hasAllScores = game.holes.every(hole => 
            typeof hole.usaPlayerScore === 'number' && 
            typeof hole.europePlayerScore === 'number'
          );

          if (!hasAllScores) {
            setError('All holes must have scores before marking the game as complete');
            return;
          }

          setGameToComplete(game);
          return;
      }

      await updateDoc(
        doc(db, 'tournaments', activeTournamentId, 'games', game.id),
        updates
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchPlayerAvatarData = async (playerId: string) => {
    try {
      const userDocs = await getDocs(collection(db, 'users'));
      const user = userDocs.docs.find(doc => doc.data().linkedPlayerId === playerId);
      if (user) {
        const userData = user.data() as User;
        return {
          id: playerId,
          name: userData.name,
          customEmoji: userData.customEmoji
        };
      }
    } catch (err) {
      console.error('Error fetching player avatar:', err);
    }
    return null;
  };

  useEffect(() => {
    if (!userId) {
      setError('User ID not found');
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setLinkedPlayerId(userData.linkedPlayerId || null);
          setIsAdmin(userData.isAdmin || false);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to fetch user data');
        setIsLoading(false);
      }
    };

    fetchUserData();

    const unsubscribeTournament = onSnapshot(
      collection(db, 'tournaments'),
      async (snapshot) => {
        const activeTournament = snapshot.docs.find(doc => doc.data().isActive);
        if (activeTournament) {
          setActiveTournamentId(activeTournament.id);

          const unsubscribeGames = onSnapshot(
            collection(db, 'tournaments', activeTournament.id, 'games'),
            async (gamesSnapshot) => {
              const gamesData = gamesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tournamentId: activeTournament.id
              })) as Game[];

              // Fetch avatar data for all players
              const newPlayerAvatars = new Map<string, PlayerAvatarData>();
              const playerIds = new Set(gamesData.flatMap(game => [game.usaPlayerId, game.europePlayerId]));
              
              await Promise.all(Array.from(playerIds).map(async (playerId) => {
                const avatarData = await fetchPlayerAvatarData(playerId);
                if (avatarData) {
                  newPlayerAvatars.set(playerId, avatarData);
                }
              }));

              setPlayerAvatars(newPlayerAvatars);

              const tournamentData = { ...activeTournament.data(), id: activeTournament.id } as Tournament;
              setTimeout(() => {
                updateTournamentProgress(activeTournament.id, gamesData, tournamentData);
              }, 1000);

              const filteredGames = isAdmin 
                ? gamesData 
                : gamesData.filter(game => 
                    game.playerIds?.includes(linkedPlayerId)
                  );

              setUserGames(sortGames(filteredGames));
              setIsLoading(false);
            },
            (err) => {
              console.error('Error fetching games:', err);
              setError('Failed to load games');
              setIsLoading(false);
            }
          );

          return () => unsubscribeGames();
        } else {
          setUserGames([]);
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching tournament:', err);
        setError('Failed to load tournament');
        setIsLoading(false);
      }
    );

    return () => unsubscribeTournament();
  }, [userId, linkedPlayerId, isAdmin, lastUpdate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!activeTournamentId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No active tournament found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold dark:text-white">Your Games</h2>

      {userGames.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No games found
        </div>
      ) : (
        <div className="grid gap-6">
          {userGames.map((game) => {
            const usaPlayerAvatar = playerAvatars.get(game.usaPlayerId);
            const europePlayerAvatar = playerAvatars.get(game.europePlayerId);

            return (
              <div
                key={game.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <PlayerAvatar
                        playerId={game.usaPlayerId}
                        name={game.usaPlayerName}
                        customEmoji={usaPlayerAvatar?.customEmoji}
                      />
                      <div className="font-medium text-red-500">
                        {game.usaPlayerName}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">USA</div>
                  </div>

                  <div className="text-center flex flex-col justify-center">
                    {game.isComplete ? (
                      <>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Final Score
                        </div>
                        <div className="flex justify-center space-x-8 mt-2">
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Stroke Play</div>
                            <div className="text-lg font-bold">
                              {game.strokePlayScore.USA} - {game.strokePlayScore.EUROPE}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Holes Won</div>
                            <div className="text-lg font-bold">
                              {game.matchPlayScore.USA} - {game.matchPlayScore.EUROPE}
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleGameStatusChange(game, 'in_progress')}
                            className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                          >
                            Mark as In Progress
                          </button>
                        )}
                      </>
                    ) : game.isStarted ? (
                      <>
                        <div className="text-sm font-medium text-yellow-500">
                          In Progress
                        </div>
                        <div className="flex justify-center space-x-8 mt-2 text-gray-400">
                          <div>
                            <div className="text-sm">Stroke Play</div>
                            <div className="text-lg">
                              {game.strokePlayScore.USA} - {game.strokePlayScore.EUROPE}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm">Holes Won</div>
                            <div className="text-lg">
                              {game.matchPlayScore.USA} - {game.matchPlayScore.EUROPE}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedGame(game)}
                          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Enter Scores
                        </button>
                        {isAdmin && (
                          <div className="mt-2 space-y-2">
                            <button
                              onClick={() => handleGameStatusChange(game, 'not_started')}
                              className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                            >
                              Mark as Not Started
                            </button>
                            <button
                              onClick={() => handleGameStatusChange(game, 'complete')}
                              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                            >
                              Mark as Complete
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedGame(game)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          Start Game
                        </button>
                        {isAdmin && game.strokePlayScore.USA > 0 && (
                          <button
                            onClick={() => handleGameStatusChange(game, 'in_progress')}
                            className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                          >
                            Mark as In Progress
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <PlayerAvatar
                        playerId={game.europePlayerId}
                        name={game.europePlayerName}
                        customEmoji={europePlayerAvatar?.customEmoji}
                      />
                      <div className="font-medium text-blue-500">
                        {game.europePlayerName}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">EUROPE</div>
                  </div>
                </div>

                {game.handicapStrokes > 0 && game.higherHandicapTeam && (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                    {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedGame && (
        <ScoreEntry
          gameId={selectedGame.id}
          tournamentId={activeTournamentId}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {gameToComplete && (
        <GameCompletionModal
          game={gameToComplete}
          tournamentId={activeTournamentId}
          onClose={() => setGameToComplete(null)}
        />
      )}
    </div>
  );
}