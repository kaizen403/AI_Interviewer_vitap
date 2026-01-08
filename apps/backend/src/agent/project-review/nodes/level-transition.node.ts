/**
 * Level Transition Node
 * Manages progression through question difficulty levels
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { ReviewPhase, QuestionLevel } from '../types/index.js';
import { MIN_QUESTIONS_PER_LEVEL, LEVEL_PROGRESSION } from '../utils/index.js';

/**
 * Determine if we should advance to the next difficulty level
 */
export async function levelTransitionNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Checking level transition...');
  
  const { currentLevel, questionsPool, questionsAsked } = state;
  
  // Count questions asked at current level
  const askedAtLevel = questionsAsked.filter(q => q.level === currentLevel).length;
  const availableAtLevel = questionsPool[currentLevel].length;
  
  console.log(`[ProjectReview] Level ${currentLevel}: ${askedAtLevel}/${availableAtLevel} asked`);
  
  // Move to next level if we've asked enough or exhausted questions
  const minRequired = MIN_QUESTIONS_PER_LEVEL[currentLevel];
  
  if (askedAtLevel >= minRequired || askedAtLevel >= availableAtLevel) {
    const nextLevel = LEVEL_PROGRESSION[currentLevel];
    
    if (nextLevel) {
      console.log(`[ProjectReview] Advancing to ${nextLevel} level`);
      return { currentLevel: nextLevel };
    } else {
      // Finished all levels
      console.log('[ProjectReview] All levels complete, generating report');
      return { phase: ReviewPhase.REPORT_GENERATION };
    }
  }
  
  return {};
}
