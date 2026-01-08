import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = NODE_ENV === 'production' ? '.env.production' : '.env.development';

// Load base .env first, then environment-specific (overrides)
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });
dotenvConfig({ path: path.resolve(process.cwd(), envFile), override: true });

/**
 * Environment Configuration Schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Server
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // LiveKit
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY is required'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET is required'),
  LIVEKIT_URL: z.string().regex(/^wss?:\/\//, 'LIVEKIT_URL must start with ws:// or wss://'),

  // LLM Provider
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // STT Provider
  DEEPGRAM_API_KEY: z.string().min(1, 'DEEPGRAM_API_KEY is required'),

  // TTS Providers
  CARTESIA_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  TTS_PROVIDER: z.enum(['cartesia', 'elevenlabs']).default('cartesia'),

  // Database (PostgreSQL)
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().default('5432'),
  POSTGRES_USER: z.string().default('admin'),
  POSTGRES_PASSWORD: z.string().default('admin123'),
  POSTGRES_DB: z.string().default('interview_db'),
  DATABASE_URL: z.string().optional(),

  // Vector DB (Milvus)
  MILVUS_HOST: z.string().default('localhost'),
  MILVUS_PORT: z.string().default('19530'),
  MILVUS_TOKEN: z.string().optional(), // Required for Zilliz Cloud in production

  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Proctoring
  PROCTORING_SERVICE_URL: z.string().default('http://localhost:8081'),
});

/**
 * Validated environment configuration
 */
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });

    // In development, warn but don't crash
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Running in development mode with missing env vars');
      return envSchema.parse({
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'missing',
        DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || 'missing',
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || 'devkey',
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || 'secret',
        LIVEKIT_URL: process.env.LIVEKIT_URL || 'ws://localhost:7880',
      });
    }

    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();

/**
 * Configuration object with typed access
 */
export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
  },

  livekit: {
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    url: env.LIVEKIT_URL,
  },

  llm: {
    openaiApiKey: env.OPENAI_API_KEY,
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1000,
  },

  stt: {
    provider: 'deepgram' as const,
    deepgramApiKey: env.DEEPGRAM_API_KEY,
    model: 'nova-2',
    language: 'en',
    // Diarization settings - identifies different speakers
    diarize: true,
    utterances: true,
    // Longer utterance end detection to prevent cutting off (1.5 seconds)
    utteranceEndMs: 1500,
  },

  // VAD (Voice Activity Detection) settings for AGGRESSIVE noise filtering
  // These settings ensure only clear, sustained speech triggers the agent
  // Background noise and brief sounds will be ignored
  vad: {
    // Activation threshold: 0.5 default, 0.8 = very strict, only clear speech
    // Higher value = requires louder/clearer speech to trigger
    activationThreshold: 0.8,

    // Minimum speech duration: requires 500ms of continuous speech
    // Filters out brief noises, coughs, background voices
    minSpeechDurationMs: 500,

    // Minimum silence to end speech: needs 1.2 seconds of silence
    // Prevents pausing during natural speech pauses
    minSilenceDurationMs: 1200,

    // Padding for smoother transitions
    paddingStartMs: 200,
    paddingEndMs: 300,
  },

  tts: {
    provider: env.TTS_PROVIDER,
    cartesia: {
      apiKey: env.CARTESIA_API_KEY,
      model: 'sonic-3',
      voice: '6303e5fb-a0a7-48f9-bb1a-dd42c216dc5d',
    },
    elevenlabs: {
      apiKey: env.ELEVENLABS_API_KEY,
      voice: 'JBFqnCBsd6RMkjVDRZzb', // George voice
    },
  },

  database: {
    host: env.POSTGRES_HOST,
    port: parseInt(env.POSTGRES_PORT, 10),
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    url: env.DATABASE_URL || `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
  },

  vectorDb: {
    host: env.MILVUS_HOST,
    port: parseInt(env.MILVUS_PORT, 10),
    token: env.MILVUS_TOKEN, // Required for Zilliz Cloud
    address: `${env.MILVUS_HOST}:${env.MILVUS_PORT}`,
  },

  frontend: {
    url: env.FRONTEND_URL,
  },

  proctoring: {
    serviceUrl: env.PROCTORING_SERVICE_URL,
  },
} as const;

export type Config = typeof config;
