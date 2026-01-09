/**
 * PPT Processor Service
 * 
 * Parses PPT files and chunks content for embedding
 */

import pptxParser from 'pptx-parser';
import { readFile } from 'fs/promises';

export interface SlideContent {
    slideNumber: number;
    title: string | null;
    content: string;
    bulletPoints: string[];
}

export interface PptChunk {
    slideNumber: number | null;
    slideTitle: string | null;
    content: string;
    chunkIndex: number;
}

const MAX_CHUNK_SIZE = 500; // tokens (approximately 4 chars per token)
const MAX_CHARS_PER_CHUNK = MAX_CHUNK_SIZE * 4;
const OVERLAP_CHARS = 200;

/**
 * Parse PPT file and extract slide content
 */
export async function parsePptFile(filePath: string): Promise<SlideContent[]> {
    try {
        const buffer = await readFile(filePath);
        const slides: SlideContent[] = [];

        // Parse PPTX
        const parsed = await pptxParser(buffer);

        if (!parsed || !parsed.slides) {
            console.warn('[PptProcessor] No slides found in PPT');
            return slides;
        }

        for (let i = 0; i < parsed.slides.length; i++) {
            const slide = parsed.slides[i];
            const slideNumber = i + 1;

            // Extract title (usually the first text element)
            let title: string | null = null;
            const bulletPoints: string[] = [];
            const contentParts: string[] = [];

            if (slide.texts) {
                for (const text of slide.texts) {
                    const cleanText = text.trim();
                    if (!cleanText) continue;

                    if (!title && cleanText.length < 100) {
                        title = cleanText;
                    } else {
                        contentParts.push(cleanText);
                        bulletPoints.push(cleanText);
                    }
                }
            }

            slides.push({
                slideNumber,
                title,
                content: contentParts.join('\n'),
                bulletPoints,
            });
        }

        return slides;
    } catch (error) {
        console.error('[PptProcessor] Error parsing PPT:', error);
        throw error;
    }
}

/**
 * Parse PPT content from text (already extracted)
 */
export function parsePptContent(pptContent: string): SlideContent[] {
    const slides: SlideContent[] = [];

    // Split by slide markers or double newlines
    const slideTexts = pptContent.split(/\n\s*\n/).filter(s => s.trim());

    for (let i = 0; i < slideTexts.length; i++) {
        const text = slideTexts[i].trim();
        if (!text) continue;

        const lines = text.split('\n').filter(l => l.trim());
        const title = lines.length > 0 ? lines[0] : null;
        const content = lines.slice(1).join('\n');

        slides.push({
            slideNumber: i + 1,
            title,
            content,
            bulletPoints: lines.slice(1),
        });
    }

    return slides;
}

/**
 * Chunk slides for embedding
 */
export function chunkSlides(slides: SlideContent[]): PptChunk[] {
    const chunks: PptChunk[] = [];
    let chunkIndex = 0;

    for (const slide of slides) {
        // Combine slide content
        let slideText = '';
        if (slide.title) {
            slideText = `Slide ${slide.slideNumber}: ${slide.title}\n`;
        }
        slideText += slide.content;

        // If slide content fits in one chunk
        if (slideText.length <= MAX_CHARS_PER_CHUNK) {
            if (slideText.trim()) {
                chunks.push({
                    slideNumber: slide.slideNumber,
                    slideTitle: slide.title,
                    content: slideText.trim(),
                    chunkIndex: chunkIndex++,
                });
            }
        } else {
            // Split large slides into multiple chunks
            const words = slideText.split(/\s+/);
            let currentChunk = '';

            for (const word of words) {
                if ((currentChunk + ' ' + word).length > MAX_CHARS_PER_CHUNK) {
                    if (currentChunk.trim()) {
                        chunks.push({
                            slideNumber: slide.slideNumber,
                            slideTitle: slide.title,
                            content: currentChunk.trim(),
                            chunkIndex: chunkIndex++,
                        });
                    }
                    // Start new chunk with overlap
                    const overlapStart = Math.max(0, currentChunk.length - OVERLAP_CHARS);
                    currentChunk = currentChunk.slice(overlapStart) + ' ' + word;
                } else {
                    currentChunk += (currentChunk ? ' ' : '') + word;
                }
            }

            // Add remaining content
            if (currentChunk.trim()) {
                chunks.push({
                    slideNumber: slide.slideNumber,
                    slideTitle: slide.title,
                    content: currentChunk.trim(),
                    chunkIndex: chunkIndex++,
                });
            }
        }
    }

    return chunks;
}

/**
 * Process PPT content and return chunks ready for embedding
 */
export function processPptForEmbedding(pptContent: string): PptChunk[] {
    const slides = parsePptContent(pptContent);
    return chunkSlides(slides);
}
