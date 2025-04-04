import { format } from 'date-fns';
import type { BlogPost as BlogPostType } from '../../types/blog';
import AttachmentList from './AttachmentList';

interface BlogPostProps {
  post: BlogPostType;
}

export default function BlogPost({ post }: BlogPostProps) {
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

      <AttachmentList attachments={post.attachments} />
    </article>
  );
}