import type { OllamaModel, PullProgress, ChatRequest, ChatResponse, EmbeddingResponse } from '../types';

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';

export class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  isVisionModel(modelName: string): boolean {
    const visionModels = ['llava', 'bakllava', 'moondream', 'cogvlm'];
    return visionModels.some((vm) => modelName.toLowerCase().includes(vm));
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(
          `Cannot connect to Ollama server at ${this.baseUrl}.\n\n` +
          `Please ensure:\n` +
          `1. Ollama is running (run: ollama serve)\n` +
          `2. CORS is enabled (set: OLLAMA_ORIGINS="http://localhost:5173")\n` +
          `3. Server is accessible at ${this.baseUrl}`
        );
      }
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

  async generateEmbedding(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate embedding: ${response.statusText}`);
      }

      const data: EmbeddingResponse = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateSummary(text: string, model: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: `Summarize the following conversation in 2-3 sentences, focusing on key topics and conclusions:\n\n${text}`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  async extractKeyPoints(text: string, model: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: `Extract 3-5 key points from this conversation. Return only a JSON array of strings:\n\n${text}`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract key points: ${response.statusText}`);
      }

      const data = await response.json();

      // Try to parse JSON from response
      try {
        const keyPoints = JSON.parse(data.response);
        return Array.isArray(keyPoints) ? keyPoints : [data.response];
      } catch {
        // If not valid JSON, split by newlines or return as single point
        return data.response.split('\n').filter((line: string) => line.trim());
      }
    } catch (error) {
      console.error('Error extracting key points:', error);
      return [];
    }
  }
}

export const ollamaService = new OllamaService();
