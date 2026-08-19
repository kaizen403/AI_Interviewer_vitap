/**
 * Fireworks AI (OpenAI-compatible) client settings
 * Docs: https://docs.fireworks.ai/tools-sdks/openai-compatibility
 */

export const FIREWORKS_BASE_URL =
  process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1';

export const FIREWORKS_CHAT_MODEL =
  process.env.LLM_MODEL || 'accounts/fireworks/models/llama-v3p3-70b-instruct';

export const FIREWORKS_FAST_MODEL =
  process.env.LLM_FAST_MODEL || 'accounts/fireworks/models/llama-v3p1-8b-instruct';

export const FIREWORKS_EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || 'fireworks/qwen3-embedding-8b';

export function getFireworksApiKey(): string {
  return process.env.FIREWORKS_API_KEY || process.env.OPENAI_API_KEY || '';
}

export function fireworksLangChainOptions() {
  return {
    apiKey: getFireworksApiKey(),
    configuration: {
      baseURL: FIREWORKS_BASE_URL,
    },
  };
}
