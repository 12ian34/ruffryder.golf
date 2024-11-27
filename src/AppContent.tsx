import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { usePostHog } from './hooks/usePostHog';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PasswordResetComplete from './pages/PasswordResetComplete';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import NewBlogPost from './pages/NewBlogPost';
import EditBlogPost from './pages/EditBlogPost';

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
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/new" element={<NewBlogPost />} />
        <Route path="/blog/edit/:postId" element={<EditBlogPost />} />
        <Route path="/blog/:postId" element={<BlogPost />} />
      </Routes>
    </Router>
  );
}