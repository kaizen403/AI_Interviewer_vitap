/**
 * Ask Question Node
 * Presents questions to the candidate based on current level
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { QuestionLevel } from '../types/index.js';
import { LEVEL_TRANSITION_MESSAGES } from '../prompts/index.js';

/**
 * Select and ask the next question from the current difficulty level
 */
export async function askQuestionNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log(`[ProjectReview] Asking ${state.currentLevel} question...`);
  
  const { questionsPool, questionsAsked, currentLevel } = state;
  
  // Get next question from current level
  const levelQuestions = questionsPool[currentLevel];
  const askedIds = new Set(questionsAsked.map(q => q.id));
  const nextQuestion = levelQuestions.find(q => !askedIds.has(q.id));
  
  if (!nextQuestion) {
    // No more questions at this level
    console.log(`[ProjectReview] No more ${currentLevel} questions available`);
    return {};
  }
  
  // Add transition message for first question of new level
  const isFirstOfLevel = !questionsAsked.some(q => q.level === currentLevel);
  let message = nextQuestion.question;
  
  if (isFirstOfLevel) {
    message = `${LEVEL_TRANSITION_MESSAGES[currentLevel]} ${nextQuestion.question}`;
  }
  
  console.log(`[ProjectReview] Question ${questionsAsked.length + 1}: ${nextQuestion.id}`);
  
  return {
    currentQuestion: nextQuestion,
    lastAiMessage: message,
    time: {
      ...state.time,
      currentQuestionStartTime: new Date(),
    },
  };
}
