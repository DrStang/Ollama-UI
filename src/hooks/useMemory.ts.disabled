import { useState, useEffect } from 'react';
import type { Memory, Message } from '../types';
import { VectorStore } from '../services/vectorStore';
import { ollamaService } from '../services/ollama';

export function useMemory(sessionId: string, model: string, enabled: boolean) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (enabled) {
      loadRelevantMemories();
    }
  }, [enabled]);

  const loadRelevantMemories = async () => {
    const allMemories = await VectorStore.getAllMemories();
    setMemories(allMemories.filter((m) => m.sessionId !== sessionId));
  };

  const generateMemory = async (messages: Message[]) => {
    if (!enabled || messages.length < 4) return; // Need at least 2 exchanges

    setIsGenerating(true);
    try {
      const conversationText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const [summary, keyPoints] = await Promise.all([
        ollamaService.generateSummary(conversationText, model),
        ollamaService.extractKeyPoints(conversationText, model),
      ]);

      const embedding = await ollamaService.generateEmbedding(summary);

      const memory: Memory = {
        id: `memory-${Date.now()}`,
        sessionId,
        summary,
        keyPoints,
        embedding,
        createdAt: Date.now(),
      };

      await VectorStore.saveMemory(memory);
      await loadRelevantMemories();
    } catch (error) {
      console.error('Error generating memory:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getRelevantMemories = async (currentMessage: string): Promise<string> => {
    if (!enabled || memories.length === 0) return '';

    try {
      const queryEmbedding = await ollamaService.generateEmbedding(currentMessage);
      const relevantMemories = await VectorStore.searchMemories(queryEmbedding, sessionId, 2);

      if (relevantMemories.length === 0) return '';

      const memoryContext = relevantMemories
        .map(
          (m) =>
            `Previous conversation: ${m.summary}\nKey points: ${m.keyPoints.join(', ')}`
        )
        .join('\n\n');

      return `\n\n[Context from previous conversations]:\n${memoryContext}`;
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return '';
    }
  };

  const clearMemories = async () => {
    await VectorStore.clearAllMemories();
    setMemories([]);
  };

  return {
    memories,
    isGenerating,
    generateMemory,
    getRelevantMemories,
    clearMemories,
  };
}
