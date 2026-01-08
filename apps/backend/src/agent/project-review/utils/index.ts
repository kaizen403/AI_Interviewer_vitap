/**
 * Project Review Utilities
 * Helper functions for scoring, formatting, and calculations
 */

import { QuestionLevel, type ReviewEvaluation, type ReviewReport } from '../types/index.js';
import { FEEDBACK_MESSAGES } from '../prompts/index.js';

// ============================================================================
// Constants
// ============================================================================

/** Minimum questions to ask at each level before progressing */
export const MIN_QUESTIONS_PER_LEVEL: Record<QuestionLevel, number> = {
  [QuestionLevel.EASY]: 2,
  [QuestionLevel.MEDIUM]: 2,
  [QuestionLevel.HARD]: 2,
};

/** Level progression order */
export const LEVEL_PROGRESSION: Record<QuestionLevel, QuestionLevel | null> = {
  [QuestionLevel.EASY]: QuestionLevel.MEDIUM,
  [QuestionLevel.MEDIUM]: QuestionLevel.HARD,
  [QuestionLevel.HARD]: null, // End of levels
};

/** Score thresholds for recommendations */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 8,
  GOOD: 6,
  ADEQUATE: 4,
  WEAK: 2,
};

// ============================================================================
// Feedback Functions
// ============================================================================

/**
 * Get appropriate feedback message based on score
 */
export function getFeedbackMessage(score: number): string {
  const messages = score >= 8 
    ? FEEDBACK_MESSAGES.excellent
    : score >= 6 
    ? FEEDBACK_MESSAGES.good
    : score >= 4 
    ? FEEDBACK_MESSAGES.adequate
    : FEEDBACK_MESSAGES.weak;
  
  // Return random message from category
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================================================
// Score Calculation Functions
// ============================================================================

/**
 * Calculate average score from evaluations
 */
export function calculateAverageScore(evaluations: ReviewEvaluation[]): number {
  if (evaluations.length === 0) return 0;
  return evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;
}

/**
 * Calculate scores by difficulty level
 */
export function calculateScoresByLevel(
  evaluations: ReviewEvaluation[],
  questionsAsked: { id: string; level: QuestionLevel }[]
): Record<QuestionLevel, { count: number; avgScore: number }> {
  const result: Record<QuestionLevel, { count: number; avgScore: number }> = {
    [QuestionLevel.EASY]: { count: 0, avgScore: 0 },
    [QuestionLevel.MEDIUM]: { count: 0, avgScore: 0 },
    [QuestionLevel.HARD]: { count: 0, avgScore: 0 },
  };
  
  for (const level of Object.values(QuestionLevel)) {
    const levelQuestions = questionsAsked.filter(q => q.level === level);
    const levelEvals = evaluations.filter(e => 
      levelQuestions.some(q => q.id === e.questionId)
    );
    
    result[level] = {
      count: levelEvals.length,
      avgScore: levelEvals.length > 0
        ? levelEvals.reduce((sum, e) => sum + e.score, 0) / levelEvals.length
        : 0,
    };
  }
  
  return result;
}

/**
 * Count flagged concerns from evaluations
 */
export function countConcerns(evaluations: ReviewEvaluation[]): number {
  return evaluations.reduce(
    (sum, e) => sum + (e.flaggedConcerns?.length || 0),
    0
  );
}

/**
 * Determine recommendation based on scores and concerns
 */
export function determineRecommendation(
  avgScore: number,
  concernCount: number,
  aiDetectionConfidence: number
): 'proceed' | 'review' | 'reject' {
  // High AI content is automatic review
  if (aiDetectionConfidence > 80) {
    return 'review';
  }
  
  // Many concerns need review
  if (concernCount >= 3) {
    return 'review';
  }
  
  // Score-based recommendation
  if (avgScore >= SCORE_THRESHOLDS.GOOD) {
    return 'proceed';
  } else if (avgScore >= SCORE_THRESHOLDS.ADEQUATE) {
    return 'review';
  } else {
    return 'reject';
  }
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format level scores as readable string
 */
export function formatLevelScores(
  scores: Record<QuestionLevel, { count: number; avgScore: number }>
): string {
  return Object.entries(scores)
    .map(([level, data]) => 
      `${level.charAt(0).toUpperCase() + level.slice(1)}: ${data.avgScore.toFixed(1)}/10 (${data.count} questions)`
    )
    .join('\n');
}

/**
 * Format report summary for candidate
 */
export function formatReportSummary(report: ReviewReport, candidateName: string): string {
  let message = `Thank you for completing the project review, ${candidateName}!

Here's a quick summary:
- Questions answered: ${report.levelScores.easy.asked + report.levelScores.medium.asked + report.levelScores.hard.asked}
- Overall score: ${report.averageScore.toFixed(1)}/10
- Recommendation: ${report.recommendation.replace('_', ' ')}

${report.overallAssessment}`;

  if (report.nextSteps.length > 0) {
    message += `\n\nNext steps:\n${report.nextSteps.map(s => `• ${s}`).join('\n')}`;
  }
  
  return message;
}

/**
 * Format duration as readable string
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a level is complete (enough questions asked)
 */
export function isLevelComplete(
  level: QuestionLevel,
  questionsAsked: { level: QuestionLevel }[],
  questionsAvailable: number
): boolean {
  const asked = questionsAsked.filter(q => q.level === level).length;
  return asked >= MIN_QUESTIONS_PER_LEVEL[level] || asked >= questionsAvailable;
}

/**
 * Check if all levels are complete
 */
export function areAllLevelsComplete(
  questionsAsked: { level: QuestionLevel }[],
  questionsPool: Record<QuestionLevel, unknown[]>
): boolean {
  return Object.values(QuestionLevel).every(level =>
    isLevelComplete(level, questionsAsked, questionsPool[level].length)
  );
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate unique ID for questions or evaluations
 */
export function generateId(prefix: string = 'pr'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
