export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'pdf' | 'document' | 'text';
  name: string;
  size: number;
  content: string; // base64 for images, text content for documents
  mimeType: string;
  uploadedAt: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // base64 encoded images for vision models
  attachments?: Attachment[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: string;
    page?: number;
    chunkIndex: number;
  };
}

export interface RAGContext {
  enabled: boolean;
  documents: DocumentChunk[];
  topK: number; // number of relevant chunks to retrieve
}

export interface Memory {
  id: string;
  sessionId: string;
  summary: string;
  keyPoints: string[];
  embedding?: number[];
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  messages: Message[];
  attachments?: Attachment[];
  ragContext?: RAGContext;
  memoryIds?: string[]; // IDs of relevant memories from other sessions
  createdAt: number;
  updatedAt: number;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  images?: string[]; // for vision models
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: Message;
  done: boolean;
}

export interface EmbeddingRequest {
  model: string;
  prompt: string;
}

export interface EmbeddingResponse {
  embedding: number[];
}
