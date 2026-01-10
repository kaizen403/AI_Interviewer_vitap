/**
 * STT Provider - Deepgram Speech-to-Text
 */

import * as deepgram from "@livekit/agents-plugin-deepgram";
import type { BaseAgentConfig } from "../types.js";
import type { AgentLogger } from "../utils/index.js";

export interface STTConfig {
    model: string;
    language: string;
    punctuate?: boolean;
    smartFormat?: boolean;
}

/**
 * Create STT instance based on config
 * Using Deepgram nova-2 with optimized settings for low latency
 */
export function createSTT(config: STTConfig, logger: AgentLogger): deepgram.STT {
    const sttOptions: any = {
        model: config.model as any,
        language: config.language,
        punctuate: config.punctuate ?? true,
        smartFormat: config.smartFormat ?? true,
        endpointing: 300,
        interimResults: true,
    };

    logger.info("🎙️ Using Deepgram STT (nova-2) with optimized settings");
    logger.debug("STT configuration", sttOptions);

    return new deepgram.STT(sttOptions);
}
