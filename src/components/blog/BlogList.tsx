import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { BlogPost } from '../../types/blog';

interface BlogListProps {
  posts: BlogPost[];
}

export default function BlogList({ posts }: BlogListProps) {
  const navigate = useNavigate();

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No posts found</p>
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
    </div>
  );
}