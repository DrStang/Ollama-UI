import localforage from 'localforage';
import type { Document, DocumentChunk, RAGContext } from '../types';
import { pdfService } from './pdf';
import { ollamaService } from './ollama';
import { vectorStoreService } from './vectorStore';

// Configure localforage for document storage
const documentStore = localforage.createInstance({
  name: 'ollama-rag',
  storeName: 'documents',
});

const EMBEDDING_MODEL = 'nomic-embed-text'; // Default embedding model
const CHUNK_SIZE = 500; // Characters per chunk
const CHUNK_OVERLAP = 50; // Overlap between chunks

export class DocumentService {
  // Split text into chunks
  private chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += chunkSize - overlap;
    }

    return chunks;
  }

  // Process and store a document
  async processDocument(file: File, generateEmbeddings: boolean = true): Promise<Document> {
    try {
      // Extract text from file
      const content = await pdfService.extractTextFromFile(file);

      // Create document
      const document: Document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        content,
        size: file.size,
        uploadedAt: Date.now(),
        chunks: [],
      };

      // Chunk the text
      const textChunks = this.chunkText(content);

      // Create document chunks
      const chunks: DocumentChunk[] = await Promise.all(
        textChunks.map(async (chunkText, index) => {
          const chunk: DocumentChunk = {
            id: `chunk_${document.id}_${index}`,
            documentId: document.id,
            content: chunkText,
            index,
          };

          // Generate embedding if requested
          if (generateEmbeddings) {
            try {
              const embedding = await ollamaService.generateEmbedding({
                model: EMBEDDING_MODEL,
                prompt: chunkText,
              });
              chunk.embedding = embedding;
            } catch (error) {
              console.error(`Error generating embedding for chunk ${index}:`, error);
              // Continue without embedding
            }
          }

          return chunk;
        })
      );

      document.chunks = chunks;

      // Store document and chunks
      await documentStore.setItem(document.id, document);
      await vectorStoreService.storeChunks(chunks);

      return document;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  // Get all documents
  async getAllDocuments(): Promise<Document[]> {
    const documents: Document[] = [];
    await documentStore.iterate((value: Document) => {
      documents.push(value);
    });
    return documents.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  // Get document by ID
  async getDocument(documentId: string): Promise<Document | null> {
    return await documentStore.getItem<Document>(documentId);
  }

  // Delete document
  async deleteDocument(documentId: string): Promise<void> {
    await documentStore.removeItem(documentId);
    await vectorStoreService.deleteChunks(documentId);
  }

  // Search for relevant context
  async searchRelevantContext(
    query: string,
    topK: number = 5,
    minSimilarity: number = 0.5
  ): Promise<RAGContext> {
    try {
      // Generate embedding for query
      const queryEmbedding = await ollamaService.generateEmbedding({
        model: EMBEDDING_MODEL,
        prompt: query,
      });

      // Search for similar chunks
      const { chunks, scores } = await vectorStoreService.searchSimilarChunks(
        queryEmbedding,
        topK,
        minSimilarity
      );

      // Get associated documents
      const documentIds = [...new Set(chunks.map(chunk => chunk.documentId))];
      const documents = await Promise.all(
        documentIds.map(id => this.getDocument(id))
      );

      return {
        chunks,
        documents: documents.filter((doc): doc is Document => doc !== null),
        relevanceScores: scores,
      };
    } catch (error) {
      console.error('Error searching relevant context:', error);
      return { chunks: [], documents: [], relevanceScores: [] };
    }
  }

  // Format RAG context for chat
  formatRAGContext(context: RAGContext): string {
    if (context.chunks.length === 0) {
      return '';
    }

    const contextText = context.chunks
      .map((chunk, index) => {
        const doc = context.documents.find(d => d.id === chunk.documentId);
        const score = context.relevanceScores[index];
        return `[Source: ${doc?.name || 'Unknown'} (Relevance: ${(score * 100).toFixed(1)}%)]\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    return `Context from uploaded documents:\n\n${contextText}\n\n---\n\nBased on the above context, please answer the following question:`;
  }
}

export const documentService = new DocumentService();
