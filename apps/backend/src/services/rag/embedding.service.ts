/**
 * RAG Embedding Service
 * 
 * Generates embeddings using OpenAI's text-embedding-3-small model
 */

import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
    text: string;
    embedding: number[];
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.trim(),
        dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];

    // Filter out empty texts
    const cleanTexts = texts.map(t => t.trim()).filter(t => t.length > 0);

    if (cleanTexts.length === 0) return [];

    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: cleanTexts,
        dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map((item, index) => ({
        text: cleanTexts[index],
        embedding: item.embedding,
    }));
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }

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

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
