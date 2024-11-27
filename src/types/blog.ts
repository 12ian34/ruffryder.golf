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
  data: string; // Base64 encoded data
  filename: string;
  size: number;
  contentType: string;
}