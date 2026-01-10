/**
 * TTS Provider - Cartesia Text-to-Speech
 */

import * as cartesia from "@livekit/agents-plugin-cartesia";

export interface TTSConfig {
    model: string;
    voiceId: string;
    language: string;
}

/**
 * Create TTS instance based on config
 */
export function createTTS(config: TTSConfig): cartesia.TTS {
    return new cartesia.TTS({
        model: config.model,
        voice: config.voiceId,
        language: config.language,
    });
}
