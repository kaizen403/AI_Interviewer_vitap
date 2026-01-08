/**
 * Agent Module Entry Point
 * 
 * Voice agents powered by LangGraph for conducting AI conversations.
 * 
 * Architecture:
 * - core/           - Shared infrastructure (base classes, LLM, types, factory)
 * - project-review/ - Project review agent (PPT review with AI detection)
 */

import 'dotenv/config';

// ============================================================================
// Core Infrastructure
// ============================================================================

export * from './core/index.js';

// ============================================================================
// Project Review Agent
// ============================================================================

export {
  ProjectReviewAgent,
  type ProjectReviewAgentConfig,
  ProjectReviewState,
  type ProjectReviewStateType,
  ReviewPhase,
  QuestionLevel,
  AIContentResult,
} from './project-review/index.js';

// ============================================================================
// Default Export (Voice Agent Router)
// ============================================================================

export { default } from './voice-agent-router.js';

