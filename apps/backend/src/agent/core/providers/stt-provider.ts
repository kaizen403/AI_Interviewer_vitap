/**
 * STT Provider - ElevenLabs Scribe
 */

import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import { getElevenLabsApiKey } from "../../../config/elevenlabs.js";
import type { AgentLogger } from "../utils/index.js";

export interface STTConfig {
    model: string;
    language: string;
    punctuate?: boolean;
    smartFormat?: boolean;
}

/**
 * Create ElevenLabs realtime STT (Scribe)
 */
export function createSTT(config: STTConfig, logger: AgentLogger): elevenlabs.STT {
    logger.info("🎙️ Using ElevenLabs Scribe STT");

    return new elevenlabs.STT({
        apiKey: getElevenLabsApiKey(),
        model: config.model || "scribe_v2_realtime",
        languageCode: config.language?.split("-")[0] || "en",
        serverVad: {
            vadSilenceThresholdSecs: 0.5,
            vadThreshold: 0.5,
            minSpeechDurationMs: 100,
            minSilenceDurationMs: 300,
        },
    });
}
