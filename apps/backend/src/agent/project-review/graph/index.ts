/**
 * Project Review Graph
 * LangGraph workflow definition for the project review agent
 */

import { StateGraph, END, START } from '@langchain/langgraph';

import { ProjectReviewState, type ProjectReviewStateType } from '../state/index.js';
import { ReviewPhase, QuestionLevel } from '../types/index.js';

import {
  initializationNode,
  pptParsingNode,
  aiDetectionNode,
  questionGenerationNode,
  askQuestionNode,
  evaluateAnswerNode,
  levelTransitionNode,
  reportGenerationNode,
  closingNode,
} from '../nodes/index.js';

// ============================================================================
// Node Names
// ============================================================================

export const NODE_NAMES = {
  initialization: 'initialization',
  waitForUpload: 'waitForUpload',
  pptParsing: 'pptParsing',
  aiDetection: 'aiDetection',
  questionGeneration: 'questionGeneration',
  askQuestion: 'askQuestion',
  evaluateAnswer: 'evaluateAnswer',
  levelTransition: 'levelTransition',
  reportGeneration: 'reportGeneration',
  closing: 'closing',
  handleError: 'handleError',
} as const;

export type NodeName = typeof NODE_NAMES[keyof typeof NODE_NAMES];

// ============================================================================
// Routing Functions
// ============================================================================

/**
 * Route after upload wait
 */
function routeFromUpload(state: ProjectReviewStateType): string {
  // Check if we have PPT file OR extracted content
  if (state.pptFile || state.pptContext) {
    console.log('[ProjectReview] PPT available, proceeding to parsing...');
    return NODE_NAMES.pptParsing;
  }
  if (state.errorCount >= 3) {
    return NODE_NAMES.handleError;
  }
  console.log('[ProjectReview] No PPT yet, waiting for upload...');
  return NODE_NAMES.waitForUpload;
}

/**
 * Route after asking a question
 */
function routeFromQuestion(state: ProjectReviewStateType): string {
  // Check if we have a question to evaluate
  if (state.currentQuestion) {
    return NODE_NAMES.evaluateAnswer;
  }

  // Check if we've exhausted all questions
  const { questionsPool, questionsAsked } = state;
  const totalAsked = questionsAsked.length;
  const totalAvailable =
    questionsPool.easy.length +
    questionsPool.medium.length +
    questionsPool.hard.length;

  if (totalAsked >= totalAvailable || totalAsked >= 10) {
    return NODE_NAMES.reportGeneration;
  }

  return NODE_NAMES.evaluateAnswer;
}

/**
 * Route after level transition check
 */
function routeFromLevelTransition(state: ProjectReviewStateType): string {
  if (state.phase === ReviewPhase.REPORT_GENERATION) {
    return NODE_NAMES.reportGeneration;
  }
  return NODE_NAMES.askQuestion;
}

// ============================================================================
// Helper Nodes
// ============================================================================

/**
 * Wait for file upload node
 */
async function waitForUploadNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.log('[ProjectReview] Waiting for PPT upload...');

  if (!state.pptFile) {
    return {
      lastAiMessage: "I'm waiting for your presentation file. Please upload your PowerPoint.",
    };
  }

  return {};
}

/**
 * Error handling node
 */
async function handleErrorNode(
  state: ProjectReviewStateType
): Promise<Partial<ProjectReviewStateType>> {
  console.error('[ProjectReview] Error state:', state.lastError);

  return {
    phase: ReviewPhase.ERROR,
    lastAiMessage: `I apologize, but we've encountered an issue: ${state.lastError || 'Unknown error'}. 
Please contact support for assistance.`,
  };
}

// ============================================================================
// Graph Builder
// ============================================================================

// Type for flexible state graph (LangGraph types are restrictive)
interface CompiledGraph {
  invoke: (
    input: Partial<ProjectReviewStateType>,
    config?: Record<string, unknown>
  ) => Promise<ProjectReviewStateType>;
  stream: (
    input: Partial<ProjectReviewStateType>,
    config?: Record<string, unknown>
  ) => AsyncGenerator<Partial<ProjectReviewStateType>>;
}

