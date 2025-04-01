import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import BlogPostComponent from '../components/blog/BlogPost';
import type { BlogPost as BlogPostType } from '../types/blog';
import type { User } from '../types/user';

export default function BlogPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { currentUser } = useAuth();
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
          showErrorToast('Post not found');
        }
      } catch (err: any) {
        showErrorToast('Failed to load blog post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleEdit = () => {
    navigate(`/blog/edit/${postId}`);
  };

  const handleDelete = async () => {
    if (!postId || !window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'blog-posts', postId));
      showSuccessToast('Blog post deleted successfully');
      navigate('/dashboard', { state: { activeTab: 'blog' } });
    } catch (err: any) {
      showErrorToast('Failed to delete blog post');
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard', { state: { activeTab: 'blog' } });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Post not found
        </div>
      </div>
    );
  }

  const isAdmin = (currentUser as User | null)?.isAdmin;
  const isAuthor = currentUser?.uid === post.authorId;
  const canEdit = isAdmin || isAuthor;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-blue-500 hover:text-blue-600"
          >
            ← Back to Blog
          </button>

          {canEdit && (
            <div className="flex space-x-4">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Edit Post
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Post'}
              </button>
            </div>
          )}
        </div>

        <BlogPostComponent post={post} />
      </div>
    </div>
  );
}