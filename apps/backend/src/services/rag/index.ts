/**
 * RAG Service Index
 * 
 * Main export for RAG functionality
 */

export * from './embedding.service.js';
export * from './ppt-processor.service.js';
export * from './vector-store.service.js';

import { processPptForEmbedding } from './ppt-processor.service.js';
import { storePptChunks, getContextForQuery, deleteChunks } from './vector-store.service.js';

/**
 * Process and embed PPT content for a review
 */
export async function indexPptContent(reviewId: string, pptContent: string): Promise<number> {
    console.log(`[RAG] Indexing PPT content for review ${reviewId}`);

    // Delete existing chunks first (re-indexing)
    await deleteChunks(reviewId);

    // Process PPT into chunks
    const chunks = processPptForEmbedding(pptContent);
    console.log(`[RAG] Created ${chunks.length} chunks from PPT`);

    if (chunks.length === 0) {
        console.warn('[RAG] No chunks created from PPT content');
        return 0;
    }

    // Store chunks with embeddings
    const stored = await storePptChunks(reviewId, chunks);
    console.log(`[RAG] Successfully indexed ${stored.length} chunks`);

    return stored.length;
}

/**
 * Get relevant PPT context for a query
 */
export async function getPptContext(reviewId: string, query: string): Promise<string> {
    return getContextForQuery(reviewId, query, 5);
}
