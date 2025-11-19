import * as pdfjsLib from 'pdfjs-dist';
import type { Attachment, DocumentChunk } from '../types';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class DocumentParser {
  static async parseFile(file: File): Promise<Attachment> {
    const attachment: Attachment = {
      id: Date.now().toString() + Math.random().toString(36),
      type: this.getFileType(file.type, file.name),
      name: file.name,
      size: file.size,
      content: '',
      mimeType: file.type,
      uploadedAt: Date.now(),
    };

    if (attachment.type === 'image') {
      attachment.content = await this.fileToBase64(file);
    } else if (attachment.type === 'pdf') {
      attachment.content = await this.parsePDF(file);
    } else {
      attachment.content = await this.parseText(file);
    }

    return attachment;
  }

  private static getFileType(mimeType: string, fileName: string): Attachment['type'] {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    }
    if (
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      return 'document';
    }
    return 'text';
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private static async parsePDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n\n--- Page ${i} ---\n${pageText}`;
      }

      return fullText.trim();
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return `[Error parsing PDF: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  private static async parseText(file: File): Promise<string> {
    try {
      return await file.text();
    } catch (error) {
      console.error('Error parsing text file:', error);
      return `[Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  static chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  static createDocumentChunks(attachment: Attachment): DocumentChunk[] {
    const chunks = this.chunkText(attachment.content || '');
    return chunks.map((content, index) => ({
      id: `${attachment.id}-chunk-${index}`,
      documentId: attachment.id,
      content,
      index,
    }));
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
