/**
 * Closing Node
 * Handles session completion and farewell
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { ReviewPhase } from '../types/index.js';
import { CLOSING_MESSAGE } from '../prompts/index.js';

/**
 * Close the project review session
 */
export async function closingNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Closing session...');
  
  // Calculate session duration
  const duration = state.time.startTime
    ? Math.floor((Date.now() - new Date(state.time.startTime).getTime()) / 60000)
    : 0;
  
  console.log(`[ProjectReview] Session completed in ${duration} minutes`);
  console.log(`[ProjectReview] Questions answered: ${state.questionsAsked.length}`);
  
  return {
    phase: ReviewPhase.COMPLETED,
    lastAiMessage: CLOSING_MESSAGE,
    time: {
      ...state.time,
      totalDuration: duration * 60,
    },
  };
}
