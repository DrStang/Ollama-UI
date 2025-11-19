import type { OllamaModel, PullProgress, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from '../types';

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
    onMessage?: (message: string) => void,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<string> {
    try {
      console.log('Ollama chat request:', JSON.stringify(request, null, 2));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama error response:', errorText);

        // Check for model runner crash
        if (errorText.includes('model runner has unexpectedly stopped') ||
            errorText.includes('resource limitations')) {
          const error = new Error('MODEL_RUNNER_CRASHED');
          (error as any).details = errorText;
          throw error;
        }

        throw new Error(`Failed to chat: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let fullMessage = '';

      try {
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

              // Check for errors in the response
              if (data.error) {
                console.error('Ollama streaming error:', data.error);
                if (data.error.includes('model runner') || data.error.includes('EOF')) {
                  const error = new Error('MODEL_RUNNER_CRASHED');
                  (error as any).details = data.error;
                  throw error;
                }
              }
            } catch (e) {
              if (e instanceof Error && e.message === 'MODEL_RUNNER_CRASHED') {
                throw e;
              }
              console.error('Error parsing chat response:', e);
            }
          }
        }
      } catch (readError) {
        // Handle stream reading errors (like EOF)
        if (readError instanceof Error) {
          if (readError.name === 'AbortError') {
            throw new Error('Request timeout - model took too long to respond');
          }

          // Check if it's an EOF or connection error during streaming
          if (readError.message.includes('EOF') ||
              readError.message.includes('connection') ||
              readError.message === 'MODEL_RUNNER_CRASHED') {
            // If we got some partial response, it might be worth retrying
            console.warn('Stream interrupted, partial message:', fullMessage);
            throw readError;
          }
        }
        throw readError;
      } finally {
        reader.releaseLock();
      }

      return fullMessage;
    } catch (error) {
      console.error('Error in chat:', error);

      // Check if we should retry
      const isRetriableError = error instanceof Error && (
        error.message === 'MODEL_RUNNER_CRASHED' ||
        error.message.includes('EOF') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('network') ||
        error.name === 'TypeError'
      );

      if (isRetriableError && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Retrying request in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.chat(request, onMessage, retryCount + 1, maxRetries);
      }

      // Enhance error message for user
      if (error instanceof Error) {
        if (error.message === 'MODEL_RUNNER_CRASHED') {
          throw new Error(
            'The Ollama model crashed, possibly due to insufficient memory. ' +
            'Try:\n' +
            '1. Using a smaller model\n' +
            '2. Closing other applications to free up RAM\n' +
            '3. Restarting the Ollama service\n' +
            '4. Checking Ollama logs with: journalctl -u ollama -n 50'
          );
        }
        if (error.message.includes('timeout')) {
          throw new Error(
            'Request timed out. The model is taking too long to respond. ' +
            'Try using a smaller model or reducing your prompt size.'
          );
        }
      }

      throw error;
    }
  }

  async generateEmbedding(request: EmbeddingRequest): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
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

  async checkModelSupportsVision(modelName: string): Promise<boolean> {
    // Common vision models in Ollama include llava, bakllava, etc.
    const visionModels = ['llava', 'bakllava', 'llava-llama3', 'llava-phi3'];
    return visionModels.some(vm => modelName.toLowerCase().includes(vm));
  }
}

export const ollamaService = new OllamaService();
