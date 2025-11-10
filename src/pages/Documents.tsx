import { useState, useEffect } from 'react';
import { documentService } from '../services/document';
import { memoryService } from '../services/memory';
import type { Document, Memory } from '../types';
import './Documents.css';

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'memories'>('documents');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadMemories();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await documentService.getAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMemories = async () => {
    try {
      const mems = await memoryService.getAllMemories();
      setMemories(mems);
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);

    for (const file of Array.from(files)) {
      try {
        await documentService.processDocument(file, true);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploadingFile(false);
    loadDocuments();

    // Reset file input
    e.target.value = '';
  };

  const handleDeleteDocument = async (docId: string) => {
    if (confirm('Are you sure you want to delete this document? This will also remove all associated chunks.')) {
      try {
        await documentService.deleteDocument(docId);
        loadDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document');
      }
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (confirm('Are you sure you want to delete this memory?')) {
      try {
        await memoryService.deleteMemory(memoryId);
        loadMemories();
      } catch (error) {
        console.error('Error deleting memory:', error);
        alert('Failed to delete memory');
      }
    }
  };

  const handleClearAllMemories = async () => {
    if (confirm('Are you sure you want to clear ALL memories? This cannot be undone.')) {
      try {
        await memoryService.clearAllMemories();
        loadMemories();
      } catch (error) {
        console.error('Error clearing memories:', error);
        alert('Failed to clear memories');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="documents-page">
      <div className="documents-header">
        <h1>Knowledge Base</h1>
        <p>Manage your documents and conversation memories for RAG and context retention</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          📄 Documents ({documents.length})
        </button>
        <button
          className={`tab ${activeTab === 'memories' ? 'active' : ''}`}
          onClick={() => setActiveTab('memories')}
        >
          🧠 Memories ({memories.length})
        </button>
      </div>

      {activeTab === 'documents' && (
        <div className="tab-content">
          <div className="upload-section">
            <label htmlFor="file-upload" className="upload-button">
              {uploadingFile ? '⏳ Uploading...' : '📤 Upload Documents'}
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              style={{ display: 'none' }}
            />
            <p className="upload-info">
              Upload PDF or text files. Documents will be processed, chunked, and embedded for RAG.
            </p>
          </div>

          {isLoading ? (
            <div className="loading">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <p>No documents uploaded yet</p>
              <p className="empty-hint">Upload documents to enable RAG-powered conversations</p>
            </div>
          ) : (
            <div className="documents-list">
              {documents.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="document-icon">
                    {doc.type === 'application/pdf' ? '📕' : '📄'}
                  </div>
                  <div className="document-info">
                    <h3>{doc.name}</h3>
                    <div className="document-meta">
                      <span>📊 {doc.chunks.length} chunks</span>
                      <span>💾 {formatSize(doc.size)}</span>
                      <span>📅 {formatDate(doc.uploadedAt)}</span>
                    </div>
                    <div className="document-preview">
                      {doc.content.slice(0, 200)}...
                    </div>
                  </div>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'memories' && (
        <div className="tab-content">
          <div className="memories-header">
            <p className="memories-info">
              Memories are automatically created from your conversations to provide context across chats.
            </p>
            {memories.length > 0 && (
              <button
                className="clear-all-button"
                onClick={handleClearAllMemories}
              >
                🗑️ Clear All Memories
              </button>
            )}
          </div>

          {memories.length === 0 ? (
            <div className="empty-state">
              <p>No memories yet</p>
              <p className="empty-hint">Memories will be created automatically as you chat</p>
            </div>
          ) : (
            <div className="memories-list">
              {memories
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((memory) => (
                  <div key={memory.id} className="memory-card">
                    <div className="memory-header">
                      <div className="memory-meta">
                        <span className="memory-date">{formatDate(memory.createdAt)}</span>
                        <span className="memory-importance" title="Importance score">
                          ⭐ {(memory.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                      <button
                        className="delete-button-small"
                        onClick={() => handleDeleteMemory(memory.id)}
                        title="Delete memory"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="memory-summary">{memory.summary}</div>
                    {memory.keywords.length > 0 && (
                      <div className="memory-keywords">
                        {memory.keywords.map((keyword, idx) => (
                          <span key={idx} className="keyword">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
