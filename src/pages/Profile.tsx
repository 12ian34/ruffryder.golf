import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { availableEmojis } from '../utils/animalAvatars';
import type { User } from '../types/user';

export default function Profile() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const user = userDoc.data() as User;
          setUserData(user);
          setName(user.name);
          setSelectedEmoji(user.customEmoji || '');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  const handleEmojiSelect = async (emoji: string) => {
    if (!currentUser || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      const updates: Partial<User> = { 
        customEmoji: emoji === selectedEmoji ? null : emoji
      };

      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      setSelectedEmoji(updates.customEmoji || '');
      
      setSuccessMessage('Avatar updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);
      
      const updates: Partial<User> = { name };

      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      setUserData(prev => prev ? { ...prev, ...updates } : null);

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentUser || !userData) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Please sign in to access your profile
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold dark:text-white">Profile Settings</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
            >
              Back to Dashboard
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Avatar Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Avatar
              </label>
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg dark:border-gray-700">
                {availableEmojis.map((emoji, index) => (
                  <button
                    key={`emoji-${index}`}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className={`text-2xl p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedEmoji === emoji ? 'bg-blue-100 dark:bg-blue-900' : ''
                    }`}
                    disabled={isSaving}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Click an emoji to select it as your avatar. Click it again to use the default avatar.
              </p>
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
                disabled={isSaving}
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={userData.email}
                className="w-full px-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300"
                disabled
              />
            </div>

            {/* Admin Status (Read-only) */}
            {userData.isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <div className="px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-lg">
                  Administrator
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSaving}
                className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
              >
                Sign Out
              </button>
              
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}