interface FlexibleStateGraph {
  addNode: (
    name: string,
    fn: (state: ProjectReviewStateType) => Promise<Partial<ProjectReviewStateType>>
  ) => void;
  addEdge: (from: string, to: string) => void;
  addConditionalEdges: (
    from: string,
    router: (state: ProjectReviewStateType) => string,
    edges: Record<string, string>
  ) => void;
  compile: () => CompiledGraph;
}

/**
 * Build the project review state graph
 */
export function buildProjectReviewGraph(): CompiledGraph {
  const graph = new StateGraph(ProjectReviewState) as unknown as FlexibleStateGraph;

  // -------------------------------------------------------------------------
  // Add Nodes
  // -------------------------------------------------------------------------

  // Setup phase
  graph.addNode(NODE_NAMES.initialization, initializationNode);
  graph.addNode(NODE_NAMES.waitForUpload, waitForUploadNode);
  graph.addNode(NODE_NAMES.pptParsing, pptParsingNode);

  // Analysis phase
  graph.addNode(NODE_NAMES.aiDetection, aiDetectionNode);
  graph.addNode(NODE_NAMES.questionGeneration, questionGenerationNode);

  // Questioning phase
  graph.addNode(NODE_NAMES.askQuestion, askQuestionNode);
  graph.addNode(NODE_NAMES.evaluateAnswer, evaluateAnswerNode);
  graph.addNode(NODE_NAMES.levelTransition, levelTransitionNode);

  // Report phase
  graph.addNode(NODE_NAMES.reportGeneration, reportGenerationNode);
  graph.addNode(NODE_NAMES.closing, closingNode);

  // Error handling
  graph.addNode(NODE_NAMES.handleError, handleErrorNode);

  // -------------------------------------------------------------------------
  // Add Edges
  // -------------------------------------------------------------------------

  // Entry point
  graph.addEdge(START, NODE_NAMES.initialization);
  graph.addEdge(NODE_NAMES.initialization, NODE_NAMES.waitForUpload);

  // Upload routing
  graph.addConditionalEdges(
    NODE_NAMES.waitForUpload,
    routeFromUpload,
    {
      [NODE_NAMES.pptParsing]: NODE_NAMES.pptParsing,
      [NODE_NAMES.waitForUpload]: NODE_NAMES.waitForUpload,
      [NODE_NAMES.handleError]: NODE_NAMES.handleError,
    }
  );

  // Parsing -> Detection -> Question Gen
  graph.addEdge(NODE_NAMES.pptParsing, NODE_NAMES.aiDetection);
  graph.addEdge(NODE_NAMES.aiDetection, NODE_NAMES.questionGeneration);
  graph.addEdge(NODE_NAMES.questionGeneration, NODE_NAMES.askQuestion);

  // Question loop
  graph.addConditionalEdges(
    NODE_NAMES.askQuestion,
    routeFromQuestion,
    {
      [NODE_NAMES.evaluateAnswer]: NODE_NAMES.evaluateAnswer,
      [NODE_NAMES.reportGeneration]: NODE_NAMES.reportGeneration,
    }
  );

  graph.addEdge(NODE_NAMES.evaluateAnswer, NODE_NAMES.levelTransition);

  // Level transition routing
  graph.addConditionalEdges(
    NODE_NAMES.levelTransition,
    routeFromLevelTransition,
    {
      [NODE_NAMES.askQuestion]: NODE_NAMES.askQuestion,
      [NODE_NAMES.reportGeneration]: NODE_NAMES.reportGeneration,
    }
  );

  // Report -> Closing -> End
  graph.addEdge(NODE_NAMES.reportGeneration, NODE_NAMES.closing);
  graph.addEdge(NODE_NAMES.closing, END);
  graph.addEdge(NODE_NAMES.handleError, END);

  return graph.compile();
}

// ============================================================================
// Exports
// ============================================================================

export { routeFromUpload, routeFromQuestion, routeFromLevelTransition };
