/**
 * Core Agent Types
 * Shared type definitions for all voice agents
 */

import type { JobContext, JobProcess, voice } from '@livekit/agents';

// ============================================================================
// Agent Configuration Types
// ============================================================================

/**
 * Base configuration for all voice agents
 */
export interface BaseAgentConfig {
  /** Unique agent name for identification */
  name: string;

  /** Agent description */
  description?: string;

  /** Voice configuration */
  voice: VoiceConfig;

  /** LLM configuration */
  llm: LLMConfig;

  /** STT (Speech-to-Text) configuration */
  stt: STTConfig;

  /** TTS (Text-to-Speech) configuration */
  tts: TTSConfig;

  /** Turn detection configuration */
  turnDetection?: TurnDetectionConfig;

  /** VAD (Voice Activity Detection) configuration */
  vad?: VADConfig;
}

/**
 * Voice configuration
 */
export interface VoiceConfig {
  /** Voice ID for TTS provider */
  voiceId: string;

  /** Voice language */
  language: string;

  /** Voice speed multiplier */
  speed?: number;
}

/**
 * LLM configuration
 */
export interface LLMConfig {
  /** Model name (e.g., 'gpt-4o', 'gpt-4o-mini') */
  model: string;

  /** Temperature for response generation */
  temperature: number;

  /** Maximum tokens for response */
  maxTokens?: number;
}

/**
 * STT configuration
 */
export interface STTConfig {
  /** Provider ('deepgram', 'whisper', etc.) */
  provider: 'deepgram' | 'whisper' | 'azure';

  /** Model name */
  model: string;

  /** Language code */
  language: string;

  /** Enable punctuation */
  punctuate?: boolean;

  /** Enable smart formatting */
  smartFormat?: boolean;

  /** Enable speaker diarization - identifies different speakers */
  diarize?: boolean;

  /** Return utterance-level results with speaker labels */
  utterances?: boolean;

  /** Milliseconds of silence to detect end of utterance (default: 1000) */
  utteranceEndMs?: number;

  /** Enable noise reduction/cancellation */
  noiseReduction?: boolean;
}

/**
 * VAD (Voice Activity Detection) configuration
 */
export interface VADConfig {
  /** Activation threshold (0.0-1.0) - higher = less sensitive to background noise */
  activationThreshold?: number;

  /** Minimum speech duration in ms before triggering */
  minSpeechDurationMs?: number;

  /** Minimum silence duration in ms to end speech segment */
  minSilenceDurationMs?: number;

  /** Padding added to start of speech in ms */
  paddingStartMs?: number;

  /** Padding added to end of speech in ms */
  paddingEndMs?: number;
}

/**
 * TTS configuration
 */
export interface TTSConfig {
  /** Provider ('cartesia', 'elevenlabs', 'azure') */
  provider: 'cartesia' | 'elevenlabs' | 'azure';

  /** Model name */
  model: string;

  /** Voice ID */
  voiceId: string;

  /** Language code */
  language: string;
}

/**
 * Turn detection configuration
 */
export interface TurnDetectionConfig {
  /** Detection type */
  type: 'eou' | 'vad';

  /** Language for turn detection */
  language: string;

  /** Custom threshold values */
  thresholds?: {
    silenceThreshold?: number;
    endOfUtteranceThreshold?: number;
  };
}

// ============================================================================
// Agent State Types
// ============================================================================

/**
 * Base state interface that all agent states must extend
 * Note: States can use different field names as long as they have equivalent data
 */
export interface BaseAgentState {
  /** Conversation transcript */
  transcript: TranscriptEntry[];

  /** Last AI message */
  lastAiMessage: string;

  /** Last error (if any) */
  lastError: string | null;

  /** Error count */
  errorCount: number;
}

/**
 * Transcript entry
 */
export interface TranscriptEntry {
  role: 'ai' | 'user' | 'candidate' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Agent Event Types
// ============================================================================

/**
 * Base event types for agent lifecycle
 */
export enum AgentEventType {
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  STATE_UPDATED = 'state_updated',
  ERROR_OCCURRED = 'error_occurred',
  PHASE_CHANGED = 'phase_changed',
}

/**
 * Agent event
 */
export interface AgentEvent<T = unknown> {
  type: AgentEventType;
  timestamp: Date;
  sessionId: string;
  data?: T;
}

/**
 * Event handler function
 */
export type AgentEventHandler<T = unknown> = (event: AgentEvent<T>) => void | Promise<void>;

// ============================================================================
// Graph Integration Types
// ============================================================================

/**
 * Graph execution result
 */
export interface GraphExecutionResult<TState> {
  success: boolean;
  state: TState;
  error?: Error;
  events: AgentEvent[];
}

/**
 * Graph node result
 */
export interface GraphNodeResult<TState> {
  stateUpdate: Partial<TState>;
  aiMessage?: string;
  shouldSpeak?: boolean;
  nextNode?: string;
}

// ============================================================================
// Agent Factory Types
// ============================================================================

/**
 * Agent type identifier
 */
export type AgentType = 'interview' | 'project-review' | 'support' | 'sales' | 'training' | 'custom';

/**
 * Agent registration info
 */
export interface AgentRegistration {
  type: AgentType;
  name: string;
  description: string;
  configSchema?: Record<string, unknown>;
}

/**
 * Agent metadata extracted from room
 */
export interface AgentMetadata {
  agentType: AgentType;
  sessionId: string;
  roomName?: string;
  userId?: string;
  candidate?: {
    id?: string;
    name?: string;
    email?: string;
  };
  projectTitle?: string;
  projectDescription?: string;
  githubUrl?: string;
  /** PPT file URL (if already uploaded) */
  pptUrl?: string;
  /** PPT extracted text content (if already processed) */
  pptContent?: string;
  customData?: Record<string, unknown>;
}
