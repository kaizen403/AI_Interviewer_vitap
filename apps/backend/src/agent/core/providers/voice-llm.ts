/**
 * Voice LLM Provider - Fireworks (OpenAI-compatible)
 */

import * as openai from "@livekit/agents-plugin-openai";
import { FIREWORKS_CHAT_MODEL, getFireworksApiKey } from "../../../config/fireworks.js";

export interface VoiceLLMConfig {
    model: string;
    temperature: number;
}

/**
 * Create LLM instance for voice pipeline
 */
export function createVoiceLLM(config: VoiceLLMConfig): openai.LLM {
    return openai.LLM.withFireworks({
        model: config.model || FIREWORKS_CHAT_MODEL,
        temperature: config.temperature,
        apiKey: getFireworksApiKey(),
    });
}
