import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import BlogEditor from '../components/blog/BlogEditor';
import type { BlogPost } from '../types/blog';

export default function NewBlogPost() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSave = async (post: Partial<BlogPost>) => {
    if (!currentUser) return;

    const newPost = {
      ...post,
      authorId: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email,
      tags: [],
    };

    const docRef = await addDoc(collection(db, 'blog-posts'), newPost);
    navigate(`/blog/${docRef.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8 dark:text-white">New Blog Post</h1>
        <BlogEditor onSave={handleSave} />
      </div>
    </div>
  );
}