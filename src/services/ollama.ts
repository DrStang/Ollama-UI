import type { OllamaModel, PullProgress, ChatRequest, ChatResponse } from '../types';

const OLLAMA_BASE_URL = 'http://localhost:11434';

export class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing models:', error);
      throw error;
    }
  }

  async pullModel(
    modelName: string,
    onProgress?: (progress: PullProgress) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const progress: PullProgress = JSON.parse(line);
            onProgress?.(progress);
          } catch (e) {
            console.error('Error parsing progress:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error pulling model:', error);
      throw error;
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  }

  async chat(
    request: ChatRequest,
    onMessage?: (message: string) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to chat: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let fullMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data: ChatResponse = JSON.parse(line);
            if (data.message?.content) {
              fullMessage += data.message.content;
              onMessage?.(fullMessage);
            }
          } catch (e) {
            console.error('Error parsing chat response:', e);
          }
        }
      }

      return fullMessage;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }
}

export const ollamaService = new OllamaService();
