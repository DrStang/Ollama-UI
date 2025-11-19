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

export interface MessageImage {
  data: string; // base64 encoded image
  mimeType: string; // e.g., 'image/png', 'image/jpeg'
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: MessageImage[]; // images with metadata for vision models
  attachments?: Attachment[];
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // base64 strings for Ollama API
}


export interface Memory {
  id: string;
  sessionId: string;
  summary: string;
  keyPoints?: string[];
  keywords: string[];
  embedding?: number[];
  importance: number; // 0-1 scale
  createdAt: number;
  images?: MessageImage[]; // For vision model support
  attachments?: Attachment[]; // For document attachments
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // mime type
  mimeType?: string; // alternative mime type field
  size: number;
  content?: string; // extracted text content for PDFs, etc.
  data?: string; // base64 data for images
  uploadedAt: number;
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
  messages: OllamaMessage[];
  stream?: boolean;
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: Message;
  done: boolean;
}

// RAG (Retrieval Augmented Generation) Types
export interface Document {
  id: string;
  name: string;
  type: string; // mime type
  content: string; // full text content
  size: number;
  uploadedAt: number;
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[]; // vector embedding
  index: number; // chunk position in document
}

export interface RAGContext {
  chunks: DocumentChunk[];
  documents: Document[];
  relevanceScores: number[];
}

// Memory System Types
export interface MemoryContext {
  memories: Memory[];
  relevanceScores: number[];
}

// Embedding Types
export interface EmbeddingRequest {
  model: string;
  prompt: string;
}

export interface EmbeddingResponse {
  embedding: number[];
}
