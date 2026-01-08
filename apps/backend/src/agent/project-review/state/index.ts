/**
 * Project Review State Definition
 * LangGraph state annotation for the project review workflow
 */

import { Annotation } from '@langchain/langgraph';
import type {
  ReviewPhase,
  ParsedSlide,
  PPTMetadata,
  AIDetectionReport,
  ReviewQuestion,
  ReviewAnswer,
  ReviewEvaluation,
  ReviewReport,
  ReviewCandidateInfo,
  ReviewTimeState,
  ReviewConnectionState,
  QuestionLevel,
} from '../types/index.js';
import type { TranscriptEntry } from '../../core/types.js';

// ============================================================================
// State Type
// ============================================================================

export interface ProjectReviewStateType {
  // Session info
  sessionId: string;
  roomName: string;
  phase: ReviewPhase;
  
  // Candidate info
  candidate: ReviewCandidateInfo | null;
  
  // PPT content
  pptFile: string | null; // URL or path to uploaded file
  pptMetadata: PPTMetadata | null;
  slides: ParsedSlide[];
  
  // AI Detection
  aiDetection: AIDetectionReport | null;
  
  // Questions
  questionsPool: {
    easy: ReviewQuestion[];
    medium: ReviewQuestion[];
    hard: ReviewQuestion[];
  };
  currentQuestion: ReviewQuestion | null;
  questionsAsked: ReviewQuestion[];
  currentLevel: QuestionLevel;
  
  // Answers & Evaluations
  answers: ReviewAnswer[];
  evaluations: ReviewEvaluation[];
  
  // Report
  finalReport: ReviewReport | null;
  
  // Connection
  connection: ReviewConnectionState;
  
  // Time tracking
  time: ReviewTimeState;
  
  // Conversation
  transcript: TranscriptEntry[];
  lastAiMessage: string;
  lastUserMessage: string;
  shouldSpeak: boolean;
  
  // Error handling
  errorCount: number;
  lastError: string | null;
}

// ============================================================================
// Reducer Functions for Array State
// ============================================================================

/**
 * Reducer for arrays - appends new items or replaces if full array provided
 */
function arrayReducer<T>(current: T[], update: T[]): T[] {
  // If update is empty, keep current
  if (update.length === 0) return current;
  // If current is empty, use update
  if (current.length === 0) return update;
  // Otherwise concatenate (assumes update contains only new items)
  return [...current, ...update];
}

/**
 * Reducer for transcript entries - always appends
 */
function transcriptReducer(current: TranscriptEntry[], update: TranscriptEntry[]): TranscriptEntry[] {
  return [...current, ...update];
}

// ============================================================================
// State Annotation
// ============================================================================

export const ProjectReviewState = Annotation.Root({
  // Session info
  sessionId: Annotation<string>,
  roomName: Annotation<string>,
  phase: Annotation<ReviewPhase>,
  
  // Candidate info
  candidate: Annotation<ReviewCandidateInfo | null>,
  
  // PPT content
  pptFile: Annotation<string | null>,
  pptMetadata: Annotation<PPTMetadata | null>,
  slides: Annotation<ParsedSlide[]>({
    reducer: (current, update) => update.length > 0 ? update : current,
    default: () => [],
  }),
  
  // AI Detection
  aiDetection: Annotation<AIDetectionReport | null>,
  
  // Questions
  questionsPool: Annotation<{
    easy: ReviewQuestion[];
    medium: ReviewQuestion[];
    hard: ReviewQuestion[];
  }>({
    reducer: (current, update) => update ?? current,
    default: () => ({ easy: [], medium: [], hard: [] }),
  }),
  currentQuestion: Annotation<ReviewQuestion | null>,
  questionsAsked: Annotation<ReviewQuestion[]>({
    reducer: arrayReducer,
    default: () => [],
  }),
  currentLevel: Annotation<QuestionLevel>,
  
  // Answers & Evaluations - these accumulate
  answers: Annotation<ReviewAnswer[]>({
    reducer: arrayReducer,
    default: () => [],
  }),
  evaluations: Annotation<ReviewEvaluation[]>({
    reducer: arrayReducer,
    default: () => [],
  }),
  
  // Report
  finalReport: Annotation<ReviewReport | null>,
  
  // Connection
  connection: Annotation<ReviewConnectionState>,
  
  // Time tracking
  time: Annotation<ReviewTimeState>,
  
  // Conversation - transcripts should always append
  transcript: Annotation<TranscriptEntry[]>({
    reducer: transcriptReducer,
    default: () => [],
  }),
  lastAiMessage: Annotation<string>,
  lastUserMessage: Annotation<string>,
  shouldSpeak: Annotation<boolean>,
  
  // Error handling
  errorCount: Annotation<number>({
    reducer: (current, update) => (update !== undefined ? update : current),
    default: () => 0,
  }),
  lastError: Annotation<string | null>,
});

// ============================================================================
// Default State Creators
// ============================================================================

export function createDefaultReviewConnectionState(): ReviewConnectionState {
  return {
    isConnected: false,
    lastHeartbeat: new Date(),
  };
}

export function createDefaultReviewTimeState(): ReviewTimeState {
  return {
    startTime: new Date(),
    currentQuestionStartTime: null,
    totalDuration: 0,
  };
}
