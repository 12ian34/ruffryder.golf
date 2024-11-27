import { format } from 'date-fns';
import type { BlogPost as BlogPostType } from '../../types/blog';

interface BlogPostProps {
  post: BlogPostType;
}

export default function BlogPost({ post }: BlogPostProps) {
  const downloadAttachment = (attachment: BlogPostType['attachments'][0]) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <article>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">{post.title}</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          By {post.authorName} • {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
        </div>
      </header>

      <div 
        className="prose dark:prose-invert max-w-none blog-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {post.attachments.length > 0 && (
        <div className="mt-8 border-t dark:border-gray-700 pt-4">
          <h3 className="text-lg font-semibold mb-2 dark:text-white">Attachments</h3>
          <ul className="space-y-2">
            {post.attachments.map((attachment) => (
              <li key={attachment.filename}>
                <button
                  onClick={() => downloadAttachment(attachment)}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
                >
                  {attachment.filename}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}