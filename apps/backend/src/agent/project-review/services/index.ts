/**
 * Project Review Services
 * PPT parsing, AI detection, question generation, report generation, and diarization
 */

// Re-export diarization service
export * from './diarization.service.js';

import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getStructuredLLM } from '../../core/llm.js';
import {
  retryAsync,
  withTimeout,
  withCircuitBreaker,
  DEFAULT_LLM_RETRY_CONFIG,
  DEFAULT_LLM_TIMEOUT_CONFIG,
  createNodeLogger,
} from '../../core/utils/index.js';
import {
  QuestionLevel,
  type ParsedSlide,
  type PPTMetadata,
  type AIDetectionReport,
  type AIDetectionSection,
  type AIContentResult,
  type ReviewQuestion,
  type ReviewReport,
  type ReviewEvaluation,
  type LevelScores,
} from '../types/index.js';

// ============================================================================
// Logger
// ============================================================================

const logger = createNodeLogger('ProjectReviewAgent', 'Services');

// ============================================================================
// PPT Parsing Service
// ============================================================================

/**
 * Parse PPT file and extract slide content
 * In production, this would use a library like pptx-parser or call an API
 * For now, returns mock data for testing
 */
export async function parsePPTFile(fileUrl: string): Promise<{
  metadata: PPTMetadata;
  slides: ParsedSlide[];
}> {
  console.log(`[PPTParser] Parsing file: ${fileUrl}`);

  // Extract filename from URL
  const filename = fileUrl.split('/').pop() || 'presentation.pptx';

  // TODO: Implement actual PPT parsing using a library like:
  // - officegen
  // - pptx-parser  
  // - External API service

  // For now, return mock slides based on the file being uploaded
  // This allows testing the full workflow
  const mockSlides: ParsedSlide[] = [
    {
      slideNumber: 1,
      title: 'Project Overview',
      content: 'Introduction to the project and its main objectives',
      bullets: [
        'Problem statement and motivation',
        'Key goals and expected outcomes',
        'Target users and stakeholders'
      ],
      notes: undefined,
      hasImages: false,
      hasCharts: false,
    },
    {
      slideNumber: 2,
      title: 'Technical Architecture',
      content: 'System design and technology stack',
      bullets: [
        'Frontend and backend technologies',
        'Database and storage solutions',
        'API design and integrations'
      ],
      notes: undefined,
      hasImages: false,
      hasCharts: false,
    },
    {
      slideNumber: 3,
      title: 'Implementation Details',
      content: 'Key features and development approach',
      bullets: [
        'Core functionality implemented',
        'Challenges faced and solutions',
        'Testing and quality assurance'
      ],
      notes: undefined,
      hasImages: false,
      hasCharts: false,
    },
    {
      slideNumber: 4,
      title: 'Results and Demo',
      content: 'Project outcomes and demonstration',
      bullets: [
        'Key achievements and metrics',
        'Live demonstration of features',
        'User feedback and improvements'
      ],
      notes: undefined,
      hasImages: false,
      hasCharts: false,
    },
    {
      slideNumber: 5,
      title: 'Conclusion',
      content: 'Summary and future work',
      bullets: [
        'Project accomplishments',
        'Lessons learned',
        'Future enhancements planned'
      ],
      notes: undefined,
      hasImages: false,
      hasCharts: false,
    },
  ];

  const metadata: PPTMetadata = {
    filename,
    fileSize: 1024 * 500, // Mock 500KB
    slideCount: mockSlides.length,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  console.log(`[PPTParser] Parsed ${mockSlides.length} slides from ${filename}`);

  return { metadata, slides: mockSlides };
}

/**
 * Extract text content from slides for analysis
 */
export function extractSlideText(slides: ParsedSlide[]): string {
  return slides
    .map(slide => {
      const parts = [slide.title, slide.content, ...slide.bullets];
      if (slide.notes) parts.push(slide.notes);
      return parts.filter(Boolean).join('\n');
    })
    .join('\n\n');
}

// ============================================================================
// AI Content Detection Service
// ============================================================================

const AIDetectionSchema = z.object({
  result: z.enum(['likely_ai', 'possibly_ai', 'likely_human', 'uncertain']),
  confidence: z.number().min(0).max(100),
  indicators: z.array(z.string()),
  explanation: z.string(),
});

const OverallAIDetectionSchema = z.object({
  overallResult: z.enum(['likely_ai', 'possibly_ai', 'likely_human', 'uncertain']),
  overallConfidence: z.number().min(0).max(100),
  summary: z.string(),
});

/**
 * Detect AI-generated content in a text section
 * Includes retry logic
 */
async function detectAIContentInSection(
  content: string,
  slideNumber: number
): Promise<AIDetectionSection> {
  const structuredLLM = getStructuredLLM(AIDetectionSchema);

  const response = await retryAsync(
    () => withTimeout(
      structuredLLM.invoke([
        new SystemMessage(`You are an expert at detecting AI-generated content.
Analyze the following text for signs of AI generation.

Look for:
- Unusually perfect grammar and structure
- Generic phrasing without specific details
- Lack of personal voice or unique insights
- Overuse of transitional phrases
- Perfect but surface-level explanations
- Missing real-world examples or anecdotes
- Repetitive sentence structures

Be objective and provide confidence levels.`),
        new HumanMessage(`Analyze this text for AI-generated content:

${content}`),
      ]),
      DEFAULT_LLM_TIMEOUT_CONFIG
    ),
    { maxRetries: 2 }
  );

  return {
    slideNumber,
    content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    result: response.result as AIContentResult,
    confidence: response.confidence,
    indicators: response.indicators,
    explanation: response.explanation,
  };
}

/**
 * Generate comprehensive AI detection report
 * Includes retry logic
 */
export async function generateAIDetectionReport(
  slides: ParsedSlide[]
): Promise<AIDetectionReport> {
  logger.info('Analyzing slides for AI content...', { slideCount: slides.length });

  // Analyze each slide
  const sections: AIDetectionSection[] = [];

  for (const slide of slides) {
    const content = [slide.title, slide.content, ...slide.bullets].filter(Boolean).join('\n');
    if (content.length > 50) { // Only analyze substantial content
      const section = await detectAIContentInSection(content, slide.slideNumber);
      sections.push(section);
    }
  }

  // Calculate overall assessment
  const aiLikelySections = sections.filter(
    s => s.result === 'likely_ai' || s.result === 'possibly_ai'
  ).length;

  const avgConfidence = sections.length > 0
    ? sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length
    : 0;

  // Get overall summary
  const structuredLLM = getStructuredLLM(OverallAIDetectionSchema);

  const sectionSummaries = sections
    .map(s => `Slide ${s.slideNumber}: ${s.result} (${s.confidence}% confidence)`)
    .join('\n');

  const overallResponse = await retryAsync(
    () => withTimeout(
      structuredLLM.invoke([
        new SystemMessage('Summarize the AI detection analysis across all sections.'),
        new HumanMessage(`Section results:\n${sectionSummaries}\n\nProvide an overall assessment.`),
      ]),
      DEFAULT_LLM_TIMEOUT_CONFIG
    ),
    { maxRetries: 2 }
  );

  logger.info('AI detection complete', {
    overallResult: overallResponse.overallResult,
    confidence: overallResponse.overallConfidence,
  });

  return {
    overallResult: overallResponse.overallResult as AIContentResult,
    overallConfidence: overallResponse.overallConfidence,
    totalSections: sections.length,
    aiLikelySections,
    sections,
    summary: overallResponse.summary,
  };
}

// ============================================================================
// Question Generation Service
// ============================================================================

const QuestionGenerationSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    context: z.string(),
    expectedPoints: z.array(z.string()),
    slideReference: z.number(),
  })),
});

