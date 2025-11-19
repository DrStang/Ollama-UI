import { useState, useEffect, useRef } from 'react';
import { ollamaService } from '../services/ollama';
import { documentService } from '../services/document';
import { memoryService } from '../services/memory';
import { StorageService } from '../utils/storage';
import type { OllamaModel, ChatSession, Message, Attachment, MessageImage } from '../types';
import './Chat.css';

export function Chat() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [showSystemPrompt, setShowSystemPrompt] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // New state for RAG and Memory
  const [useRAG, setUseRAG] = useState<boolean>(true);
  const [useMemory, setUseMemory] = useState<boolean>(true);
  const [isVisionModel, setIsVisionModel] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadModels();
    loadSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, streamingMessage]);

  useEffect(() => {
    if (currentSession?.systemPrompt !== undefined) {
      setSystemPrompt(currentSession.systemPrompt);
    } else {
      setSystemPrompt('');
    }
  }, [currentSession?.id]);

  useEffect(() => {
    checkIfVisionModel();
  }, [selectedModel]);

  const checkIfVisionModel = async () => {
    if (selectedModel) {
      const isVision = await ollamaService.checkModelSupportsVision(selectedModel);
      setIsVisionModel(isVision);
    }
  };

  const loadModels = async () => {
    try {
      const modelList = await ollamaService.listModels();
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0].name);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const loadSessions = () => {
    const loadedSessions = StorageService.getChatSessions();
    setSessions(loadedSessions);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      model: selectedModel || models[0]?.name || '',
      systemPrompt: '',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCurrentSession(newSession);
    setSystemPrompt('');
  };

  const loadSession = (sessionId: string) => {
    const session = StorageService.getChatSession(sessionId);
    if (session) {
      setCurrentSession(session);
      setSelectedModel(session.model);
      setSystemPrompt(session.systemPrompt || '');
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      // Create memory from session before deleting
      const session = StorageService.getChatSession(sessionId);
      if (session && useMemory) {
        await memoryService.createMemoryFromSession(session);
      }

      StorageService.deleteChatSession(sessionId);
      loadSessions();
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    }
  };

  const saveCurrentSession = (session: ChatSession) => {
    if (session.messages.length === 2 && session.title === 'New Chat') {
      const firstMessage = session.messages[0].content;
      session.title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    }

    session.updatedAt = Date.now();
    StorageService.saveChatSession(session);
    loadSessions();
  };

  const startRenaming = (sessionId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const saveRename = (sessionId: string) => {
    if (editingTitle.trim()) {
      const session = StorageService.getChatSession(sessionId);
      if (session) {
        session.title = editingTitle.trim();
        StorageService.saveChatSession(session);
        loadSessions();
        if (currentSession?.id === sessionId) {
          setCurrentSession({ ...currentSession, title: editingTitle.trim() });
        }
      }
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const cancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleSystemPromptSave = () => {
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        systemPrompt: systemPrompt.trim(),
      };
      setCurrentSession(updatedSession);
      saveCurrentSession(updatedSession);
    }
    setShowSystemPrompt(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && selectedFiles.length === 0) || isLoading || !selectedModel) return;

    setUploadingFiles(true);
    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
    };

    // Process attachments
    const attachments: Attachment[] = [];
    const images: MessageImage[] = [];

    for (const file of selectedFiles) {
      if (file.type.startsWith('image/')) {
        // Handle images for vision models
        try {
          const base64 = await convertFileToBase64(file);
          images.push({
            data: base64,
            mimeType: file.type,
          });

          // Also add as attachment for display
          attachments.push({
            id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
            uploadedAt: Date.now(),
          });
        } catch (error) {
          console.error('Error processing image:', error);
        }
      } else {
        // Handle documents for RAG
        try {
          if (useRAG) {
            await documentService.processDocument(file);
          }

          attachments.push({
            id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: Date.now(),
          });
        } catch (error) {
          console.error('Error processing document:', error);
          alert(`Failed to process ${file.name}`);
        }
      }
    }

    if (images.length > 0) {
      userMessage.images = images;
    }
    if (attachments.length > 0) {
      userMessage.attachments = attachments;
    }

    let session = currentSession;
    if (!session) {
      session = {
        id: Date.now().toString(),
        title: 'New Chat',
        model: selectedModel,
        systemPrompt: systemPrompt.trim(),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setCurrentSession(session);
    }

    const updatedSession = {
      ...session,
      model: selectedModel,
      systemPrompt: systemPrompt.trim(),
      messages: [...session.messages, userMessage],
    };
    setCurrentSession(updatedSession);
    setInputMessage('');
    setSelectedFiles([]);
    setUploadingFiles(false);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const messagesToSend: Message[] = [];

      // Add system prompt if present
      if (systemPrompt.trim()) {
        messagesToSend.push({
          role: 'system',
          content: systemPrompt.trim(),
        });
      }

      // Add RAG context if enabled
      if (useRAG) {
        try {
          const ragContext = await documentService.searchRelevantContext(inputMessage.trim(), 5, 0.5);
          if (ragContext.chunks.length > 0) {
            const contextText = documentService.formatRAGContext(ragContext);
            messagesToSend.push({
              role: 'system',
              content: contextText,
            });
          }
        } catch (error) {
          console.error('Error retrieving RAG context:', error);
        }
      }

      // Add memory context if enabled
      if (useMemory && session) {
        try {
          const memoryContext = await memoryService.searchRelevantMemories(
            inputMessage.trim(),
            session.id,
            3
          );
          if (memoryContext.memories.length > 0) {
            const contextText = memoryService.formatMemoryContext(memoryContext);
            messagesToSend.push({
              role: 'system',
              content: contextText,
            });
          }
        } catch (error) {
          console.error('Error retrieving memory context:', error);
        }
      }

      // Add all conversation messages and convert MessageImage[] to string[] for Ollama API
      messagesToSend.push(...updatedSession.messages);

      const apiMessages = messagesToSend.map(msg => {
        const transformedMsg: any = {
          role: msg.role,
          content: msg.content,
        };  
        if (msg.images && msg.images.length > 0) {
          transformedMsg.images = msg.images.map(img =>
          typeof img === 'string' ? img : img.data
          );
        }      
        return transformedMsg;
    });
      const response = await ollamaService.chat(
        {
          model: selectedModel,
          messages: apiMessages,
        },
        (partialMessage) => {
          setStreamingMessage(partialMessage);
        }
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
      };
      setCurrentSession(finalSession);
      saveCurrentSession(finalSession);
      setStreamingMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Chat History</h2>
          <button onClick={() => setShowSidebar(!showSidebar)} className="toggle-sidebar">
            {showSidebar ? '‹' : '›'}
          </button>
        </div>

        {showSidebar && (
          <>
            <button onClick={createNewChat} className="new-chat-button">
              + New Chat
            </button>

            <div className="sessions-list">
              {sessions.length === 0 ? (
                <div className="empty-sessions">No chat history yet</div>
              ) : (
                sessions
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((session) => (
                    <div
                      key={session.id}
                      className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                      onClick={() => editingSessionId !== session.id && loadSession(session.id)}
                    >
                      <div className="session-info">
                        {editingSessionId === session.id ? (
                          <div className="session-title-edit">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveRename(session.id);
                                } else if (e.key === 'Escape') {
                                  cancelRename();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="rename-input"
                            />
                            <div className="rename-actions">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveRename(session.id);
                                }}
                                className="save-rename"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelRename();
                                }}
                                className="cancel-rename"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="session-title-container">
                            <div className="session-title">{session.title}</div>
                            <button
                              onClick={(e) => startRenaming(session.id, session.title, e)}
                              className="rename-session"
                              title="Rename chat"
                            >
                              ✎
                            </button>
                          </div>
                        )}
                        <div className="session-meta">
                          <span className="session-model">{session.model}</span>
                          <span className="session-date">
                            {new Date(session.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {editingSessionId !== session.id && (
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="delete-session"
                          title="Delete chat"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="model-selector">
            <label htmlFor="model-select">Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoading}
            >
              {models.length === 0 ? (
                <option>No models available</option>
              ) : (
                models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="header-buttons">
            <button
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className={`system-prompt-toggle ${systemPrompt.trim() ? 'active' : ''}`}
              title={systemPrompt.trim() ? 'System prompt set' : 'Set system prompt'}
            >
              {systemPrompt.trim() ? '⚙️ System Prompt ✓' : '⚙️ System Prompt'}
            </button>

            <button
              onClick={() => setUseRAG(!useRAG)}
              className={`feature-toggle ${useRAG ? 'active' : ''}`}
              title={useRAG ? 'RAG enabled' : 'RAG disabled'}
            >
              📚 RAG {useRAG ? '✓' : ''}
            </button>

            <button
              onClick={() => setUseMemory(!useMemory)}
              className={`feature-toggle ${useMemory ? 'active' : ''}`}
              title={useMemory ? 'Memory enabled' : 'Memory disabled'}
            >
              🧠 Memory {useMemory ? '✓' : ''}
            </button>
          </div>
        </div>

        {showSystemPrompt && (
          <div className="system-prompt-editor">
            <div className="system-prompt-header">
              <label htmlFor="system-prompt">System Prompt</label>
              <span className="system-prompt-info">
                Set instructions or context for the AI assistant
              </span>
            </div>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g., You are a helpful coding assistant. Always provide clear explanations with code examples."
              rows={4}
              className="system-prompt-textarea"
            />
            <div className="system-prompt-actions">
              <button
                onClick={handleSystemPromptSave}
                className="save-system-prompt"
              >
                Save
              </button>
              <button
                onClick={() => setShowSystemPrompt(false)}
                className="cancel-system-prompt"
              >
                Cancel
              </button>
              {systemPrompt.trim() && (
                <button
                  onClick={() => {
                    setSystemPrompt('');
                    if (currentSession) {
                      const updatedSession = { ...currentSession, systemPrompt: '' };
                      setCurrentSession(updatedSession);
                      saveCurrentSession(updatedSession);
                    }
                  }}
                  className="clear-system-prompt"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className="messages-container">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="empty-chat">
              <h2>Start a conversation</h2>
              <p>Select a model and send a message to begin</p>
              {isVisionModel && (
                <p className="vision-info">🖼️ Vision model detected - you can upload images!</p>
              )}
              {useRAG && (
                <p className="rag-info">📚 RAG enabled - upload documents for context-aware responses</p>
              )}
              {useMemory && (
                <p className="memory-info">🧠 Memory enabled - AI will remember context from past conversations</p>
              )}
            </div>
          ) : (
            <>
              {currentSession.messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-role">
                    {message.role === 'user' ? '👤 You' :
                     message.role === 'system' ? '⚙️ System' : '🤖 Assistant'}
                  </div>
                  <div className="message-content">
                    {message.images && message.images.length > 0 && (
                      <div className="message-images">
                        {message.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={`data:${img.mimeType};base64,${img.data}`}
                            alt={`Uploaded image ${idx + 1}`}
                            className="message-image"
                          />
                        ))}
                      </div>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="message-attachments">
                        {message.attachments.map((att, idx) => (
                          <div key={idx} className="attachment-item">
                            📎 {att.name} ({(att.size / 1024).toFixed(1)} KB)
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="message-text">{message.content}</div>
                  </div>
                </div>
              ))}

              {streamingMessage && (
                <div className="message assistant streaming">
                  <div className="message-role">🤖 Assistant</div>
                  <div className="message-content">{streamingMessage}</div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="input-form">
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              {selectedFiles.map((file, index) => (
                <div key={index} className="selected-file">
                  <span>
                    {file.type.startsWith('image/') ? '🖼️' : '📄'} {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    className="remove-file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-row">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="attach-button"
              disabled={isLoading}
              title="Attach files"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              multiple
              accept={isVisionModel ? "image/*,.pdf,.txt" : ".pdf,.txt"}
              style={{ display: 'none' }}
            />
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              disabled={isLoading || models.length === 0}
              rows={3}
            />
            <button
              type="submit"
              disabled={isLoading || (!inputMessage.trim() && selectedFiles.length === 0) || models.length === 0}
            >
              {uploadingFiles ? 'Processing...' : isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
