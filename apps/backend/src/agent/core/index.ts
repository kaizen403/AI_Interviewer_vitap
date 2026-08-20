/**
 * Core Agent Module
 * Shared infrastructure for all voice agents
 */

// Types
export * from './types.js';

// LLM utilities
export * from './llm.js';

// Core utilities (retry, logging, config, checkpointing, typed routes)
export * from './utils/index.js';

// Providers (STT, TTS, VAD, turn detection)
export * from './providers/index.js';

// Base utilities (event handlers, data messages, metadata parsing)
export * from './base/index.js';

// Voice agent base class
export { BaseVoiceAgent } from './voice-agent.js';

// Agent factory
export {
  registerAgent,
  createAgent,
  getAgentInfo,
  listRegisteredAgents,
  isAgentRegistered,
  runAgent,
  createAgentRouter,
  AgentFactory,
  type AgentRunnerConfig,
} from './agent-factory.js';

// ============================================================================
// Register All Agents
// ============================================================================

import { registerAgent } from './agent-factory.js';
import { ProjectReviewAgent, type ProjectReviewAgentConfig } from '../project-review/index.js';

// Voice pipeline configuration from environment variables
const DEFAULT_VOICE_PIPELINE_CONFIG = {
  name: 'Voice Agent',
  voice: {
    voiceId: process.env.TTS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
    language: process.env.TTS_LANGUAGE || 'en',
    speed: 1.0,
  },
  llm: {
    model: process.env.LLM_MODEL || 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1024', 10),
  },
  stt: {
    provider: 'elevenlabs' as const,
    model: process.env.STT_MODEL || 'scribe_v2_realtime',
    language: process.env.STT_LANGUAGE || 'en',
    punctuate: true,
    smartFormat: true,
  },
  tts: {
    provider: 'elevenlabs' as const,
    model: process.env.TTS_MODEL || 'eleven_flash_v2_5',
    voiceId: process.env.TTS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
    language: process.env.TTS_LANGUAGE || 'en',
  },
  // VAD settings for low latency
  vad: {
    activationThreshold: 0.65,
    minSpeechDurationMs: 250,
    minSilenceDurationMs: 600,
    paddingStartMs: 100,
    paddingEndMs: 150,
  },
};

// Register Project Review Agent
registerAgent(
  {
    type: 'project-review',
    name: 'Project Review Agent',
    description: 'Reviews project presentations, detects AI content, and assesses understanding',
  },
  (config?: Record<string, unknown>) => new ProjectReviewAgent({
    ...DEFAULT_VOICE_PIPELINE_CONFIG,
    name: 'Project Review Agent',
    reviewId: (config?.reviewId as string) || '',
    candidateId: (config?.candidateId as string) || '',
    projectTitle: (config?.projectTitle as string) || 'Project',
    maxDurationMinutes: (config?.maxDurationMinutes as number) || 30,
  } as ProjectReviewAgentConfig)
);

console.log('[Core] Registered agents: project-review');
