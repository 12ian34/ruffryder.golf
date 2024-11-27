import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { format } from 'date-fns';
import type { BlogPost } from '../../types/blog';

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsQuery = query(
          collection(db, 'blog-posts'),
          where('status', '==', 'published'),
          orderBy('publishedAt', 'desc')
        );

        const snapshot = await getDocs(postsQuery);
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          publishedAt: doc.data().publishedAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as BlogPost[];

        setPosts(postsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => (
        <article 
          key={post.id} 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(`/blog/${post.id}`)}
        >
          <div className="group">
            <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-500 dark:text-white">
              {post.title}
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              By {post.authorName} • {format(post.publishedAt, 'MMMM d, yyyy')}
            </div>
            <div 
              className="prose dark:prose-invert line-clamp-3 mb-4"
              dangerouslySetInnerHTML={{ 
                __html: post.content.substring(0, 300) + '...' 
              }}
            />
            {post.attachments.length > 0 && (
              <div className="mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {post.attachments.length} attachment{post.attachments.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <div className="text-blue-500 group-hover:text-blue-600 dark:text-blue-400 flex items-center">
              <span>Read more</span>
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </article>
      ))}

      {posts.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          No posts found
        </div>
      )}
    </div>
  );
}