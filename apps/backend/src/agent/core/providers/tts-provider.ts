/**
 * TTS Provider - ElevenLabs
 */

import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import { getElevenLabsApiKey } from "../../../config/elevenlabs.js";

export interface TTSConfig {
    model: string;
    voiceId: string;
    language: string;
}

/**
 * Create ElevenLabs TTS instance
 */
export function createTTS(config: TTSConfig): elevenlabs.TTS {
    return new elevenlabs.TTS({
        apiKey: getElevenLabsApiKey(),
        model: config.model || "eleven_flash_v2_5",
        voiceId: config.voiceId,
        language: config.language,
    });
}
