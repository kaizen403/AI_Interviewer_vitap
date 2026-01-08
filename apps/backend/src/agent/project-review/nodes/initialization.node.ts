/**
 * Initialization Node
 * Handles project review session initialization
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { ReviewPhase } from '../types/index.js';

/**
 * Initialize the project review session
 */
export async function initializationNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Initializing session...');
  
  return {
    phase: ReviewPhase.UPLOAD,
    lastAiMessage: `Hello ${state.candidate?.name || 'there'}! Welcome to your project review session. 
    
I'll be reviewing your project presentation today. To get started, please upload your PowerPoint file. 
Once uploaded, I'll analyze the content and ask you questions to understand your project better.`,
    shouldSpeak: true,
  };
}
