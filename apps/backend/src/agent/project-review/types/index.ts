/**
 * Project Review Agent Types
 * Core type definitions for the project review system
 */

// ============================================================================
// Enums
// ============================================================================

/** Review phases */
export enum ReviewPhase {
  UPLOAD = 'upload',
  PARSING = 'parsing',
  AI_DETECTION = 'ai_detection',
  QUESTION_GENERATION = 'question_generation',
  QUESTIONING = 'questioning',
  REPORT_GENERATION = 'report_generation',
  COMPLETED = 'completed',
  ERROR = 'error',
}

/** Question difficulty levels */
export enum QuestionLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

/** AI content detection result */
export enum AIContentResult {
  LIKELY_AI = 'likely_ai',
  POSSIBLY_AI = 'possibly_ai',
  LIKELY_HUMAN = 'likely_human',
  UNCERTAIN = 'uncertain',
}

// ============================================================================
// Slide & Content Types
// ============================================================================

/** Parsed slide from PPT */
export interface ParsedSlide {
  slideNumber: number;
  title: string;
  content: string;
  bullets: string[];
  notes?: string;
  hasImages: boolean;
  hasCharts: boolean;
}

/** PPT document metadata */
export interface PPTMetadata {
  filename: string;
  slideCount: number;
  author?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  fileSize: number;
}

/** AI detection analysis for a section */
export interface AIDetectionSection {
  slideNumber: number;
  content: string;
  result: AIContentResult;
  confidence: number;
  indicators: string[];
  explanation: string;
}

/** Overall AI detection report */
export interface AIDetectionReport {
  overallResult: AIContentResult;
  overallConfidence: number;
  totalSections: number;
  aiLikelySections: number;
  sections: AIDetectionSection[];
  summary: string;
}

// ============================================================================
// Question Types
// ============================================================================

/** Generated question for review */
export interface ReviewQuestion {
  id: string;
  level: QuestionLevel;
  question: string;
  context: string; // Which slide/content this relates to
  expectedPoints: string[];
  slideReference: number;
}

/** Candidate's answer to a review question */
export interface ReviewAnswer {
  questionId: string;
  transcript: string;
  duration: number;
  timestamp: Date;
}

/** Answer evaluation */
export interface ReviewEvaluation {
  questionId: string;
  score: number; // 1-10
  feedback: string;
  demonstratesUnderstanding: boolean;
  flaggedConcerns: string[];
}

// ============================================================================
// Report Types
// ============================================================================

/** Level-wise score breakdown */
export interface LevelScores {
  easy: {
    asked: number;
    avgScore: number;
  };
  medium: {
    asked: number;
    avgScore: number;
  };
  hard: {
    asked: number;
    avgScore: number;
  };
}

/** Comprehensive review report */
export interface ReviewReport {
  sessionId: string;
  candidateName: string;
  projectTitle: string;
  timestamp: Date;
  
  // PPT Analysis
  pptMetadata: PPTMetadata;
  aiDetection: AIDetectionReport;
  
  // Question Performance
  levelScores: LevelScores;
  totalQuestions: number;
  averageScore: number;
  
  // Detailed assessments
  technicalUnderstanding: number; // 1-10
  projectOwnership: number; // 1-10
  communicationClarity: number; // 1-10
  
  // Concerns
  aiContentConcerns: string[];
  knowledgeGaps: string[];
  
  // Recommendations
  overallAssessment: string;
  recommendation: 'pass' | 'conditional_pass' | 'fail' | 'needs_review';
  nextSteps: string[];
}

// ============================================================================
// State Types
// ============================================================================

/** Candidate info for project review */
export interface ReviewCandidateInfo {
  id: string;
  name: string;
  email: string;
  projectTitle: string;
}

/** Time tracking */
export interface ReviewTimeState {
  startTime: Date;
  currentQuestionStartTime: Date | null;
  totalDuration: number;
}

/** Connection state */
export interface ReviewConnectionState {
  isConnected: boolean;
  lastHeartbeat: Date;
}
