/**
 * PPT Parsing Node
 * Handles PowerPoint file parsing and content extraction
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { ReviewPhase } from '../types/index.js';
import { parsePPTFile } from '../services/index.js';

/**
 * Parse the uploaded PPT file and extract slide content
 */
export async function pptParsingNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Parsing PPT file...');
  
  if (!state.pptFile) {
    return {
      lastError: 'No PPT file provided',
      phase: ReviewPhase.ERROR,
    };
  }
  
  try {
    const { metadata, slides } = await parsePPTFile(state.pptFile);
    
    return {
      pptMetadata: metadata,
      slides,
      phase: ReviewPhase.AI_DETECTION,
      lastAiMessage: `I've received your presentation "${metadata.filename}" with ${metadata.slideCount} slides. 
Let me analyze the content before we begin our discussion.`,
    };
  } catch (error) {
    console.error('[ProjectReview] PPT parsing error:', error);
    return {
      lastError: `Failed to parse PPT: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCount: state.errorCount + 1,
      lastAiMessage: "I'm having trouble reading your presentation. Could you please try uploading it again?",
    };
  }
}
