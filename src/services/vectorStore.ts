import localforage from 'localforage';
import type { DocumentChunk, Memory } from '../types';
import { DocumentParser } from './documentParser';

const MEMORY_STORE_KEY = 'ollama-ui-memories';

export class VectorStore {
  private static documentsDB = localforage.createInstance({
    name: 'ollama-ui',
    storeName: 'documents',
  });

  private static memoriesDB = localforage.createInstance({
    name: 'ollama-ui',
    storeName: 'memories',
  });

  // Document operations
  static async saveDocuments(sessionId: string, documents: DocumentChunk[]): Promise<void> {
    await this.documentsDB.setItem(sessionId, documents);
  }

  static async getDocuments(sessionId: string): Promise<DocumentChunk[]> {
    const docs = await this.documentsDB.getItem<DocumentChunk[]>(sessionId);
    return docs || [];
  }

  static async deleteDocuments(sessionId: string): Promise<void> {
    await this.documentsDB.removeItem(sessionId);
  }

  static async searchDocuments(
    sessionId: string,
    queryEmbedding: number[],
    topK: number = 3
  ): Promise<DocumentChunk[]> {
    const documents = await this.getDocuments(sessionId);

    if (!documents.length) return [];

    // Filter documents that have embeddings
    const documentsWithEmbeddings = documents.filter((doc) => doc.embedding);

    if (!documentsWithEmbeddings.length) return documents.slice(0, topK);

    // Calculate similarity scores
    const scoredDocs = documentsWithEmbeddings.map((doc) => ({
      doc,
      score: DocumentParser.cosineSimilarity(queryEmbedding, doc.embedding!),
    }));

    // Sort by similarity and return top K
    scoredDocs.sort((a, b) => b.score - a.score);
    return scoredDocs.slice(0, topK).map((item) => item.doc);
  }

  // Memory operations
  static async saveMemory(memory: Memory): Promise<void> {
    const memories = await this.getAllMemories();
    const existingIndex = memories.findIndex((m) => m.id === memory.id);

    if (existingIndex >= 0) {
      memories[existingIndex] = memory;
    } else {
      memories.push(memory);
    }

    await this.memoriesDB.setItem(MEMORY_STORE_KEY, memories);
  }

  static async getAllMemories(): Promise<Memory[]> {
    const memories = await this.memoriesDB.getItem<Memory[]>(MEMORY_STORE_KEY);
    return memories || [];
  }

  static async getMemoriesBySession(sessionId: string): Promise<Memory[]> {
    const memories = await this.getAllMemories();
    return memories.filter((m) => m.sessionId === sessionId);
  }

  static async searchMemories(
    queryEmbedding: number[],
    excludeSessionId?: string,
    topK: number = 3
  ): Promise<Memory[]> {
    const memories = await this.getAllMemories();

    // Filter out current session and memories without embeddings
    const relevantMemories = memories.filter(
      (m) => m.sessionId !== excludeSessionId && m.embedding
    );

    if (!relevantMemories.length) return [];

    // Calculate similarity scores
    const scoredMemories = relevantMemories.map((memory) => ({
      memory,
      score: DocumentParser.cosineSimilarity(queryEmbedding, memory.embedding!),
    }));

    // Sort by similarity and return top K
    scoredMemories.sort((a, b) => b.score - a.score);
    return scoredMemories.slice(0, topK).map((item) => item.memory);
  }

  static async deleteMemory(memoryId: string): Promise<void> {
    const memories = await this.getAllMemories();
    const filtered = memories.filter((m) => m.id !== memoryId);
    await this.memoriesDB.setItem(MEMORY_STORE_KEY, filtered);
  }

  static async deleteSessionMemories(sessionId: string): Promise<void> {
    const memories = await this.getAllMemories();
    const filtered = memories.filter((m) => m.sessionId !== sessionId);
    await this.memoriesDB.setItem(MEMORY_STORE_KEY, filtered);
  }

  static async clearAllMemories(): Promise<void> {
    await this.memoriesDB.removeItem(MEMORY_STORE_KEY);
  }

  static async clearAllDocuments(): Promise<void> {
    await this.documentsDB.clear();
  }
}
