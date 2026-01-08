/**
 * AI Detection Node
 * Analyzes presentation content for AI-generated text
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { ReviewPhase } from '../types/index.js';
import { generateAIDetectionReport } from '../services/index.js';

/**
 * Run AI content detection on the presentation slides
 */
export async function aiDetectionNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Running AI content detection...');
  
  if (state.slides.length === 0) {
    return {
      lastError: 'No slides to analyze',
      phase: ReviewPhase.ERROR,
    };
  }
  
  try {
    const aiDetection = await generateAIDetectionReport(state.slides);
    
    console.log(`[ProjectReview] AI detection complete: ${aiDetection.overallResult}`);
    
    // Log warning if high AI content detected
    if (aiDetection.overallResult === 'likely_ai' && aiDetection.overallConfidence > 80) {
      console.warn(`[ProjectReview] High AI content detected (${aiDetection.overallConfidence}%)`);
    }
    
    return {
      aiDetection,
      phase: ReviewPhase.QUESTION_GENERATION,
    };
  } catch (error) {
    console.error('[ProjectReview] AI detection error:', error);
    // Continue to questions even if detection fails
    return {
      aiDetection: null,
      phase: ReviewPhase.QUESTION_GENERATION,
      lastError: 'AI detection failed, continuing with questions',
    };
  }
}
