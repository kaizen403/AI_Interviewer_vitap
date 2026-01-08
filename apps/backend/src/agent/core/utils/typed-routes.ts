/**
 * Typed Router Utilities
 * Strongly typed routing decisions for LangGraph agents
 * Prevents string typos and enables better IDE support
 */

// ============================================================================
// Interview Agent Route Types
// ============================================================================

/**
 * Interview graph node names (const enum for type safety)
 */
export const InterviewNodes = {
  // Initialization
  INITIALIZATION: 'initialization',
  RUN_PRE_CHECK: 'runPreCheck',
  
  // Greeting
  GREETING: 'greeting',
  GREETING_CONFIRM: 'greetingConfirm',
  
  // Questions
  ASK_QUESTION: 'askQuestion',
  EVALUATE_ANSWER: 'evaluateAnswer',
  FOLLOW_UP: 'followUp',
  SKIP_QUESTION: 'skipQuestion',
  REPHRASE_QUESTION: 'rephraseQuestion',
  REPEAT_QUESTION: 'repeatQuestion',
  HANDLE_TIMEOUT: 'handleTimeout',
  
  // Emergency & Connection
  HANDLE_EMERGENCY_PAUSE: 'handleEmergencyPause',
  CONNECTION_RECOVERY: 'connectionRecovery',
  
  // Ethics
  ETHICS_INTRO: 'ethicsIntro',
  ETHICS_QUESTION: 'ethicsQuestion',
  ETHICS_EVALUATE: 'ethicsEvaluate',
  
  // Candidate Questions
  CANDIDATE_QUESTIONS_INTRO: 'candidateQuestionsIntro',
  HANDLE_CANDIDATE_QUESTION: 'handleCandidateQuestion',
  
  // Closing
  CLOSING: 'closing',
  COMPLETE: 'complete',
  TERMINATE: 'terminate',
} as const;

export type InterviewNodeName = typeof InterviewNodes[keyof typeof InterviewNodes];

/**
 * Pre-check routing decisions
 */
export const PreCheckRoutes = {
  GREETING: InterviewNodes.GREETING,
  RUN_PRE_CHECK: InterviewNodes.RUN_PRE_CHECK,
  TERMINATE: InterviewNodes.TERMINATE,
} as const;

export type PreCheckRoute = typeof PreCheckRoutes[keyof typeof PreCheckRoutes];

/**
 * Question routing decisions
 */
export const QuestionRoutes = {
  EVALUATE_ANSWER: InterviewNodes.EVALUATE_ANSWER,
  REPHRASE_QUESTION: InterviewNodes.REPHRASE_QUESTION,
  REPEAT_QUESTION: InterviewNodes.REPEAT_QUESTION,
  HANDLE_TIMEOUT: InterviewNodes.HANDLE_TIMEOUT,
  HANDLE_EMERGENCY_PAUSE: InterviewNodes.HANDLE_EMERGENCY_PAUSE,
  CONNECTION_RECOVERY: InterviewNodes.CONNECTION_RECOVERY,
  ETHICS_INTRO: InterviewNodes.ETHICS_INTRO,
  CLOSING: InterviewNodes.CLOSING,
} as const;

export type QuestionRoute = typeof QuestionRoutes[keyof typeof QuestionRoutes];

/**
 * Timeout routing decisions
 */
export const TimeoutRoutes = {
  REPHRASE_QUESTION: InterviewNodes.REPHRASE_QUESTION,
  SKIP_QUESTION: InterviewNodes.SKIP_QUESTION,
  ASK_QUESTION: InterviewNodes.ASK_QUESTION,
  EVALUATE_ANSWER: InterviewNodes.EVALUATE_ANSWER,
} as const;

export type TimeoutRoute = typeof TimeoutRoutes[keyof typeof TimeoutRoutes];

/**
 * Emergency pause routing decisions
 */
export const EmergencyPauseRoutes = {
  ASK_QUESTION: InterviewNodes.ASK_QUESTION,
  CLOSING: InterviewNodes.CLOSING,
  TERMINATE: InterviewNodes.TERMINATE,
} as const;

export type EmergencyPauseRoute = typeof EmergencyPauseRoutes[keyof typeof EmergencyPauseRoutes];

/**
 * Connection recovery routing decisions
 */
