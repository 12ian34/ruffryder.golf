import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { availableEmojis } from '../utils/animalAvatars';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import type { User } from '../types/user';

export default function Profile() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [pendingEmoji, setPendingEmoji] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
          setPendingEmoji(user.customEmoji || '');
        }
      } catch (err: any) {
        showErrorToast('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  const hasChanges = useMemo(() => {
    if (!userData) return false;
    return name !== userData.name || pendingEmoji !== (userData.customEmoji || '');
  }, [userData, name, pendingEmoji]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isSaving || !hasChanges) return;

    try {
      setIsSaving(true);
      
      const updates: Partial<User> = { 
        name,
        customEmoji: pendingEmoji || undefined
      };

      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      setUserData(prev => prev ? { ...prev, ...updates } : null);

      showSuccessToast('Profile updated successfully!');
    } catch (err: any) {
      showErrorToast('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err: any) {
      showErrorToast('Failed to sign out');
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
                    onClick={() => setPendingEmoji(emoji === pendingEmoji ? '' : emoji)}
                    className={`text-2xl p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      pendingEmoji === emoji ? 'bg-blue-100 dark:bg-blue-900' : ''
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

            {/* Linked Player (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Linked Player
              </label>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 rounded-lg">
                {userData.linkedPlayerId ? (
                  <div className="flex items-center space-x-2">
                    <span>{userData.customEmoji || '👤'}</span>
                    <span>{userData.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({userData.team || 'No Team'})
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">No player linked</span>
                )}
              </div>
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
                disabled={isSaving || !hasChanges}
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