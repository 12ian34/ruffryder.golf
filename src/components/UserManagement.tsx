import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import type { User } from '../types/user';
import type { Player } from '../types/player';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteUser = async (user: User) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      // Delete user's data from Firestore
      await deleteDoc(doc(db, 'users', user.id));

      // Delete any associated blog posts
      const postsQuery = query(collection(db, 'blog-posts'), where('authorId', '==', user.id));
      const postsSnapshot = await getDocs(postsQuery);
      const deletePromises = postsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showSuccessToast('User deleted successfully');
    } catch (err: any) {
      setError(err.message);
      showErrorToast('Failed to delete user: ' + err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {user.team || 'None'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleUserUpdate(user.id, { isAdmin: !user.isAdmin })}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      user.isAdmin
                        ? 'bg-opacity-10 bg-purple-200 text-purple-600 border border-purple-500 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700'
                        : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm'
                    }`}
                  >
                    {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  {user.linkedPlayerId && (
                    <button
                      onClick={() => handleUnlinkPlayer(user.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Unlink Player
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUserToDelete(user);
                      setShowDeleteConfirm(true);
                    }}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete User Account
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete {userToDelete.name}'s account? This action cannot be undone.
              All associated data, including blog posts, will be permanently deleted.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}