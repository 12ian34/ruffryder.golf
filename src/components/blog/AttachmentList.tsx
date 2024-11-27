import type { BlogAttachment } from '../../types/blog';

interface AttachmentListProps {
  attachments: BlogAttachment[];
}

export default function AttachmentList({ attachments }: AttachmentListProps) {
  if (!attachments.length) return null;

  const downloadAttachment = (attachment: BlogAttachment) => {
    try {
      // Create blob from base64 data
      const byteCharacters = atob(attachment.data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.contentType });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  return (
    <div className="mt-8 border-t dark:border-gray-700 pt-4">
      <h3 className="text-lg font-semibold mb-2 dark:text-white">Attachments</h3>
      <ul className="space-y-2">
        {attachments.map((attachment, index) => (
          <li key={`${attachment.filename}-${index}`}>
            <button
              onClick={() => downloadAttachment(attachment)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center space-x-2"
            >
              <span>{attachment.type === 'image' ? '📷' : '📄'}</span>
              <span className="underline">{attachment.filename}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}