/**
 * Generate questions at a specific difficulty level
 * Includes retry logic with circuit breaker
 */
async function generateQuestionsAtLevel(
  slides: ParsedSlide[],
  projectTitle: string,
  level: QuestionLevel,
  count: number = 5
): Promise<ReviewQuestion[]> {
  logger.info(`Generating ${count} ${level} questions`, { level, count });

  const levelInstructions: Record<QuestionLevel, string> = {
    easy: `Generate EASY questions that:
- Ask about basic facts presented in the slides
- Require simple recall of information
- Can be answered in 1-2 sentences
- Test surface-level understanding`,

    medium: `Generate MEDIUM questions that:
- Ask about relationships between concepts
- Require explanation of methods or approaches
- Need 2-3 sentences to answer well
- Test understanding of "how" and "why"`,

    hard: `Generate HARD questions that:
- Challenge assumptions or decisions made
- Ask about edge cases or limitations
- Require deep technical knowledge
- Test critical thinking and expertise
- Ask "what if" scenarios`,
  };

  const slideContent = slides
    .map(s => `Slide ${s.slideNumber}: ${s.title}\n${s.content}\n${s.bullets.join('\n')}`)
    .join('\n\n');

  const structuredLLM = getStructuredLLM(QuestionGenerationSchema);

  const response = await withCircuitBreaker(
    'project-review-questions',
    () => retryAsync(
      () => withTimeout(
        structuredLLM.invoke([
          new SystemMessage(`You are an expert reviewer generating questions about a project presentation.

${levelInstructions[level]}

Generate questions that will verify the candidate truly understands and owns this project.`),
          new HumanMessage(`Project: ${projectTitle}

Presentation Content:
${slideContent}

Generate ${count} ${level.toUpperCase()} level questions.`),
        ]),
        DEFAULT_LLM_TIMEOUT_CONFIG
      ),
      { maxRetries: 2 }
    )
  );

  return response.questions.map((q: { question: string; context: string; expectedPoints: string[]; slideReference: number }, idx: number) => ({
    id: `${level}-${idx + 1}`,
    level,
    question: q.question,
    context: q.context,
    expectedPoints: q.expectedPoints,
    slideReference: q.slideReference,
  }));
}

