import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Leaderboard from '../components/Leaderboard';
import PlayerStats from '../components/PlayerStats';
import GameManagement from '../components/GameManagement';
import AdminPanel from '../components/AdminPanel';
import BlogList from '../components/blog/BlogList';
import ThemeSwitcher from '../components/ThemeSwitcher';
import About from './About';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types/user';
import type { BlogPost } from '../types/blog';
import PlayerEmoji from '../components/PlayerEmoji';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      window.history.replaceState({}, document.title);
    }

    const fetchData = async () => {
      try {
        const [userDoc, postsSnapshot] = await Promise.all([
          getDoc(doc(db, 'users', currentUser.uid)),
          getDocs(query(
            collection(db, 'blog-posts'),
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc')
          ))
        ]);

        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }

        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          publishedAt: doc.data().publishedAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as BlogPost[];
        setPosts(postsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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

  if (!currentUser || !userData) {
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

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'players', label: 'Players' },
    { id: 'games', label: 'Games' },
    { id: 'blog', label: 'Blog' },
    { id: 'about', label: 'About' },
    ...(userData?.isAdmin ? [{ id: 'admin', label: 'Admin' }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
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
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'players' && <PlayerStats />}
        {activeTab === 'games' && <GameManagement />}
        {activeTab === 'blog' && <BlogList posts={posts} />}
        {activeTab === 'admin' && userData?.isAdmin && <AdminPanel />}
        {activeTab === 'about' && <About />}
      </main>
    </div>
  );
}