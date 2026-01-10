/**
 * Data Message Handler - Handle incoming data messages from room
 */

import type { JobContext } from "@livekit/agents";
import type { AgentLogger } from "../utils/index.js";

export type DataMessageHandler = (
    message: { type: string; data?: any },
    participant: any
) => void;

/**
 * Set up listener for data messages from the room
 */
export function setupDataMessageListener(
    ctx: JobContext,
    logger: AgentLogger,
    onDataMessage: DataMessageHandler
): void {
    ctx.room.on(
        "dataReceived",
        (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
            try {
                const message = JSON.parse(new TextDecoder().decode(payload));
                logger.debug("📩 Data message received", {
                    topic,
                    type: message.type,
                });
                onDataMessage(message, participant);
            } catch (err) {
                logger.error("Failed to parse data message:", err);
            }
        }
    );
    logger.info("📡 Data message listener set up");
}
