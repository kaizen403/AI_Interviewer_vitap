/**
 * Evaluate Answer Node
 * Evaluates candidate's response to the current question
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { evaluateReviewAnswer } from '../services/index.js';
import { getFeedbackMessage } from '../utils/index.js';

/**
 * Evaluate the candidate's answer and provide feedback
 */
export async function evaluateAnswerNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Evaluating answer...');
  
  const { currentQuestion, lastUserMessage, answers } = state;
  
  if (!currentQuestion) {
    return { lastError: 'No current question to evaluate' };
  }
  
  // Record the answer with timing
  const answerDuration = state.time.currentQuestionStartTime
    ? (Date.now() - new Date(state.time.currentQuestionStartTime).getTime()) / 1000
    : 0;
  
  const answer = {
    questionId: currentQuestion.id,
    transcript: lastUserMessage,
    duration: answerDuration,
    timestamp: new Date(),
  };
  
  try {
    const evaluation = await evaluateReviewAnswer(currentQuestion, lastUserMessage);
    
    console.log(`[ProjectReview] Score: ${evaluation.score}/10`);
    
    if (evaluation.flaggedConcerns.length > 0) {
      console.warn('[ProjectReview] Concerns:', evaluation.flaggedConcerns);
    }
    
    // Get appropriate feedback based on score
    const feedback = getFeedbackMessage(evaluation.score);
    
    return {
      answers: [...answers, answer],
      evaluations: [...state.evaluations, evaluation],
      questionsAsked: [...state.questionsAsked, currentQuestion],
      currentQuestion: null,
      lastAiMessage: feedback,
    };
  } catch (error) {
    console.error('[ProjectReview] Evaluation error:', error);
    return {
      answers: [...answers, answer],
      questionsAsked: [...state.questionsAsked, currentQuestion],
      currentQuestion: null,
      lastError: 'Evaluation failed, continuing...',
      lastAiMessage: 'Thank you for your answer. Let\'s continue.',
    };
  }
}
