import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import BlogEditor from '../components/blog/BlogEditor';
import type { BlogPost } from '../types/blog';

export default function EditBlogPost() {
  const { postId } = useParams<{ postId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          } as BlogPost);
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

  const handleSave = async (updates: Partial<BlogPost>) => {
    if (!currentUser || !postId) return;

    try {
      const postRef = doc(db, 'blog-posts', postId);
      await updateDoc(postRef, {
        ...updates,
        updatedAt: new Date(),
      });

      showSuccessToast('Blog post updated successfully!');
      navigate(`/blog/${postId}`);
    } catch (err: any) {
      showErrorToast('Failed to update blog post');
      throw err;
    }
  };

  const handleCancel = () => {
    navigate(`/blog/${postId}`);
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold dark:text-white">Edit Blog Post</h1>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
        <BlogEditor
          initialContent={post.content}
          initialTitle={post.title}
          initialAttachments={post.attachments}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}