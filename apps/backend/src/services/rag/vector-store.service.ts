/**
 * Vector Store Service
 * 
 * Handles pgvector operations for storing and retrieving embeddings
 */

import { prisma } from '../../db/prisma.js';
import { generateEmbedding, generateEmbeddings } from './embedding.service.js';
import type { PptChunk } from './ppt-processor.service.js';

export interface StoredChunk {
    id: string;
    reviewId: string;
    slideNumber: number | null;
    slideTitle: string | null;
    content: string;
    chunkIndex: number;
}

export interface SearchResult extends StoredChunk {
    similarity: number;
}

/**
 * Store PPT chunks with embeddings
 */
export async function storePptChunks(
    reviewId: string,
    chunks: PptChunk[]
): Promise<StoredChunk[]> {
    if (chunks.length === 0) return [];

    console.log(`[VectorStore] Storing ${chunks.length} chunks for review ${reviewId}`);

    // Generate embeddings for all chunks
    const texts = chunks.map(c => c.content);
    const embeddingResults = await generateEmbeddings(texts);

    // Store each chunk with its embedding using raw SQL for vector type
    const storedChunks: StoredChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddingResults[i]?.embedding;

        if (!embedding) {
            console.warn(`[VectorStore] No embedding for chunk ${i}, skipping`);
            continue;
        }

        // Use raw SQL to insert with vector type
        const result = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO ppt_chunks (id, review_id, slide_number, slide_title, content, chunk_index, embedding, created_at)
      VALUES (
        gen_random_uuid(),
        ${reviewId},
        ${chunk.slideNumber},
        ${chunk.slideTitle},
        ${chunk.content},
        ${chunk.chunkIndex},
        ${`[${embedding.join(',')}]`}::vector,
        NOW()
      )
      RETURNING id
    `;

        if (result[0]) {
            storedChunks.push({
                id: result[0].id,
                reviewId,
                slideNumber: chunk.slideNumber,
                slideTitle: chunk.slideTitle,
                content: chunk.content,
                chunkIndex: chunk.chunkIndex,
            });
        }
    }

    console.log(`[VectorStore] Successfully stored ${storedChunks.length} chunks`);
    return storedChunks;
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
    reviewId: string,
    query: string,
    limit: number = 5
): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Search using cosine similarity
    const results = await prisma.$queryRaw<Array<{
        id: string;
        review_id: string;
        slide_number: number | null;
        slide_title: string | null;
        content: string;
        chunk_index: number;
        similarity: number;
    }>>`
    SELECT 
      id,
      review_id,
      slide_number,
      slide_title,
      content,
      chunk_index,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM ppt_chunks
    WHERE review_id = ${reviewId}
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

    return results.map((r: {
        id: string;
        review_id: string;
        slide_number: number | null;
        slide_title: string | null;
        content: string;
        chunk_index: number;
        similarity: number;
    }) => ({
        id: r.id,
        reviewId: r.review_id,
        slideNumber: r.slide_number,
        slideTitle: r.slide_title,
        content: r.content,
        chunkIndex: r.chunk_index,
        similarity: r.similarity,
    }));
}

/**
 * Get all chunks for a review (without similarity search)
 */
export async function getAllChunks(reviewId: string): Promise<StoredChunk[]> {
    const chunks = await prisma.pptChunk.findMany({
        where: { reviewId },
        orderBy: { chunkIndex: 'asc' },
        select: {
            id: true,
            reviewId: true,
            slideNumber: true,
            slideTitle: true,
            content: true,
            chunkIndex: true,
        },
    });

    return chunks;
}

/**
 * Delete all chunks for a review
 */
export async function deleteChunks(reviewId: string): Promise<number> {
    const result = await prisma.pptChunk.deleteMany({
        where: { reviewId },
    });
    return result.count;
}

/**
 * Get context for AI prompt (top N most relevant chunks)
 */
export async function getContextForQuery(
    reviewId: string,
    query: string,
    maxChunks: number = 5
): Promise<string> {
    const chunks = await searchSimilarChunks(reviewId, query, maxChunks);

    if (chunks.length === 0) {
        // Fallback to getting all chunks if no similar ones found
        const allChunks = await getAllChunks(reviewId);
        if (allChunks.length === 0) return '';

        return allChunks
            .slice(0, maxChunks)
            .map(c => {
                const header = c.slideTitle
                    ? `[Slide ${c.slideNumber}: ${c.slideTitle}]`
                    : `[Slide ${c.slideNumber}]`;
                return `${header}\n${c.content}`;
            })
            .join('\n\n');
    }

    return chunks
        .map(c => {
            const header = c.slideTitle
                ? `[Slide ${c.slideNumber}: ${c.slideTitle}] (relevance: ${(c.similarity * 100).toFixed(1)}%)`
                : `[Slide ${c.slideNumber}] (relevance: ${(c.similarity * 100).toFixed(1)}%)`;
            return `${header}\n${c.content}`;
        })
        .join('\n\n');
}
