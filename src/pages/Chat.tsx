import { useState, useEffect, useRef } from 'react';
import { ollamaService } from '../services/ollama';
import { StorageService } from '../utils/storage';
import type { OllamaModel, ChatSession, Message } from '../types';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
    loadSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, streamingMessage]);

  // Update system prompt when session changes
  useEffect(() => {
    if (currentSession?.systemPrompt !== undefined) {
      setSystemPrompt(currentSession.systemPrompt);
    } else {
      setSystemPrompt('');
    }
  }, [currentSession?.id]);

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

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      StorageService.deleteChatSession(sessionId);
      loadSessions();
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    }
  };

  const saveCurrentSession = (session: ChatSession) => {
    // Update title based on first message (after first exchange: user + assistant = 2 messages)
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || !selectedModel) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
    };

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

    // FIX: Update model to currently selected model
    const updatedSession = {
      ...session,
      model: selectedModel,
      systemPrompt: systemPrompt.trim(),
      messages: [...session.messages, userMessage],
    };
    setCurrentSession(updatedSession);
    setInputMessage('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // Build messages array with system prompt if present
      const messagesToSend: Message[] = [];

      if (systemPrompt.trim()) {
        messagesToSend.push({
          role: 'system',
          content: systemPrompt.trim(),
        });
      }

      // Add all conversation messages
      messagesToSend.push(...updatedSession.messages);

      const response = await ollamaService.chat(
        {
          model: selectedModel,
          messages: messagesToSend,
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

          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className={`system-prompt-toggle ${systemPrompt.trim() ? 'active' : ''}`}
            title={systemPrompt.trim() ? 'System prompt set' : 'Set system prompt'}
          >
            {systemPrompt.trim() ? '⚙️ System Prompt ✓' : '⚙️ System Prompt'}
          </button>
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
              {systemPrompt.trim() && (
                <div className="system-prompt-preview">
                  <strong>System Prompt Active:</strong> {systemPrompt.slice(0, 100)}
                  {systemPrompt.length > 100 ? '...' : ''}
                </div>
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
                  <div className="message-content">{message.content}</div>
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
          <button type="submit" disabled={isLoading || !inputMessage.trim() || models.length === 0}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
