import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Leaderboard from '../components/Leaderboard';
import PlayerStats from '../components/PlayerStats';
import { GameManagement } from '../components/GameManagement';
import AdminPanel from '../components/AdminPanel';
import ThemeSwitcher from '../components/ThemeSwitcher';
import About from './About';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types/user';
import PlayerEmoji from '../components/PlayerEmoji';
import { track } from '../utils/analytics';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      setIsLoading(false);
      return;
    }

    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      window.history.replaceState({}, document.title);
    }

    const fetchData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        } else {
          setError('User data not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate, location]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    track('tab_viewed', {
      tab_name: tabId
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Please sign in to access the dashboard
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Unable to load user data. Please try refreshing the page.
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'games', label: 'My games' },
    { id: 'players', label: 'Stats' },
    { id: 'about', label: 'About' },
    ...(userData?.isAdmin ? [{ id: 'admin', label: 'Admin' }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Ruff Ryders Cup
            </h1>
            <div className="flex items-center space-x-4">
              <ThemeSwitcher />
              <div className="hidden sm:flex items-center space-x-2">
                {userData.linkedPlayerId && (
                  <PlayerEmoji
                    playerId={userData.linkedPlayerId}
                    name={userData.name}
                    customEmoji={userData.customEmoji}
                    size="sm"
                  />
                )}
                <span className="text-gray-600 dark:text-gray-300">
                  {userData.name || currentUser.email}
                </span>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="text-purple-500 hover:text-purple-600 dark:text-purple-400"
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'players' && <PlayerStats />}
        {activeTab === 'games' && (
          <GameManagement
            currentUser={currentUser}
            isAdmin={userData.isAdmin}
            linkedPlayerId={userData.linkedPlayerId}
          />
        )}
        {activeTab === 'admin' && userData?.isAdmin && <AdminPanel />}
        {activeTab === 'about' && <About />}
      </main>
    </div>
  );
}