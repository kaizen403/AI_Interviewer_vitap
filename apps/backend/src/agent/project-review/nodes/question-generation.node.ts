/**
 * Question Generation Node
 * Generates level-wise questions from presentation content
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { ReviewPhase, QuestionLevel } from '../types/index.js';
import { generateAllQuestions } from '../services/index.js';

/**
 * Generate questions at easy, medium, and hard levels
 */
export async function questionGenerationNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Generating questions...');
  
  const projectTitle = state.candidate?.projectTitle || 'Project';
  
  try {
    const questionsPool = await generateAllQuestions(state.slides, projectTitle);
    
    const totalQuestions = 
      questionsPool.easy.length + 
      questionsPool.medium.length + 
      questionsPool.hard.length;
    
    console.log(`[ProjectReview] Generated ${totalQuestions} questions`);
    console.log(`  Easy: ${questionsPool.easy.length}`);
    console.log(`  Medium: ${questionsPool.medium.length}`);
    console.log(`  Hard: ${questionsPool.hard.length}`);
    
    return {
      questionsPool,
      phase: ReviewPhase.QUESTIONING,
      currentLevel: QuestionLevel.EASY,
      lastAiMessage: `I've reviewed your presentation and prepared some questions. 
We'll start with some basic questions and then move to more detailed ones.

Let's begin!`,
    };
  } catch (error) {
    console.error('[ProjectReview] Question generation error:', error);
    return {
      lastError: `Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      phase: ReviewPhase.ERROR,
    };
  }
}
