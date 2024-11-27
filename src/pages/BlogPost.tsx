import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import BlogPost from '../components/blog/BlogPost';
import type { BlogPost as BlogPostType } from '../types/blog';

export default function BlogPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;

      try {
        const postDoc = await getDoc(doc(db, 'blog-posts', postId));
        if (postDoc.exists()) {
          const data = postDoc.data();
          setPost({
            id: postDoc.id,
            ...data,
            publishedAt: data.publishedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as BlogPostType);
        } else {
          setError('Post not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleBack = () => {
    // Navigate to the dashboard's blog tab
    navigate('/dashboard', { state: { activeTab: 'blog' } });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Post not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-blue-500 hover:text-blue-600 mb-8"
        >
          ← Back to Blog
        </button>
        <BlogPost post={post} />
      </div>
    </div>
  );
}