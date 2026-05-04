import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Tournament2026 from './pages/Tournament2026';
import { clearLocalStorage } from './utils/storage';

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
    <Router>
      <Routes>
        <Route path="/" element={<Tournament2026 />} />
        <Route path="/2026" element={<Tournament2026 />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<Navigate to="/" replace />} />
        <Route path="/password-reset-complete" element={<Navigate to="/" replace />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
        <Route path="/score-entry/:tournamentId/:gameId" element={<Navigate to="/" replace />} />
        <Route path="/legacy/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}