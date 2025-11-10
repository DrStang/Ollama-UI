# Advanced Features Integration Guide

This document explains the advanced features that have been added to Ollama UI and how to use them.

## Features Overview

### 1. Document Upload & Processing
- **PDF Support**: Upload and parse PDF documents
- **Text Files**: Support for .txt, .doc, .docx files
- **Automatic Parsing**: Documents are automatically extracted and processed

### 2. Vision Model Support (LLaVA)
- **Image Upload**: Attach images to your messages
- **Vision Models**: Automatic detection of vision-capable models (llava, bakllava, moondream, cogvlm)
- **Base64 Encoding**: Images are encoded and sent to vision models

### 3. RAG (Retrieval Augmented Generation)
- **Document Chunking**: Documents are split into semantic chunks
- **Vector Embeddings**: Each chunk is embedded using Ollama's embedding models
- **Similarity Search**: Relevant chunks are retrieved based on your query
- **Context Injection**: Retrieved context is automatically added to your prompts

### 4. Memory System
- **Cross-Chat Context**: AI remembers context from previous conversations
- **Auto-Summarization**: Conversations are automatically summarized
- **Key Point Extraction**: Important points are extracted and stored
- **Semantic Search**: Relevant memories are retrieved based on similarity

## Architecture

### Services

#### DocumentParser (`src/services/documentParser.ts`)
```typescript
// Parse any supported file
const attachment = await DocumentParser.parseFile(file);

// Create searchable chunks
const chunks = DocumentParser.createDocumentChunks(attachment);

// Calculate similarity
const similarity = DocumentParser.cosineSimilarity(vectorA, vectorB);
```

#### VectorStore (`src/services/vectorStore.ts`)
```typescript
// Store document chunks
await VectorStore.saveDocuments(sessionId, chunks);

// Search for relevant chunks
const results = await VectorStore.searchDocuments(sessionId, queryEmbedding, topK);

// Memory operations
await VectorStore.saveMemory(memory);
const memories = await VectorStore.searchMemories(queryEmbedding, excludeSessionId, topK);
```

#### OllamaService (Extended)
```typescript
// Generate embeddings
const embedding = await ollamaService.generateEmbedding(text, 'nomic-embed-text');

// Check if model supports vision
const isVision = ollamaService.isVisionModel('llava');

// Generate summary
const summary = await ollamaService.generateSummary(conversationText, model);

// Extract key points
const keyPoints = await ollamaService.extractKeyPoints(conversationText, model);
```

### Hooks

#### useRAG
```typescript
const rag = useRAG(sessionId, enabled);

// Add document to RAG
await rag.addDocument(attachment);

// Search for relevant context
const context = await rag.searchRelevantContext(query, topK);

// Clear all documents
await rag.clearDocuments();
```

#### useMemory
```typescript
const memory = useMemory(sessionId, model, enabled);

// Generate memory from conversation
await memory.generateMemory(messages);

// Get relevant memories
const context = await memory.getRelevantMemories(currentMessage);

// Clear all memories
await memory.clearMemories();
```

### Components

#### FileUpload
```typescript
<FileUpload
  onFileUpload={(attachment) => handleAttachment(attachment)}
  acceptImages={true}
  acceptDocuments={true}
  disabled={isLoading}
/>
```

#### AttachmentDisplay
```typescript
<AttachmentDisplay
  attachments={attachments}
  onRemove={(id) => removeAttachment(id)}
  compact={false}
/>
```

## Integration Steps

To integrate these features into the Chat component:

### 1. Add State and Hooks

```typescript
const [attachments, setAttachments] = useState<Attachment[]>([]);
const [ragEnabled, setRagEnabled] = useState(false);
const [memoryEnabled, setMemoryEnabled] = useState(false);

const rag = useRAG(currentSession?.id || '', ragEnabled);
const memory = useMemory(currentSession?.id || '', selectedModel, memoryEnabled);
```

### 2. Handle File Uploads

```typescript
const handleFileUpload = async (attachment: Attachment) => {
  setAttachments([...attachments, attachment]);

  // Add to RAG if enabled
  if (ragEnabled && attachment.type !== 'image') {
    await rag.addDocument(attachment);
  }
};

const removeAttachment = (id: string) => {
  setAttachments(attachments.filter(a => a.id !== id));
};
```

### 3. Enhance Message Sending

