/**
 * VAD Provider - Silero Voice Activity Detection
 */

import * as silero from "@livekit/agents-plugin-silero";
import type { JobProcess } from "@livekit/agents";
import type { AgentLogger } from "../utils/index.js";

type LoadedVAD = Awaited<ReturnType<typeof silero.VAD.load>>;

export interface VADConfig {
    activationThreshold?: number;
    minSpeechDurationMs?: number;
    minSilenceDurationMs?: number;
    paddingStartMs?: number;
    paddingEndMs?: number;
}

/**
 * Create VAD with noise-resistant settings
 * Uses higher thresholds to ignore background voices and noise
 */
export async function createVAD(
    proc: JobProcess,
    vadConfig: VADConfig | undefined,
    logger: AgentLogger
): Promise<LoadedVAD> {
    // Use preloaded VAD if available (from prewarm)
    if (proc.userData.vad) {
        logger.info("Using preloaded VAD from prewarm");
        return proc.userData.vad as LoadedVAD;
    }

    // Create new VAD with custom settings for noise resistance
    const vadOptions: any = {};

    if (vadConfig?.activationThreshold) {
        vadOptions.activationThreshold = vadConfig.activationThreshold;
    }
    if (vadConfig?.minSpeechDurationMs) {
        vadOptions.minSpeechDurationMs = vadConfig.minSpeechDurationMs;
    }
    if (vadConfig?.minSilenceDurationMs) {
        vadOptions.minSilenceDurationMs = vadConfig.minSilenceDurationMs;
    }
    if (vadConfig?.paddingStartMs) {
        vadOptions.paddingStartMs = vadConfig.paddingStartMs;
    }
    if (vadConfig?.paddingEndMs) {
        vadOptions.paddingEndMs = vadConfig.paddingEndMs;
    }

    logger.debug("VAD configuration", vadOptions);

    return await silero.VAD.load(vadOptions);
}

/**
 * Preload VAD for faster startup
 */
export async function preloadVAD(vadConfig?: VADConfig): Promise<LoadedVAD> {
    const options: any = {};

    if (vadConfig?.activationThreshold) {
        options.activationThreshold = vadConfig.activationThreshold;
    }
    if (vadConfig?.minSpeechDurationMs) {
        options.minSpeechDurationMs = vadConfig.minSpeechDurationMs;
    }
    if (vadConfig?.minSilenceDurationMs) {
        options.minSilenceDurationMs = vadConfig.minSilenceDurationMs;
    }

    return await silero.VAD.load(options);
}
