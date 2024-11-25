import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { usePostHog } from './hooks/usePostHog';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PasswordResetComplete from './pages/PasswordResetComplete';

export default function AppContent() {
  // Initialize PostHog tracking
  usePostHog();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/password-reset-complete" element={<PasswordResetComplete />} />
      </Routes>
    </Router>
  );
}