export const ConnectionRecoveryRoutes = {
  ASK_QUESTION: InterviewNodes.ASK_QUESTION,
  HANDLE_EMERGENCY_PAUSE: InterviewNodes.HANDLE_EMERGENCY_PAUSE,
  CLOSING: InterviewNodes.CLOSING,
  TERMINATE: InterviewNodes.TERMINATE,
} as const;

export type ConnectionRecoveryRoute = typeof ConnectionRecoveryRoutes[keyof typeof ConnectionRecoveryRoutes];

/**
 * Evaluation routing decisions
 */
export const EvaluationRoutes = {
  ASK_QUESTION: InterviewNodes.ASK_QUESTION,
  FOLLOW_UP: InterviewNodes.FOLLOW_UP,
  ETHICS_INTRO: InterviewNodes.ETHICS_INTRO,
  CLOSING: InterviewNodes.CLOSING,
} as const;

export type EvaluationRoute = typeof EvaluationRoutes[keyof typeof EvaluationRoutes];

/**
 * Ethics question routing decisions
 */
export const EthicsQuestionRoutes = {
  ETHICS_EVALUATE: InterviewNodes.ETHICS_EVALUATE,
  CANDIDATE_QUESTIONS_INTRO: InterviewNodes.CANDIDATE_QUESTIONS_INTRO,
  CLOSING: InterviewNodes.CLOSING,
} as const;

export type EthicsQuestionRoute = typeof EthicsQuestionRoutes[keyof typeof EthicsQuestionRoutes];

/**
 * Ethics evaluation routing decisions
 */
export const EthicsEvaluateRoutes = {
  ETHICS_QUESTION: InterviewNodes.ETHICS_QUESTION,
  CANDIDATE_QUESTIONS_INTRO: InterviewNodes.CANDIDATE_QUESTIONS_INTRO,
  CLOSING: InterviewNodes.CLOSING,
} as const;

export type EthicsEvaluateRoute = typeof EthicsEvaluateRoutes[keyof typeof EthicsEvaluateRoutes];

/**
 * Candidate questions intro routing decisions
 */
export const CandidateQuestionsIntroRoutes = {
  HANDLE_CANDIDATE_QUESTION: InterviewNodes.HANDLE_CANDIDATE_QUESTION,
  CLOSING: InterviewNodes.CLOSING,
} as const;

export type CandidateQuestionsIntroRoute = typeof CandidateQuestionsIntroRoutes[keyof typeof CandidateQuestionsIntroRoutes];

/**
 * Handle candidate question routing decisions
 */
export const HandleCandidateQuestionRoutes = {
  HANDLE_CANDIDATE_QUESTION: InterviewNodes.HANDLE_CANDIDATE_QUESTION,
  CLOSING: InterviewNodes.CLOSING,
} as const;

export type HandleCandidateQuestionRoute = typeof HandleCandidateQuestionRoutes[keyof typeof HandleCandidateQuestionRoutes];

// ============================================================================
// Project Review Agent Route Types
// ============================================================================

/**
 * Project review graph node names
 */
export const ProjectReviewNodes = {
  // Setup
  INITIALIZATION: 'initialization',
  WAIT_FOR_UPLOAD: 'waitForUpload',
  PPT_PARSING: 'pptParsing',
  
  // Analysis
  AI_DETECTION: 'aiDetection',
  QUESTION_GENERATION: 'questionGeneration',
  
  // Questioning
  ASK_QUESTION: 'askQuestion',
  EVALUATE_ANSWER: 'evaluateAnswer',
  LEVEL_TRANSITION: 'levelTransition',
  
  // Report
  REPORT_GENERATION: 'reportGeneration',
  CLOSING: 'closing',
  
  // Error
  HANDLE_ERROR: 'handleError',
} as const;

export type ProjectReviewNodeName = typeof ProjectReviewNodes[keyof typeof ProjectReviewNodes];

/**
 * Upload routing decisions
 */
export const UploadRoutes = {
  PPT_PARSING: ProjectReviewNodes.PPT_PARSING,
  WAIT_FOR_UPLOAD: ProjectReviewNodes.WAIT_FOR_UPLOAD,
  HANDLE_ERROR: ProjectReviewNodes.HANDLE_ERROR,
} as const;

export type UploadRoute = typeof UploadRoutes[keyof typeof UploadRoutes];

/**
 * Project review question routing decisions
 */
export const ProjectQuestionRoutes = {
  EVALUATE_ANSWER: ProjectReviewNodes.EVALUATE_ANSWER,
  REPORT_GENERATION: ProjectReviewNodes.REPORT_GENERATION,
} as const;

