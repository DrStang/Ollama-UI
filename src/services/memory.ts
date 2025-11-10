import type { Memory, MemoryContext, ChatSession, Message } from '../types';
import { ollamaService } from './ollama';
import { vectorStoreService } from './vectorStore';

const EMBEDDING_MODEL = 'nomic-embed-text';
const MEMORY_SUMMARY_MODEL = 'llama3.2'; // Fast model for summarization

export class MemoryService {
  // Extract keywords from text
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words and take unique words
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'can', 'it', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which',
      'who', 'when', 'where', 'why', 'how'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    // Return unique words sorted by frequency
    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  // Calculate importance score
  private calculateImportance(summary: string, messageCount: number): number {
    // Simple heuristic: longer conversations and specific technical terms are more important
    let score = Math.min(messageCount / 20, 0.5); // Up to 0.5 from message count

    // Boost for technical/important keywords
    const importantKeywords = [
      'error', 'bug', 'fix', 'issue', 'problem', 'solution', 'implement',
      'feature', 'api', 'database', 'security', 'performance', 'optimize'
    ];

    const lowerSummary = summary.toLowerCase();
    const keywordBoost = importantKeywords.filter(kw => lowerSummary.includes(kw)).length * 0.1;
    score += Math.min(keywordBoost, 0.3);

    // Boost for questions (knowledge seeking is important)
    if (lowerSummary.includes('?') || lowerSummary.includes('how') || lowerSummary.includes('what')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  // Generate summary from conversation
  private async generateSummary(messages: Message[]): Promise<string> {
    try {
      // Take first few and last few messages for context
      const relevantMessages = messages.length > 10
        ? [...messages.slice(0, 5), ...messages.slice(-5)]
        : messages;

      const conversationText = relevantMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const summaryPrompt = `Please provide a concise 2-3 sentence summary of this conversation, focusing on the main topics and key points:\n\n${conversationText}\n\nSummary:`;

      const summary = await ollamaService.chat({
        model: MEMORY_SUMMARY_MODEL,
        messages: [{ role: 'user', content: summaryPrompt }],
        stream: false,
      });

      return summary.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      // Fallback: use first user message as summary
      const firstUserMessage = messages.find(m => m.role === 'user');
      return firstUserMessage?.content.slice(0, 200) || 'Conversation summary unavailable';
    }
  }

  // Create memory from chat session
  async createMemoryFromSession(session: ChatSession): Promise<Memory | null> {
    try {
      // Only create memory for sessions with meaningful conversation
      if (session.messages.length < 2) {
        return null;
      }

      // Generate summary
      const summary = await this.generateSummary(session.messages);

      // Generate embedding
      let embedding: number[] | undefined;
      try {
        embedding = await ollamaService.generateEmbedding({
          model: EMBEDDING_MODEL,
          prompt: summary,
        });
      } catch (error) {
        console.error('Error generating embedding for memory:', error);
        // Continue without embedding
      }

      // Calculate importance
      const importance = this.calculateImportance(summary, session.messages.length);

      // Extract keywords
      const keywords = this.extractKeywords(summary);

      const memory: Memory = {
        id: `mem_${session.id}_${Date.now()}`,
        sessionId: session.id,
        summary,
        embedding,
        importance,
        createdAt: Date.now(),
        keywords,
      };

      // Store memory
      await vectorStoreService.storeMemory(memory);

      return memory;
    } catch (error) {
      console.error('Error creating memory:', error);
      return null;
    }
  }

  // Search for relevant memories
  async searchRelevantMemories(
    query: string,
    currentSessionId?: string,
    topK: number = 3
  ): Promise<MemoryContext> {
    try {
      // Generate embedding for query
      const queryEmbedding = await ollamaService.generateEmbedding({
        model: EMBEDDING_MODEL,
        prompt: query,
      });

      // Search for similar memories
      const { memories, scores } = await vectorStoreService.searchSimilarMemories(
        queryEmbedding,
        topK * 2, // Get more candidates
        0.6 // Higher threshold for memories
      );

      // Filter out current session and take top K
      const filtered = memories
        .filter(m => m.sessionId !== currentSessionId)
        .slice(0, topK);

      const filteredScores = scores.slice(0, filtered.length);

      return {
        memories: filtered,
        relevanceScores: filteredScores,
      };
    } catch (error) {
      console.error('Error searching memories:', error);
      return { memories: [], relevanceScores: [] };
    }
  }

  // Format memory context for chat
  formatMemoryContext(memoryContext: MemoryContext): string {
    if (memoryContext.memories.length === 0) {
      return '';
    }

    const contextText = memoryContext.memories
      .map((memory, index) => {
        const score = memoryContext.relevanceScores[index];
        const date = new Date(memory.createdAt).toLocaleDateString();
        return `[Memory from ${date} (Relevance: ${(score * 100).toFixed(1)}%, Importance: ${(memory.importance * 100).toFixed(0)}%)]\n${memory.summary}`;
      })
      .join('\n\n');

    return `Relevant context from previous conversations:\n\n${contextText}\n\n---\n\n`;
  }

  // Get all memories
  async getAllMemories(): Promise<Memory[]> {
    return await vectorStoreService.getAllMemories();
  }

  // Delete memory
  async deleteMemory(memoryId: string): Promise<void> {
    await vectorStoreService.deleteMemory(memoryId);
  }

  // Clear all memories
  async clearAllMemories(): Promise<void> {
    await vectorStoreService.clearAllMemories();
  }
}

export const memoryService = new MemoryService();
