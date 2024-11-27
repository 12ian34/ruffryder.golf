export interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  publishedAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published';
  attachments: BlogAttachment[];
  tags: string[];
}

export interface BlogAttachment {
  type: 'pdf' | 'image';
  url: string;
  filename: string;
  size: number;
}