/**
 * Generate all levels of questions for a project
 * Runs all levels in parallel for efficiency
 */
export async function generateAllQuestions(
  slides: ParsedSlide[],
  projectTitle: string
): Promise<{
  easy: ReviewQuestion[];
  medium: ReviewQuestion[];
  hard: ReviewQuestion[];
}> {
  logger.info('Generating questions at all levels...', { projectTitle });

  const [easy, medium, hard] = await Promise.all([
    generateQuestionsAtLevel(slides, projectTitle, QuestionLevel.EASY, 5),
    generateQuestionsAtLevel(slides, projectTitle, QuestionLevel.MEDIUM, 5),
    generateQuestionsAtLevel(slides, projectTitle, QuestionLevel.HARD, 3),
  ]);

  logger.info('Question generation complete', {
    easy: easy.length,
    medium: medium.length,
    hard: hard.length,
  });

  return { easy, medium, hard };
}

// ============================================================================
// Answer Evaluation Service
// ============================================================================

const AnswerEvaluationSchema = z.object({
  score: z.number().min(1).max(10),
  feedback: z.string(),
  demonstratesUnderstanding: z.boolean(),
  flaggedConcerns: z.array(z.string()),
});

/**
 * Evaluate a candidate's answer to a review question
 * Includes retry logic
 */
export async function evaluateReviewAnswer(
  question: ReviewQuestion,
  answer: string
): Promise<ReviewEvaluation> {
  logger.info(`Evaluating answer to question: ${question.id}`, { questionId: question.id, level: question.level });

  const structuredLLM = getStructuredLLM(AnswerEvaluationSchema);

  const response = await retryAsync(
    () => withTimeout(
      structuredLLM.invoke([
        new SystemMessage(`You are evaluating a candidate's answer about their project.

Score from 1-10:
- 9-10: Excellent, deep understanding, provides insights beyond the presentation
- 7-8: Good, demonstrates clear ownership and understanding
- 5-6: Adequate, knows the basics but lacks depth
- 3-4: Weak, struggles to explain concepts
- 1-2: Poor, cannot answer or appears unfamiliar with content

Flag concerns if:
- Answer contradicts presentation content
- Candidate seems unfamiliar with their own project
- Answers are suspiciously vague or generic
- Technical terms used incorrectly`),
        new HumanMessage(`Question (${question.level} level): ${question.question}

Context from presentation: ${question.context}

Expected points to cover:
${question.expectedPoints.map(p => `- ${p}`).join('\n')}

Candidate's answer: ${answer}

Evaluate this answer.`),
      ]),
      DEFAULT_LLM_TIMEOUT_CONFIG
    ),
    { maxRetries: 2 }
  );

  logger.info('Evaluation complete', { questionId: question.id, score: response.score });

  return {
    questionId: question.id,
    score: response.score,
    feedback: response.feedback,
    demonstratesUnderstanding: response.demonstratesUnderstanding,
    flaggedConcerns: response.flaggedConcerns,
  };
}

