import { useState, useEffect } from 'react';
import { collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showSuccessToast } from '../utils/toast';
import type { User } from '../types/user';
import type { Player } from '../types/player';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnapshot, playersSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'players'))
        ]);

        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];

        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];

        setUsers(usersData);
        setPlayers(playersData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUserUpdate = async (userId: string, updates: Partial<User>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await updateDoc(doc(db, 'users', userId), updates);
      
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, ...updates }
          : user
      ));

      showSuccessToast('User updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerLinkage = async (userId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPlayerId = e.target.value;
    const selectedPlayer = players.find(p => p.id === selectedPlayerId);

    await handleUserUpdate(userId, {
      linkedPlayerId: selectedPlayerId || null,
      team: selectedPlayer?.team || null
    });
  };

  const handleUnlinkPlayer = async (userId: string) => {
    await handleUserUpdate(userId, {
      linkedPlayerId: null,
      team: null
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold dark:text-white">Manage Users</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Linked Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.linkedPlayerId || ''}
                    onChange={(e) => handlePlayerLinkage(user.id, e)}
                    className="text-sm rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select player</option>
                    {players.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.team})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.team === 'USA'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : user.team === 'EUROPE'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {user.team || 'None'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleUserUpdate(user.id, { isAdmin: !user.isAdmin })}
                    className={`px-3 py-1 rounded-lg text-white ${
                      user.isAdmin
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.linkedPlayerId && (
                    <button
                      onClick={() => handleUnlinkPlayer(user.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Unlink Player
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}