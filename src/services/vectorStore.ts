import localforage from 'localforage';
import type { DocumentChunk, Memory } from '../types';

// Configure localforage for better storage
const vectorStore = localforage.createInstance({
  name: 'ollama-rag',
  storeName: 'vectors',
});

const memoryStore = localforage.createInstance({
  name: 'ollama-rag',
  storeName: 'memories',
});

export class VectorStoreService {
  // Cosine similarity calculation
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Store document chunks
  async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await vectorStore.setItem(chunk.id, chunk);
    }
  }

  // Retrieve all chunks
  async getAllChunks(): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    await vectorStore.iterate((value: DocumentChunk) => {
      chunks.push(value);
    });
    return chunks;
  }

  // Get chunks for a specific document
  async getChunksByDocumentId(documentId: string): Promise<DocumentChunk[]> {
    const allChunks = await this.getAllChunks();
    return allChunks.filter(chunk => chunk.documentId === documentId);
  }

  // Search for similar chunks
  async searchSimilarChunks(
    queryEmbedding: number[],
    topK: number = 5,
    minSimilarity: number = 0.5
  ): Promise<{ chunks: DocumentChunk[]; scores: number[] }> {
    const allChunks = await this.getAllChunks();
    const chunksWithEmbeddings = allChunks.filter(chunk => chunk.embedding);

    const similarities = chunksWithEmbeddings.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding!),
    }));

    // Filter by minimum similarity and sort by score
    const filtered = similarities
      .filter(item => item.score >= minSimilarity)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return {
      chunks: filtered.map(item => item.chunk),
      scores: filtered.map(item => item.score),
    };
  }

  // Delete chunks for a document
  async deleteChunks(documentId: string): Promise<void> {
    const chunks = await this.getChunksByDocumentId(documentId);
    for (const chunk of chunks) {
      await vectorStore.removeItem(chunk.id);
    }
  }

  // Memory management
  async storeMemory(memory: Memory): Promise<void> {
    await memoryStore.setItem(memory.id, memory);
  }

  async getAllMemories(): Promise<Memory[]> {
    const memories: Memory[] = [];
    await memoryStore.iterate((value: Memory) => {
      memories.push(value);
    });
    return memories;
  }

  async getMemoriesBySessionId(sessionId: string): Promise<Memory[]> {
    const allMemories = await this.getAllMemories();
    return allMemories.filter(memory => memory.sessionId === sessionId);
  }

  async searchSimilarMemories(
    queryEmbedding: number[],
    topK: number = 3,
    minSimilarity: number = 0.6
  ): Promise<{ memories: Memory[]; scores: number[] }> {
    const allMemories = await this.getAllMemories();
    const memoriesWithEmbeddings = allMemories.filter(memory => memory.embedding);

    const similarities = memoriesWithEmbeddings.map(memory => ({
      memory,
      score: this.cosineSimilarity(queryEmbedding, memory.embedding!),
    }));

    // Filter by minimum similarity, sort by score and importance
    const filtered = similarities
      .filter(item => item.score >= minSimilarity)
      .sort((a, b) => {
        // Weight by both similarity and importance
        const scoreA = a.score * (0.7 + a.memory.importance * 0.3);
        const scoreB = b.score * (0.7 + b.memory.importance * 0.3);
        return scoreB - scoreA;
      })
      .slice(0, topK);

    return {
      memories: filtered.map(item => item.memory),
      scores: filtered.map(item => item.score),
    };
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await memoryStore.removeItem(memoryId);
  }

  async clearAllMemories(): Promise<void> {
    await memoryStore.clear();
  }

  async clearAllChunks(): Promise<void> {
    await vectorStore.clear();
  }
}

export const vectorStoreService = new VectorStoreService();
