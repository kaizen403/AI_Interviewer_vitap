/**
 * Report Generation Node
 * Generates comprehensive project review report
 */

import type { ProjectReviewStateType } from '../state/index.js';
import { ReviewPhase, AIContentResult } from '../types/index.js';
import { generateReviewReport } from '../services/index.js';
import { formatReportSummary } from '../utils/index.js';

/**
 * Generate the final project review report
 */
export async function reportGenerationNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Generating final report...');
  
  if (!state.pptMetadata || !state.candidate) {
    return {
      lastError: 'Missing required data for report',
      phase: ReviewPhase.ERROR,
    };
  }
  
  try {
    // Create default AI detection if missing
    const aiDetection = state.aiDetection || {
      overallResult: AIContentResult.UNCERTAIN,
      overallConfidence: 0,
      totalSections: 0,
      aiLikelySections: 0,
      sections: [],
      summary: 'AI detection was not performed',
    };
    
    const report = await generateReviewReport(
      state.sessionId,
      state.candidate.name,
      state.candidate.projectTitle,
      state.pptMetadata,
      aiDetection,
      state.evaluations,
      state.questionsAsked
    );
    
    console.log(`[ProjectReview] Report generated:`);
    console.log(`  Average Score: ${report.averageScore.toFixed(1)}/10`);
    console.log(`  Recommendation: ${report.recommendation}`);
    
    // Format summary message for candidate
    const summaryMessage = formatReportSummary(report, state.candidate.name);
    
    return {
      finalReport: report,
      phase: ReviewPhase.COMPLETED,
      lastAiMessage: summaryMessage,
    };
  } catch (error) {
    console.error('[ProjectReview] Report generation error:', error);
    return {
      lastError: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      phase: ReviewPhase.ERROR,
    };
  }
}