export type ProjectQuestionRoute = typeof ProjectQuestionRoutes[keyof typeof ProjectQuestionRoutes];

/**
 * Level transition routing decisions
 */
export const LevelTransitionRoutes = {
  ASK_QUESTION: ProjectReviewNodes.ASK_QUESTION,
  REPORT_GENERATION: ProjectReviewNodes.REPORT_GENERATION,
} as const;

export type LevelTransitionRoute = typeof LevelTransitionRoutes[keyof typeof LevelTransitionRoutes];

// ============================================================================
// Route Map Builders (for addConditionalEdges)
// ============================================================================

/**
 * Build a route map object for addConditionalEdges
 * Ensures type safety for route destinations
 */
export function buildRouteMap<T extends Record<string, string>>(
  routes: T
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(routes).map(([key, value]) => [value, value])
  );
}

/**
 * Create pre-check route map
 */
export function getPreCheckRouteMap(): Record<PreCheckRoute, string> {
  return {
    [PreCheckRoutes.GREETING]: PreCheckRoutes.GREETING,
    [PreCheckRoutes.RUN_PRE_CHECK]: PreCheckRoutes.RUN_PRE_CHECK,
    [PreCheckRoutes.TERMINATE]: PreCheckRoutes.TERMINATE,
  };
}

/**
 * Create question route map
 */
export function getQuestionRouteMap(): Record<QuestionRoute, string> {
  return {
    [QuestionRoutes.EVALUATE_ANSWER]: QuestionRoutes.EVALUATE_ANSWER,
    [QuestionRoutes.REPHRASE_QUESTION]: QuestionRoutes.REPHRASE_QUESTION,
    [QuestionRoutes.REPEAT_QUESTION]: QuestionRoutes.REPEAT_QUESTION,
    [QuestionRoutes.HANDLE_TIMEOUT]: QuestionRoutes.HANDLE_TIMEOUT,
    [QuestionRoutes.HANDLE_EMERGENCY_PAUSE]: QuestionRoutes.HANDLE_EMERGENCY_PAUSE,
    [QuestionRoutes.CONNECTION_RECOVERY]: QuestionRoutes.CONNECTION_RECOVERY,
    [QuestionRoutes.ETHICS_INTRO]: QuestionRoutes.ETHICS_INTRO,
    [QuestionRoutes.CLOSING]: QuestionRoutes.CLOSING,
  };
}

/**
 * Create timeout route map
 */
export function getTimeoutRouteMap(): Record<TimeoutRoute, string> {
  return {
    [TimeoutRoutes.REPHRASE_QUESTION]: TimeoutRoutes.REPHRASE_QUESTION,
    [TimeoutRoutes.SKIP_QUESTION]: TimeoutRoutes.SKIP_QUESTION,
    [TimeoutRoutes.ASK_QUESTION]: TimeoutRoutes.ASK_QUESTION,
    [TimeoutRoutes.EVALUATE_ANSWER]: TimeoutRoutes.EVALUATE_ANSWER,
  };
}

/**
 * Create evaluation route map
 */
export function getEvaluationRouteMap(): Record<EvaluationRoute, string> {
  return {
    [EvaluationRoutes.ASK_QUESTION]: EvaluationRoutes.ASK_QUESTION,
    [EvaluationRoutes.FOLLOW_UP]: EvaluationRoutes.FOLLOW_UP,
    [EvaluationRoutes.ETHICS_INTRO]: EvaluationRoutes.ETHICS_INTRO,
    [EvaluationRoutes.CLOSING]: EvaluationRoutes.CLOSING,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a route is a valid destination
 */
export function isValidInterviewRoute(route: string): route is InterviewNodeName {
  return Object.values(InterviewNodes).includes(route as InterviewNodeName);
}

/**
 * Validate that a route is a valid project review destination
 */
export function isValidProjectReviewRoute(route: string): route is ProjectReviewNodeName {
  return Object.values(ProjectReviewNodes).includes(route as ProjectReviewNodeName);
}

/**
 * Assert route validity (throws if invalid)
 */
export function assertValidRoute(
  route: string,
  validRoutes: readonly string[],
  context: string
): void {
  if (!validRoutes.includes(route)) {
    throw new Error(
      `Invalid route "${route}" in ${context}. Valid routes: ${validRoutes.join(', ')}`
    );
  }
}
