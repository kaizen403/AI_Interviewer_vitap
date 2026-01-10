/**
 * Voice LLM Provider - OpenAI
 */

import * as openai from "@livekit/agents-plugin-openai";

export interface VoiceLLMConfig {
    model: string;
    temperature: number;
}

/**
 * Create LLM instance for voice pipeline
 */
export function createVoiceLLM(config: VoiceLLMConfig): openai.LLM {
    return new openai.LLM({
        model: config.model,
        temperature: config.temperature,
    });
}
