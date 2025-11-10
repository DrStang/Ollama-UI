import type { Attachment } from '../types';
import './AttachmentDisplay.css';

interface AttachmentDisplayProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
  compact?: boolean;
}

export function AttachmentDisplay({ attachments, onRemove, compact = false }: AttachmentDisplayProps) {
  if (attachments.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`attachments-container ${compact ? 'compact' : ''}`}>
      {attachments.map((attachment) => (
        <div key={attachment.id} className={`attachment-item ${attachment.type}`}>
          {attachment.type === 'image' && (
            <div className="attachment-preview">
              <img
                src={`data:${attachment.mimeType};base64,${attachment.content}`}
                alt={attachment.name}
                className="attachment-image"
              />
            </div>
          )}

          <div className="attachment-info">
            <div className="attachment-name" title={attachment.name}>
              {attachment.type === 'image' && '🖼️ '}
              {attachment.type === 'pdf' && '📄 '}
              {attachment.type === 'document' && '📝 '}
              {attachment.type === 'text' && '📃 '}
              {attachment.name}
            </div>
            <div className="attachment-meta">
              {formatFileSize(attachment.size)}
            </div>
          </div>

          {onRemove && (
            <button
              onClick={() => onRemove(attachment.id)}
              className="remove-attachment"
              title="Remove attachment"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