```typescript
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputMessage.trim() || isLoading) return;

  let enhancedMessage = inputMessage.trim();

  // Add RAG context if enabled
  if (ragEnabled) {
    const ragContext = await rag.searchRelevantContext(enhancedMessage);
    enhancedMessage += ragContext;
  }

  // Add memory context if enabled
  if (memoryEnabled) {
    const memoryContext = await memory.getRelevantMemories(enhancedMessage);
    enhancedMessage += memoryContext;
  }

  // Prepare message with images for vision models
  const userMessage: Message = {
    role: 'user',
    content: enhancedMessage,
    images: ollamaService.isVisionModel(selectedModel)
      ? attachments.filter(a => a.type === 'image').map(a => a.content)
      : undefined,
    attachments: attachments,
  };

  // ... rest of message sending logic

  // Generate memory after conversation (every few exchanges)
  if (memoryEnabled && finalSession.messages.length % 6 === 0) {
    await memory.generateMemory(finalSession.messages);
  }

  // Clear attachments after sending
  setAttachments([]);
};
```

### 4. Update UI

Add to chat header:
```typescript
<div className="advanced-features">
  <button
    onClick={() => setRagEnabled(!ragEnabled)}
    className={`feature-toggle ${ragEnabled ? 'active' : ''}`}
  >
    📚 RAG {ragEnabled && `(${rag.chunks.length} chunks)`}
  </button>

  <button
    onClick={() => setMemoryEnabled(!memoryEnabled)}
    className={`feature-toggle ${memoryEnabled ? 'active' : ''}`}
  >
    🧠 Memory {memoryEnabled && `(${memory.memories.length})`}
  </button>
</div>
```

Add to input form:
```typescript
<div className="input-attachments">
  <FileUpload
    onFileUpload={handleFileUpload}
    acceptImages={ollamaService.isVisionModel(selectedModel)}
    acceptDocuments={ragEnabled}
    disabled={isLoading}
  />

  <AttachmentDisplay
    attachments={attachments}
    onRemove={removeAttachment}
    compact={true}
  />
</div>
```

## Requirements

### Ollama Models

For full functionality, you need:

1. **Embedding Model** (for RAG and Memory):
   ```bash
   ollama pull nomic-embed-text
   ```

2. **Vision Model** (for image understanding):
   ```bash
   ollama pull llava
   # or
   ollama pull bakllava
   ```

3. **Chat Model** (any of your existing models work)

### Browser Requirements

- Modern browser with IndexedDB support (for vector storage)
- FileReader API support (for file uploads)
- Sufficient storage for embeddings and memories

## Usage Tips

### RAG Best Practices
- Upload relevant documents before starting your conversation
- Keep documents focused on specific topics
- The system chunks documents into ~500 words each
- Top 3 most relevant chunks are retrieved by default

### Memory Best Practices
- Enable memory for ongoing projects or research
- Memories are generated every 3 exchanges (6 messages)
- Memories are shared across all sessions
- Clear memories periodically to maintain relevance

### Vision Model Tips
- Upload images directly in the chat
- Works with llava, bakllava, moondream, cogvlm models
- Images are base64 encoded and sent with your message
- You can ask questions about uploaded images

## Performance Considerations

- **Embeddings**: Generated on-demand, may take a few seconds
- **RAG Search**: Fast once embeddings are created
- **Memory**: Stored in IndexedDB, persists across sessions
- **File Size**: Large PDFs may take time to parse
- **Storage**: Embeddings are stored locally in browser

## Troubleshooting

### RAG not working?
1. Ensure `nomic-embed-text` model is installed
2. Check that RAG is enabled (toggle button)
3. Verify documents were uploaded successfully
4. Check browser console for errors

### Memory not working?
1. Ensure memory is enabled
2. Have at least 2 conversation exchanges
3. Check IndexedDB in browser DevTools
4. Verify embedding model is available

### Vision not working?
1. Verify you're using a vision model (llava, bakllava, etc.)
2. Ensure images are in supported formats (jpg, png, gif, webp)
3. Check image file size (very large images may fail)
4. Look for errors in browser console

## Future Enhancements

Potential improvements:
- Custom embedding models selection
- Adjustable chunk sizes
- Memory tagging and organization
- Document preview before upload
- Batch document upload
- Export/import memory and RAG data
- Advanced search filters
- Multi-modal RAG (images + text)
