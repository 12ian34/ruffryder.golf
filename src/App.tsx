import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Tournament2026 from './pages/Tournament2026';
import { clearLocalStorage } from './utils/storage';

const LegacyApp = lazy(() => import('./pages/LegacyApp'));

export default function App() {
  useEffect(() => {
    // Clear localStorage on app initialization to prevent conflicts
    clearLocalStorage();
  }, []);

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Tournament2026 />} />
          <Route path="/2026" element={<Tournament2026 />} />
          <Route path="/login" element={<RedirectWithSearch to="/legacy" />} />
          <Route path="/dashboard" element={<Navigate to="/legacy/dashboard" replace />} />
          <Route path="/profile" element={<Navigate to="/legacy/profile" replace />} />
          <Route path="/password-reset-complete" element={<RedirectWithSearch to="/legacy/password-reset-complete" />} />
          <Route path="/about" element={<Navigate to="/legacy/about" replace />} />
          <Route path="/score-entry/:tournamentId/:gameId" element={<LegacyScoreEntryRedirect />} />
          <Route
            path="/legacy/*"
            element={
              <Suspense fallback={<div className="min-h-screen bg-gray-950 text-gray-100" />}>
                <LegacyApp />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
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

function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation();

  return <Navigate to={`${to}${search}`} replace />;
}

function LegacyScoreEntryRedirect() {
  const { gameId, tournamentId } = useParams<{ gameId: string; tournamentId: string }>();

  if (!gameId || !tournamentId) {
    return <Navigate to="/legacy/dashboard" replace />;
  }

  return <Navigate to={`/legacy/score-entry/${tournamentId}/${gameId}`} replace />;
}