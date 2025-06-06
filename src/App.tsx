import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { usePostHog } from './hooks/usePostHog';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import About from './pages/About';
import PasswordResetComplete from './pages/PasswordResetComplete';
import ScoreEntryPage from './pages/ScoreEntryPage';
import { clearLocalStorage } from './utils/storage';

export default function App() {
  useEffect(() => {
    // Clear localStorage on app initialization to prevent conflicts
    clearLocalStorage();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  // Initialize PostHog tracking
  usePostHog();

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/password-reset-complete" element={<PasswordResetComplete />} />
          <Route path="/about" element={<About />} />
          <Route path="/score-entry/:tournamentId/:gameId" element={<ScoreEntryPage />} />
        </Routes>
      </Router>
      <Toaster 
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            maxWidth: '500px',
            padding: '12px 24px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}