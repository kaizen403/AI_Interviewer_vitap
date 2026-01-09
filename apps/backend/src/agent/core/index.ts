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
    voiceId: process.env.TTS_VOICE_ID || '6303e5fb-a0a7-48f9-bb1a-dd42c216dc5d',
    language: process.env.TTS_LANGUAGE || 'en',
    speed: 1.0,
  },
  llm: {
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1024', 10),
  },
  stt: {
    provider: (process.env.STT_PROVIDER || 'deepgram') as 'deepgram' | 'whisper' | 'azure',
    model: process.env.STT_MODEL || 'nova-2',
    language: process.env.STT_LANGUAGE || 'en-US',
    punctuate: true,
    smartFormat: true,
  },
  tts: {
    provider: (process.env.TTS_PROVIDER || 'cartesia') as 'cartesia' | 'elevenlabs' | 'azure',
    // sonic-3 has 90ms latency but most natural voice quality
    model: process.env.TTS_MODEL || 'sonic-3',
    voiceId: process.env.TTS_VOICE_ID || '6303e5fb-a0a7-48f9-bb1a-dd42c216dc5d',
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
