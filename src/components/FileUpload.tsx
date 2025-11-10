import { useRef } from 'react';
import type { Attachment } from '../types';
import { DocumentParser } from '../services/documentParser';
import './FileUpload.css';

interface FileUploadProps {
  onFileUpload: (attachment: Attachment) => void;
  acceptImages?: boolean;
  acceptDocuments?: boolean;
  disabled?: boolean;
}

export function FileUpload({ onFileUpload, acceptImages = true, acceptDocuments = true, disabled = false }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [];
  if (acceptImages) {
    acceptedTypes.push('image/*');
  }
  if (acceptDocuments) {
    acceptedTypes.push('.pdf', '.txt', '.doc', '.docx', 'text/*');
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const attachment = await DocumentParser.parseFile(file);
        onFileUpload(attachment);
      } catch (error) {
        console.error('Error processing file:', error);
        alert(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept={acceptedTypes.join(',')}
        multiple
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="file-upload-button"
        title="Attach files or images"
      >
        📎
      </button>
    </>
  );
}
