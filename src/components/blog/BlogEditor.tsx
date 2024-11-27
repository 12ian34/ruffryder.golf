import { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useDropzone } from 'react-dropzone';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { BlogPost, BlogAttachment } from '../../types/blog';

interface BlogEditorProps {
  initialContent?: string;
  initialTitle?: string;
  postId?: string;
  onSave: (post: Partial<BlogPost>) => Promise<void>;
}

export default function BlogEditor({ initialContent = '', initialTitle = '', postId, onSave }: BlogEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [attachments, setAttachments] = useState<BlogAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: initialContent,
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!editor) return;

    setIsUploading(true);
    setError(null);

    try {
      const storage = getStorage();
      const newAttachments: BlogAttachment[] = [];
      
      for (const file of acceptedFiles) {
        const timestamp = Date.now();
        const fileRef = ref(storage, `blog/${postId || 'new'}/${timestamp}-${file.name}`);
        
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        const attachment: BlogAttachment = {
          type: file.type.startsWith('image/') ? 'image' : 'pdf',
          url,
          filename: file.name,
          size: file.size
        };

        newAttachments.push(attachment);

        if (file.type.startsWith('image/')) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  }, [editor, postId]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'application/pdf': []
    }
  });

  const handleSave = async (status: 'draft' | 'published') => {
    if (!editor || !title.trim()) {
      setError('Please enter a title');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await onSave({
        title: title.trim(),
        content: editor.getHTML(),
        status,
        attachments,
        publishedAt: status === 'published' ? new Date() : null,
        updatedAt: new Date(),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
        className="w-full px-4 py-2 text-2xl font-bold border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:ring-0 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
      />

      <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900 p-2 border-b dark:border-gray-700">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
              editor?.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
          >
            Bold
          </button>
          {/* Add more formatting buttons as needed */}
        </div>

        <EditorContent editor={editor} className="prose dark:prose-invert max-w-none p-4" />
      </div>

      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
        <input {...getInputProps()} />
        <p className="text-gray-600 dark:text-gray-400">
          {isUploading ? 'Uploading...' : 'Drag & drop files here, or click to select files'}
        </p>
      </div>

      {attachments.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2 dark:text-white">Attachments</h3>
          <ul className="space-y-2">
            {attachments.map((attachment) => (
              <li key={attachment.url} className="flex items-center space-x-2">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
                >
                  {attachment.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => handleSave('draft')}
          disabled={isSaving}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {isSaving ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}