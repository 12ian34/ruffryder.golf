import { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import AttachmentManager from './AttachmentManager';
import * as Icons from './EditorIcons';
import type { BlogPost, BlogAttachment } from '../../types/blog';

interface BlogEditorProps {
  initialContent?: string;
  initialTitle?: string;
  initialAttachments?: BlogAttachment[];
  onSave: (post: Partial<BlogPost>) => Promise<void>;
}

export default function BlogEditor({ 
  initialContent = '', 
  initialTitle = '', 
  initialAttachments = [],
  onSave 
}: BlogEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [attachments, setAttachments] = useState<BlogAttachment[]>(initialAttachments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Underline,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none min-h-[400px] focus:outline-none',
      },
    },
  });

  const handleSave = async (status: 'draft' | 'published') => {
    if (!editor || !title.trim()) {
      setError('Please enter a title');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await onSave({
        title: title.trim(),
        content: editor.getHTML(),
        status,
        attachments,
        publishedAt: status === 'published' ? new Date() : undefined,
        updatedAt: new Date(),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const renderToolbarButton = (
    onClick: () => void,
    icon: JSX.Element,
    label: string,
    isActive = false
  ) => (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
        isActive ? 'bg-gray-200 dark:bg-gray-700' : ''
      }`}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );

  if (!editor) return null;

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
        className="w-full px-4 py-2 text-2xl font-bold border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:ring-0 focus:border-purple-500 dark:bg-gray-800 dark:text-white"
      />

      <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Editor Toolbar */}
        <div className="bg-gray-50 dark:bg-gray-900 p-2 border-b dark:border-gray-700 flex flex-wrap gap-1">
          {/* Text Style */}
          <div className="flex space-x-1 mr-4">
            {renderToolbarButton(
              () => editor.chain().focus().toggleBold().run(),
              <Icons.BoldIcon />,
              'Bold',
              editor.isActive('bold')
            )}
            {renderToolbarButton(
              () => editor.chain().focus().toggleItalic().run(),
              <Icons.ItalicIcon />,
              'Italic',
              editor.isActive('italic')
            )}
            {renderToolbarButton(
              () => editor.chain().focus().toggleUnderline().run(),
              <Icons.UnderlineIcon />,
              'Underline',
              editor.isActive('underline')
            )}
            {renderToolbarButton(
              () => editor.chain().focus().toggleStrike().run(),
              <Icons.StrikethroughIcon />,
              'Strikethrough',
              editor.isActive('strike')
            )}
          </div>

          {/* Headings */}
          <div className="flex space-x-1 mr-4">
            {renderToolbarButton(
              () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
              <Icons.Heading1Icon />,
              'Heading 1',
              editor.isActive('heading', { level: 1 })
            )}
            {renderToolbarButton(
              () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              <Icons.Heading2Icon />,
              'Heading 2',
              editor.isActive('heading', { level: 2 })
            )}
          </div>

          {/* Lists */}
          <div className="flex space-x-1 mr-4">
            {renderToolbarButton(
              () => editor.chain().focus().toggleBulletList().run(),
              <Icons.ListBulletIcon />,
              'Bullet List',
              editor.isActive('bulletList')
            )}
            {renderToolbarButton(
              () => editor.chain().focus().toggleOrderedList().run(),
              <Icons.ListNumberedIcon />,
              'Numbered List',
              editor.isActive('orderedList')
            )}
          </div>

          {/* Block Elements */}
          <div className="flex space-x-1 mr-4">
            {renderToolbarButton(
              () => editor.chain().focus().toggleBlockquote().run(),
              <Icons.QuoteIcon />,
              'Blockquote',
              editor.isActive('blockquote')
            )}
            {renderToolbarButton(
              () => editor.chain().focus().toggleCodeBlock().run(),
              <Icons.CodeIcon />,
              'Code Block',
              editor.isActive('codeBlock')
            )}
          </div>

          {/* Links */}
          <div className="flex space-x-1 mr-4">
            {renderToolbarButton(
              setLink,
              <Icons.LinkIcon />,
              'Add Link',
              editor.isActive('link')
            )}
          </div>

          {/* Divider */}
          <div className="flex space-x-1 mr-4">
            {renderToolbarButton(
              () => editor.chain().focus().setHorizontalRule().run(),
              <Icons.DividerIcon />,
              'Add Divider'
            )}
          </div>

          {/* Undo/Redo */}
          <div className="flex space-x-1">
            {renderToolbarButton(
              () => editor.chain().focus().undo().run(),
              <Icons.UndoIcon />,
              'Undo'
            )}
            {renderToolbarButton(
              () => editor.chain().focus().redo().run(),
              <Icons.RedoIcon />,
              'Redo'
            )}
          </div>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} className="prose dark:prose-invert max-w-none p-4" />
      </div>

      {/* Attachments */}
      <AttachmentManager
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        disabled={isLoading}
      />

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => handleSave('draft')}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={isLoading}
          className="px-4 py-2 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200"
        >
          {isLoading ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}