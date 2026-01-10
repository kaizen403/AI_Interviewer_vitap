/**
 * Turn Detection Provider
 */

import * as livekit from "@livekit/agents-plugin-livekit";

/**
 * Create turn detection based on config
 * Uses LiveKit's MultilingualModel for robust turn detection across languages
 */
export function createTurnDetection(): livekit.turnDetector.MultilingualModel {
    return new livekit.turnDetector.MultilingualModel();
}
