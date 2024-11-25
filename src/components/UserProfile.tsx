import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../config/firebase';
import type { User } from '../types/user';
import type { Player } from '../types/player';

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        const [userDoc, playersSnapshot] = await Promise.all([
          getDoc(doc(db, 'users', currentUser.uid)),
          getDocs(collection(db, 'players'))
        ]);

        if (userDoc.exists()) {
          const user = userDoc.data() as User;
          setUserData(user);
          setName(user.name);
          setSelectedPlayerId(user.linkedPlayerId || '');
        }

        const playersData = playersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];
        setPlayers(playersData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const updates: Partial<User> = { name };

      if (selectedPlayerId) {
        updates.linkedPlayerId = selectedPlayerId;
      }

      if (profilePic) {
        const storage = getStorage();
        const fileRef = ref(storage, `profile-pics/${currentUser.uid}`);
        await uploadBytes(fileRef, profilePic);
        updates.profilePicUrl = await getDownloadURL(fileRef);
      }

      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      setUserData(prev => prev ? { ...prev, ...updates } : null);
      alert('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 dark:text-white">Profile Settings</h2>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleProfileUpdate} className="space-y-6">
        {/* Profile Picture */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Profile Picture
          </label>
          <div className="flex items-center space-x-4">
            {userData?.profilePicUrl && (
              <img
                src={userData.profilePicUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePic(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-gray-700 dark:file:text-gray-300"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        {/* Player Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Player
          </label>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select a player</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.name} ({player.team})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}