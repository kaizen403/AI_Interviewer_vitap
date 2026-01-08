/**
 * Core LLM Configuration
 * Shared LLM instances and utilities for all agents
 */

import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { LLMConfig } from './types.js';

// ============================================================================
// Default LLM Configurations
// ============================================================================

/**
 * Default configurations for different use cases
 */
export const DEFAULT_LLM_CONFIGS = {
  /** Main conversation LLM - balanced quality and speed */
  conversation: {
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024,
  } as LLMConfig,
  
  /** Structured output LLM - for JSON responses */
  structured: {
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2048,
  } as LLMConfig,
  
  /** Fast LLM - for quick decisions and routing */
  fast: {
    model: 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 256,
  } as LLMConfig,
  
  /** Creative LLM - for content generation */
  creative: {
    model: 'gpt-4o',
    temperature: 0.9,
    maxTokens: 2048,
  } as LLMConfig,
} as const;

// ============================================================================
// LLM Factory
// ============================================================================

/**
 * Create a ChatOpenAI instance from config
 */
export function createLLM(config: LLMConfig): ChatOpenAI {
  return new ChatOpenAI({
    modelName: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });
}

/**
 * Create a structured LLM with Zod schema
 */
export function createStructuredLLM<T extends z.ZodType>(
  schema: T,
  config: LLMConfig = DEFAULT_LLM_CONFIGS.structured
) {
  const llm = createLLM(config);
  return llm.withStructuredOutput(schema);
}

// ============================================================================
// Pre-configured LLM Instances (Lazy loaded)
// ============================================================================

let _conversationLLM: ChatOpenAI | null = null;
let _structuredLLM: ChatOpenAI | null = null;
let _fastLLM: ChatOpenAI | null = null;

/**
 * Get the conversation LLM instance
 */
export function getConversationLLM(): ChatOpenAI {
  if (!_conversationLLM) {
    _conversationLLM = createLLM(DEFAULT_LLM_CONFIGS.conversation);
  }
  return _conversationLLM;
}

/**
 * Get the structured output LLM instance
 */
export function getStructuredOutputLLM(): ChatOpenAI {
  if (!_structuredLLM) {
    _structuredLLM = createLLM(DEFAULT_LLM_CONFIGS.structured);
  }
  return _structuredLLM;
}

/**
 * Get the fast LLM instance
 */
export function getFastLLM(): ChatOpenAI {
  if (!_fastLLM) {
    _fastLLM = createLLM(DEFAULT_LLM_CONFIGS.fast);
  }
  return _fastLLM;
}

/**
 * Get structured LLM bound to a specific schema
 */
export function getStructuredLLMWithSchema<T extends z.ZodType>(schema: T) {
  return getStructuredOutputLLM().withStructuredOutput(schema);
}

/**
 * Alias for createStructuredLLM for backward compatibility
 */
export function getStructuredLLM<T extends z.ZodType>(
  schema: T,
  config: LLMConfig = DEFAULT_LLM_CONFIGS.structured
) {
  return createStructuredLLM(schema, config);
}

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Intent classification schema
 */
export const IntentSchema = z.object({
  intent: z.string().describe('The detected user intent'),
  confidence: z.number().min(0).max(1).describe('Confidence score'),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
  })).optional().describe('Extracted entities'),
});

/**
 * Sentiment analysis schema
 */
export const SentimentSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  score: z.number().min(-1).max(1),
  aspects: z.array(z.object({
    aspect: z.string(),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
  })).optional(),
});

/**
 * Decision routing schema
 */
export const RoutingDecisionSchema = z.object({
  decision: z.string().describe('The routing decision'),
  reason: z.string().describe('Reason for the decision'),
  confidence: z.number().min(0).max(1),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Intent = z.infer<typeof IntentSchema>;
export type Sentiment = z.infer<typeof SentimentSchema>;
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;
