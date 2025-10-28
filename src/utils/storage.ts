import type { ChatSession } from '../types';

const STORAGE_KEY = 'ollama-chat-sessions';

export class StorageService {
  static getChatSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      return [];
    }
  }

  static saveChatSession(session: ChatSession): void {
    try {
      const sessions = this.getChatSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);

      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }

  static deleteChatSession(sessionId: string): void {
    try {
      const sessions = this.getChatSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  }

  static getChatSession(sessionId: string): ChatSession | null {
    try {
      const sessions = this.getChatSessions();
      return sessions.find(s => s.id === sessionId) || null;
    } catch (error) {
      console.error('Error getting chat session:', error);
      return null;
    }
  }
}
