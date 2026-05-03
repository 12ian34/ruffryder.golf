import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { usePostHog } from '../hooks/usePostHog';
import About from './About';
import Dashboard from './Dashboard';
import Login from './Login';
import PasswordResetComplete from './PasswordResetComplete';
import Profile from './Profile';
import ScoreEntryPage from './ScoreEntryPage';

export default function LegacyApp() {
  return (
    <AuthProvider>
      <LegacyPostHogSync />
      <Routes>
        <Route index element={<Login />} />
        <Route path="login" element={<Login />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="password-reset-complete" element={<PasswordResetComplete />} />
        <Route path="about" element={<About />} />
        <Route path="score-entry/:tournamentId/:gameId" element={<ScoreEntryPage />} />
        <Route path="*" element={<Navigate to="/legacy" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function LegacyPostHogSync() {
  usePostHog();

  return null;
}
