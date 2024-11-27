import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BlogList from '../components/blog/BlogList';

export default function Blog() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold dark:text-white">Blog</h1>
          {currentUser?.isAdmin && (
            <button
              onClick={() => navigate('/blog/new')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              New Post
            </button>
          )}
        </div>

        <BlogList />
      </div>
    </div>
  );
}