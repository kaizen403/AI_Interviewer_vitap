/**
 * Metadata Parser - Parse room metadata
 */

import type { AgentMetadata } from "../types.js";

/**
 * Parse room metadata string into structured AgentMetadata
 */
export function parseMetadata(metadataStr: string): AgentMetadata {
    try {
        const parsed = JSON.parse(metadataStr);
        return {
            agentType: parsed.agentType || "custom",
            sessionId: parsed.sessionId || `session_${Date.now()}`,
            userId: parsed.userId || parsed.studentId,
            roomName: parsed.roomName,
            // Extract PPT-related fields at top level
            pptUrl: parsed.pptUrl,
            pptContent:
                typeof parsed.pptContent === "string" &&
                    parsed.pptContent !== "[object Object]"
                    ? parsed.pptContent
                    : undefined,
            // Project info
            projectTitle: parsed.projectTitle,
            projectDescription: parsed.projectDescription,
            githubUrl: parsed.githubUrl,
            // Candidate/student info
            candidate: parsed.studentName
                ? {
                    id: parsed.studentId,
                    name: parsed.studentName,
                    email: parsed.studentEmail,
                }
                : parsed.candidate,
            // Keep all data in customData for backwards compatibility
            customData: parsed,
        };
    } catch {
        return {
            agentType: "custom",
            sessionId: `session_${Date.now()}`,
        };
    }
}