// ============================================================================
// Report Generation Service
// ============================================================================

/**
 * Calculate level-wise scores
 */
function calculateLevelScores(
  evaluations: ReviewEvaluation[],
  questions: ReviewQuestion[]
): LevelScores {
  const getScores = (level: QuestionLevel) => {
    const levelEvals = evaluations.filter(e => {
      const q = questions.find(q => q.id === e.questionId);
      return q?.level === level;
    });

    return {
      asked: levelEvals.length,
      avgScore: levelEvals.length > 0
        ? levelEvals.reduce((sum, e) => sum + e.score, 0) / levelEvals.length
        : 0,
    };
  };

  return {
    easy: getScores(QuestionLevel.EASY),
    medium: getScores(QuestionLevel.MEDIUM),
    hard: getScores(QuestionLevel.HARD),
  };
}

const ReportAssessmentSchema = z.object({
  technicalUnderstanding: z.number().min(1).max(10),
  projectOwnership: z.number().min(1).max(10),
  communicationClarity: z.number().min(1).max(10),
  aiContentConcerns: z.array(z.string()),
  knowledgeGaps: z.array(z.string()),
  overallAssessment: z.string(),
  recommendation: z.enum(['pass', 'conditional_pass', 'fail', 'needs_review']),
  nextSteps: z.array(z.string()),
});

/**
 * Generate comprehensive review report
 */
export async function generateReviewReport(
  sessionId: string,
  candidateName: string,
  projectTitle: string,
  pptMetadata: PPTMetadata,
  aiDetection: AIDetectionReport,
  evaluations: ReviewEvaluation[],
  questions: ReviewQuestion[]
): Promise<ReviewReport> {
  console.log('[Report] Generating comprehensive review report...');

  const levelScores = calculateLevelScores(evaluations, questions);
  const totalScore = evaluations.length > 0
    ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
    : 0;

  // Compile evaluation summaries
  const evalSummary = evaluations.map(e => {
    const q = questions.find(q => q.id === e.questionId);
    return `${q?.level.toUpperCase()} - Score: ${e.score}/10 - ${e.feedback}`;
  }).join('\n');

  // Get AI assessment
  const structuredLLM = getStructuredLLM(ReportAssessmentSchema);

  const response = await structuredLLM.invoke([
    new SystemMessage(`You are generating a final assessment report for a project review session.

Consider:
1. AI content detection results - were significant portions AI-generated?
2. Question performance across difficulty levels
3. Any flagged concerns during questioning
4. Overall demonstration of project ownership

Be fair but thorough.`),
    new HumanMessage(`Candidate: ${candidateName}
Project: ${projectTitle}

AI Detection Summary:
${aiDetection.summary}
Overall: ${aiDetection.overallResult} (${aiDetection.overallConfidence}% confidence)
AI-likely sections: ${aiDetection.aiLikelySections}/${aiDetection.totalSections}

Question Performance:
Easy: ${levelScores.easy.asked} questions, avg ${levelScores.easy.avgScore.toFixed(1)}/10
Medium: ${levelScores.medium.asked} questions, avg ${levelScores.medium.avgScore.toFixed(1)}/10
Hard: ${levelScores.hard.asked} questions, avg ${levelScores.hard.avgScore.toFixed(1)}/10

Detailed Evaluations:
${evalSummary}

Generate the final assessment.`),
  ]);

  return {
    sessionId,
    candidateName,
    projectTitle,
    timestamp: new Date(),
    pptMetadata,
    aiDetection,
    levelScores,
    totalQuestions: evaluations.length,
    averageScore: totalScore,
    technicalUnderstanding: response.technicalUnderstanding,
    projectOwnership: response.projectOwnership,
    communicationClarity: response.communicationClarity,
    aiContentConcerns: response.aiContentConcerns,
    knowledgeGaps: response.knowledgeGaps,
    overallAssessment: response.overallAssessment,
    recommendation: response.recommendation,
    nextSteps: response.nextSteps,
  };
}
