import { useState, useEffect } from 'react';
import type { Attachment, DocumentChunk } from '../types';
import { DocumentParser } from '../services/documentParser';
import { VectorStore } from '../services/vectorStore';
import { ollamaService } from '../services/ollama';

export function useRAG(sessionId: string, enabled: boolean) {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (sessionId && enabled) {
      loadChunks();
    }
  }, [sessionId, enabled]);

  const loadChunks = async () => {
    if (!sessionId) return;
    const docs = await VectorStore.getDocuments(sessionId);
    setChunks(docs);
  };

  const addDocument = async (attachment: Attachment) => {
    if (!enabled || attachment.type === 'image') return;

    setIsProcessing(true);
    try {
      const docChunks = DocumentParser.createDocumentChunks(attachment);

      // Generate embeddings for each chunk
      const chunksWithEmbeddings = await Promise.all(
        docChunks.map(async (chunk) => ({
          ...chunk,
          embedding: await ollamaService.generateEmbedding(chunk.content),
        }))
      );

      const updatedChunks = [...chunks, ...chunksWithEmbeddings];
      setChunks(updatedChunks);
      await VectorStore.saveDocuments(sessionId, updatedChunks);
    } catch (error) {
      console.error('Error adding document to RAG:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const searchRelevantContext = async (query: string, topK: number = 3): Promise<string> => {
    if (!enabled || chunks.length === 0) return '';

    try {
      const queryEmbedding = await ollamaService.generateEmbedding(query);
      const relevantChunks = await VectorStore.searchDocuments(sessionId, queryEmbedding, topK);

      if (relevantChunks.length === 0) return '';

      return `\n\n[Context from documents]:\n${relevantChunks.map((chunk) => chunk.content).join('\n\n')}`;
    } catch (error) {
      console.error('Error searching RAG context:', error);
      return '';
    }
  };

  const clearDocuments = async () => {
    setChunks([]);
    await VectorStore.deleteDocuments(sessionId);
  };

  return {
    chunks,
    isProcessing,
    addDocument,
    searchRelevantContext,
    clearDocuments,
  };
}
