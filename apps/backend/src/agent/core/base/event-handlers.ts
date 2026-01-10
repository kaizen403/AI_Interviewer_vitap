/**
 * Event Handlers - Session event listener setup
 */

import type { JobContext } from "@livekit/agents";
import type { AgentLogger } from "../utils/index.js";

/**
 * Set up event listeners for session debugging
 */
export function setupSessionEventListeners(
    ctx: JobContext,
    agentName: string
): void {
    // Track speaking events
    ctx.room.on(
        "trackSubscribed",
        (track: any, publication: any, participant: any) => {
            console.log(
                `[${agentName}] 🎧 Track subscribed: ${track.kind} from ${participant.identity}`
            );
        }
    );

    ctx.room.on(
        "trackUnsubscribed",
        (track: any, publication: any, participant: any) => {
            console.log(
                `[${agentName}] 🔇 Track unsubscribed: ${track.kind} from ${participant.identity}`
            );
        }
    );

    // Track participant events
    ctx.room.on("participantConnected", (participant: any) => {
        console.log(
            `[${agentName}] 👤 Participant connected: ${participant.identity}`
        );
    });

    ctx.room.on("participantDisconnected", (participant: any) => {
        console.log(
            `[${agentName}] 👋 Participant disconnected: ${participant.identity}`
        );
    });

    // Track active speaker
    ctx.room.on("activeSpeakersChanged", (speakers: any[]) => {
        if (speakers.length > 0) {
            console.log(
                `[${agentName}] 🗣️ Active speakers: ${speakers.map((s: any) => s.identity).join(", ")}`
            );
        }
    });

    console.log(`[${agentName}] 📡 Session event listeners set up`);
}
