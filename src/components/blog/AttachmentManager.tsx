import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { BlogAttachment } from '../../types/blog';

interface AttachmentManagerProps {
  attachments: BlogAttachment[];
  onAttachmentsChange: (attachments: BlogAttachment[]) => void;
  disabled?: boolean;
}

export default function AttachmentManager({ 
  attachments, 
  onAttachmentsChange,
  disabled = false 
}: AttachmentManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (disabled) return;

    setIsUploading(true);
    setError(null);

    try {
      const newAttachments: BlogAttachment[] = [];
      
      for (const file of acceptedFiles) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const attachment: BlogAttachment = {
          type: file.type.startsWith('image/') ? 'image' : 'pdf',
          data: base64,
          filename: file.name,
          size: file.size,
          contentType: file.type
        };

        newAttachments.push(attachment);
      }

      onAttachmentsChange([...attachments, ...newAttachments]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'application/pdf': []
    },
    maxSize: 5 * 1024 * 1024, // 5MB limit
    disabled
  });

  const removeAttachment = (filename: string) => {
    if (disabled) return;
    onAttachmentsChange(attachments.filter(a => a.filename !== filename));
  };

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className={`border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-purple-500 dark:hover:border-purple-400'
      }`}>
        <input {...getInputProps()} />
        <p className="text-gray-600 dark:text-gray-400">
          {isUploading ? 'Uploading...' : 'Drag & drop files here, or click to select files (max 5MB)'}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {attachments.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2 dark:text-white">Attachments</h3>
          <ul className="space-y-2">
            {attachments.map((attachment) => (
              <li key={attachment.filename} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span className="text-gray-700 dark:text-gray-300">
                  {attachment.filename}
                </span>
                {!disabled && (
                  <button
                    onClick={() => removeAttachment(attachment.filename)}
                    className="text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}