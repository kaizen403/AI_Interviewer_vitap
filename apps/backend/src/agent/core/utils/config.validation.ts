/**
 * Configuration Validation
 * Runtime validation for agent configurations using Zod
 */

import { z } from 'zod';

// ============================================================================
// Base Configuration Schemas
// ============================================================================

/**
 * Voice configuration schema
 */
export const VoiceConfigSchema = z.object({
  voiceId: z.string().min(1, 'Voice ID is required'),
  language: z.string().default('en'),
  speed: z.number().min(0.5).max(2.0).optional(),
});

/**
 * LLM configuration schema
 */
export const LLMConfigSchema = z.object({
  model: z.string().min(1, 'Model name is required'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().optional(),
});

/**
 * STT configuration schema
 */
export const STTConfigSchema = z.object({
  provider: z.enum(['deepgram', 'whisper', 'azure']).default('deepgram'),
  model: z.string().default('nova-2'),
  language: z.string().default('en'),
  punctuate: z.boolean().optional(),
  smartFormat: z.boolean().optional(),
});

/**
 * TTS configuration schema
 */
export const TTSConfigSchema = z.object({
  provider: z.enum(['cartesia', 'elevenlabs', 'azure']).default('cartesia'),
  model: z.string().default('sonic'),
  voiceId: z.string().min(1, 'Voice ID is required'),
  language: z.string().default('en'),
});

/**
 * Turn detection configuration schema
 */
export const TurnDetectionConfigSchema = z.object({
  type: z.enum(['silero', 'server_vad']).default('silero'),
  threshold: z.number().min(0).max(1).optional(),
  paddingMs: z.number().positive().optional(),
  silenceDurationMs: z.number().positive().optional(),
  language: z.string().default('en'),
}).optional();

/**
 * Base agent configuration schema
 */
export const BaseAgentConfigSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  description: z.string().optional(),
  voice: VoiceConfigSchema,
  llm: LLMConfigSchema,
  stt: STTConfigSchema,
  tts: TTSConfigSchema,
  turnDetection: TurnDetectionConfigSchema,
});

// ============================================================================
// Interview Agent Configuration Schema
// ============================================================================

export const InterviewAgentConfigSchema = BaseAgentConfigSchema.extend({
  interviewId: z.string().min(1, 'Interview ID is required'),
  candidateId: z.string().min(1, 'Candidate ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
  companyId: z.string().min(1, 'Company ID is required'),
  maxDurationMinutes: z.number().positive().default(40),
  enableProctoring: z.boolean().default(true),
});

// ============================================================================
// Project Review Agent Configuration Schema
// ============================================================================

export const ProjectReviewAgentConfigSchema = BaseAgentConfigSchema.extend({
  reviewId: z.string().min(1, 'Review ID is required'),
  candidateId: z.string().min(1, 'Candidate ID is required'),
  projectTitle: z.string().min(1, 'Project title is required'),
  maxDurationMinutes: z.number().positive().default(30),
});

// ============================================================================
// Environment Configuration Schema
// ============================================================================

export const EnvironmentConfigSchema = z.object({
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  
  // LiveKit
  LIVEKIT_URL: z.string().url('Invalid LiveKit URL'),
  LIVEKIT_API_KEY: z.string().min(1, 'LiveKit API key is required'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LiveKit API secret is required'),
  
  // Deepgram (optional)
  DEEPGRAM_API_KEY: z.string().optional(),
  
  // Cartesia (optional)
  CARTESIA_API_KEY: z.string().optional(),
  
  // Database
  DATABASE_URL: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

/**
 * Validate configuration against a schema
 */
export function validateConfig<T>(
  schema: z.ZodType<T>,
  config: unknown
): ValidationResult<T> {
  const result = schema.safeParse(config);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Validate and throw on failure
 */
export function validateConfigOrThrow<T>(
  schema: z.ZodType<T>,
  config: unknown,
  configName: string = 'Configuration'
): T {
  const result = validateConfig(schema, config);
  
  if (!result.success) {
    const errors = result.errors?.issues
      .map((e: z.ZodIssue) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`${configName} validation failed:\n${errors}`);
  }
  
  return result.data!;
}

/**
 * Validate interview agent configuration
 */
export function validateInterviewConfig(config: unknown) {
  return validateConfigOrThrow(
    InterviewAgentConfigSchema,
    config,
    'Interview Agent Config'
  );
}

/**
 * Validate project review agent configuration
 */
export function validateProjectReviewConfig(config: unknown) {
  return validateConfigOrThrow(
    ProjectReviewAgentConfigSchema,
    config,
    'Project Review Agent Config'
  );
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): z.infer<typeof EnvironmentConfigSchema> {
  return validateConfigOrThrow(
    EnvironmentConfigSchema,
    process.env,
    'Environment'
  );
}

/**
 * Check if required environment variables are set (non-throwing)
 */
export function checkRequiredEnv(): { valid: boolean; missing: string[] } {
  const required = ['OPENAI_API_KEY', 'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type ValidatedInterviewConfig = z.infer<typeof InterviewAgentConfigSchema>;
export type ValidatedProjectReviewConfig = z.infer<typeof ProjectReviewAgentConfigSchema>;
export type ValidatedEnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
