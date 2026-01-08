/**
 * Project Review LLM Configuration
 * LLM instances and structured output helpers
 */

import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { getStructuredLLM as coreGetStructuredLLM } from '../../core/llm.js';

// ============================================================================
// LLM Instances
// ============================================================================

/**
 * Default LLM for project review tasks
 * Uses GPT-4o for high-quality analysis
 */
export const reviewLLM = new ChatOpenAI({
  modelName: process.env.OPENAI_MODEL || 'gpt-4o',
  temperature: 0.3, // Lower temperature for consistent evaluation
});

/**
 * Fast LLM for simple tasks like feedback generation
 */
export const fastLLM = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.5,
});

// ============================================================================
// Structured Output Helpers
// ============================================================================

/**
 * Get LLM with structured output for type-safe responses
 */
export function getStructuredLLM<T extends z.ZodType>(schema: T) {
  return coreGetStructuredLLM(schema);
}

/**
 * Get base LLM instance
 */
export function getLLM() {
  return reviewLLM;
}

// ============================================================================
// Schemas
// ============================================================================

export const AIDetectionSchema = z.object({
  result: z.enum(['likely_ai', 'possibly_ai', 'likely_human', 'uncertain']),
  confidence: z.number().min(0).max(100),
  indicators: z.array(z.string()),
  explanation: z.string(),
});

export const OverallAIDetectionSchema = z.object({
  overallResult: z.enum(['likely_ai', 'possibly_ai', 'likely_human', 'uncertain']),
  overallConfidence: z.number().min(0).max(100),
  summary: z.string(),
});

export const QuestionGenerationSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    context: z.string(),
    expectedPoints: z.array(z.string()),
    slideReference: z.number(),
  })),
});

export const AnswerEvaluationSchema = z.object({
  score: z.number().min(1).max(10),
  feedback: z.string(),
  demonstratesUnderstanding: z.boolean(),
  flaggedConcerns: z.array(z.string()),
});

export const ReportGenerationSchema = z.object({
  overallAssessment: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  recommendation: z.enum(['proceed', 'review', 'reject']),
  nextSteps: z.array(z.string()),
});

export type AIDetection = z.infer<typeof AIDetectionSchema>;
export type OverallAIDetection = z.infer<typeof OverallAIDetectionSchema>;
export type QuestionGeneration = z.infer<typeof QuestionGenerationSchema>;
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;
export type ReportGeneration = z.infer<typeof ReportGenerationSchema>;
