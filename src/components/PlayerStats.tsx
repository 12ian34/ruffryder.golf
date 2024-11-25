import { useState, useEffect } from 'react';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Player } from '../types/player';
import type { User } from '../types/user';

type SortField = 'name' | 'average' | number;
type SortDirection = 'asc' | 'desc';

function isValidPlayer(data: any): data is Player {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.name === 'string' &&
    data.name.trim() !== '' &&
    (data.team === 'USA' || data.team === 'EUROPE') &&
    Array.isArray(data.historicalScores) &&
    typeof data.averageScore === 'number'
  );
}

export default function PlayerStats() {
  const { currentUser } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'USA' | 'EUROPE'>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (!currentUser) {
      setError('Please sign in to view player stats');
      setIsLoading(false);
      return;
    }

    // Fetch user data to get linkedPlayerId
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();

    const unsubscribe = onSnapshot(
      collection(db, 'players'),
      (snapshot) => {
        try {
          const playersData = snapshot.docs
            .map(doc => {
              const data = doc.data();
              if (!isValidPlayer(data)) {
                console.error(`Invalid player data for doc ${doc.id}:`, data);
                return null;
              }
              return {
                id: doc.id,
                name: data.name.trim(),
                team: data.team,
                historicalScores: data.historicalScores.map(score => ({
                  year: score.year,
                  score: score.score
                })),
                averageScore: data.averageScore
              } as Player;
            })
            .filter((player): player is Player => player !== null)
            .sort((a, b) => a.name.localeCompare(b.name));

          setPlayers(playersData);
          setIsLoading(false);
        } catch (err) {
          console.error('Error processing player data:', err);
          setError('Error processing player data');
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching players:', err);
        setError('Failed to load player data. Please try again later.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const getYears = (): number[] => {
    const years = new Set<number>();
    players.forEach(player => {
      player.historicalScores?.forEach(score => {
        if (typeof score?.year === 'number') {
          years.add(score.year);
        }
      });
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getScoreForYear = (player: Player, year: number): number | undefined => {
    const score = player.historicalScores?.find(score => score?.year === year)?.score;
    return typeof score === 'number' ? score : undefined;
  };

  const sortedPlayers = [...players]
    .filter(player => filter === 'ALL' ? true : player.team === filter)
    .sort((a, b) => {
      try {
        if (sortField === 'name') {
          return sortDirection === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        
        if (sortField === 'average') {
          return sortDirection === 'asc'
            ? a.averageScore - b.averageScore
            : b.averageScore - a.averageScore;
        }
        
        // Sort by specific year
        const aScore = getScoreForYear(a, sortField as number) ?? 999;
        const bScore = getScoreForYear(b, sortField as number) ?? 999;
        return sortDirection === 'asc' ? aScore - bScore : bScore - aScore;
      } catch (err) {
        console.error('Error sorting players:', err);
        return 0;
      }
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please sign in to view player stats
        </div>
      </div>
    );
  }

  const years = getYears();

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex space-x-4">
        {(['ALL', 'USA', 'EUROPE'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === option
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Players Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => toggleSort('name')}
              >
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => toggleSort('average')}
              >
                Average {sortField === 'average' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {years.map(year => (
                <th 
                  key={year}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort(year)}
                >
                  {year} {sortField === year && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPlayers.map((player) => {
              const isCurrentPlayer = userData?.linkedPlayerId === player.id;
              return (
                <tr 
                  key={player.id}
                  className={isCurrentPlayer ? 'bg-blue-50 dark:bg-blue-900' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`font-medium ${
                        player.team === 'USA' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {player.name}
                        {isCurrentPlayer && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {player.averageScore}
                  </td>
                  {years.map(year => (
                    <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getScoreForYear(player, year) || '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}