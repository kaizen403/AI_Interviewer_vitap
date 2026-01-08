/**
 * Diarization Service
 * Tracks and manages speaker identification in voice conversations
 * 
 * This service:
 * - Maps Deepgram speaker IDs to logical roles (agent/candidate)
 * - Tracks speaker segments with timestamps
 * - Provides speaking time analytics
 * - Filters out background speakers
 */

// ============================================================================
// Types
// ============================================================================

export type SpeakerRole = 'agent' | 'candidate' | 'background' | 'unknown';

export interface SpeakerSegment {
    /** Logical speaker role */
    speaker: SpeakerRole;

    /** Raw speaker ID from Deepgram (0, 1, 2...) */
    speakerId: number;

    /** Transcribed text */
    text: string;

    /** Start time in seconds */
    startTime: number;

    /** End time in seconds */
    endTime: number;

    /** Confidence score (0-1) */
    confidence: number;

    /** Whether this segment should be ignored (background noise/voice) */
    isBackground: boolean;
}

export interface DiarizedTranscript {
    /** All speaker segments in order */
    segments: SpeakerSegment[];

    /** Total duration in seconds */
    totalDuration: number;

    /** Speaking statistics per role */
    speakerStats: {
        agent: SpeakerStats;
        candidate: SpeakerStats;
        background: SpeakerStats;
    };

    /** Number of speaker transitions */
    turnCount: number;
}

export interface SpeakerStats {
    /** Total speaking time in seconds */
    speakingTime: number;

    /** Total word count */
    wordCount: number;

    /** Number of utterances */
    utteranceCount: number;

    /** Average utterance length in seconds */
    avgUtteranceLength: number;
}

export interface DeepgramUtterance {
    /** Speaker ID assigned by Deepgram */
    speaker: number;

    /** Transcribed text */
    transcript: string;

    /** Start time in seconds */
    start: number;

    /** End time in seconds */
    end: number;

    /** Confidence score */
    confidence: number;
}

// ============================================================================
// Diarization Service
// ============================================================================

export class DiarizationService {
    private segments: SpeakerSegment[] = [];
    private speakerMapping: Map<number, SpeakerRole> = new Map();
    private primarySpeakerId: number | null = null;
    private agentSpeakerId: number | null = null;

    /**
     * Confidence threshold below which we consider it background noise
     */
    private confidenceThreshold: number = 0.6;

    /**
     * Minimum duration (seconds) for a valid utterance
     * Shorter segments are likely background noise
     */
    private minUtteranceDuration: number = 0.3;

    constructor(options?: {
        confidenceThreshold?: number;
        minUtteranceDuration?: number;
    }) {
        if (options?.confidenceThreshold) {
            this.confidenceThreshold = options.confidenceThreshold;
        }
        if (options?.minUtteranceDuration) {
            this.minUtteranceDuration = options.minUtteranceDuration;
        }
    }

    /**
     * Map a Deepgram speaker ID to a logical role
     */
    mapSpeaker(speakerId: number, role: SpeakerRole): void {
        this.speakerMapping.set(speakerId, role);

        if (role === 'candidate') {
            this.primarySpeakerId = speakerId;
        } else if (role === 'agent') {
            this.agentSpeakerId = speakerId;
        }

        console.log(`[Diarization] Mapped speaker ${speakerId} -> ${role}`);
    }

    /**
     * Auto-detect speaker roles based on context
     * Call this when the agent is speaking to identify the agent's speaker ID
     */
    setAgentSpeaking(speakerId: number): void {
        this.mapSpeaker(speakerId, 'agent');
        this.agentSpeakerId = speakerId;
    }

    /**
     * Set the primary (candidate) speaker
     * All other speakers (except agent) will be treated as background
     */
    setPrimarySpeaker(speakerId: number): void {
        this.mapSpeaker(speakerId, 'candidate');
        this.primarySpeakerId = speakerId;
    }

    /**
     * Check if a segment should be considered background noise/voice
     */
    private isBackgroundSegment(utterance: DeepgramUtterance): boolean {
        // Low confidence = likely background noise
        if (utterance.confidence < this.confidenceThreshold) {
            return true;
        }

        // Very short utterance = likely not intentional speech
        const duration = utterance.end - utterance.start;
        if (duration < this.minUtteranceDuration) {
            return true;
        }

        // If we know the speakers, check if it's neither agent nor candidate
        if (this.primarySpeakerId !== null && this.agentSpeakerId !== null) {
            if (utterance.speaker !== this.primarySpeakerId &&
                utterance.speaker !== this.agentSpeakerId) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the role for a speaker ID
     */
    private getSpeakerRole(speakerId: number, isBackground: boolean): SpeakerRole {
        if (isBackground) {
            return 'background';
        }

        // Check if we have an explicit mapping
        const mapped = this.speakerMapping.get(speakerId);
        if (mapped) {
            return mapped;
        }

        // Auto-assign based on order:
        // - First non-agent speaker is likely the candidate
        if (this.agentSpeakerId !== null && speakerId !== this.agentSpeakerId) {
            if (this.primarySpeakerId === null) {
                this.setPrimarySpeaker(speakerId);
                return 'candidate';
            }
        }

        return 'unknown';
    }

    /**
     * Add a segment from Deepgram utterance
     */
    addSegment(utterance: DeepgramUtterance): SpeakerSegment {
        const isBackground = this.isBackgroundSegment(utterance);
        const role = this.getSpeakerRole(utterance.speaker, isBackground);

        const segment: SpeakerSegment = {
            speaker: role,
            speakerId: utterance.speaker,
            text: utterance.transcript,
            startTime: utterance.start,
            endTime: utterance.end,
            confidence: utterance.confidence,
            isBackground,
        };

        this.segments.push(segment);

        if (!isBackground) {
            console.log(`[Diarization] ${role}: "${utterance.transcript.substring(0, 50)}..."`);
        } else {
            console.log(`[Diarization] Ignored background: "${utterance.transcript.substring(0, 30)}..."`);
        }

        return segment;
    }

    /**
     * Get only the candidate's speech (filtered transcript)
     * Use this to get clean input for answer evaluation
     */
    getCandidateSpeech(): string {
        return this.segments
            .filter(s => s.speaker === 'candidate' && !s.isBackground)
            .map(s => s.text)
            .join(' ');
    }

    /**
     * Check if the last utterance was from the candidate
     * Useful for determining if we should process input
     */
    isLastSpeakerCandidate(): boolean {
        const lastNonBackground = [...this.segments]
            .reverse()
            .find(s => !s.isBackground);

        return lastNonBackground?.speaker === 'candidate';
    }

    /**
     * Get the full diarized transcript with analytics
     */
    getTranscript(): DiarizedTranscript {
        const agentSegments = this.segments.filter(s => s.speaker === 'agent');
        const candidateSegments = this.segments.filter(s => s.speaker === 'candidate');
        const backgroundSegments = this.segments.filter(s => s.isBackground);

        const calculateStats = (segments: SpeakerSegment[]): SpeakerStats => {
            const speakingTime = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
            const wordCount = segments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);
            const utteranceCount = segments.length;

            return {
                speakingTime,
                wordCount,
                utteranceCount,
                avgUtteranceLength: utteranceCount > 0 ? speakingTime / utteranceCount : 0,
            };
        };

        // Calculate turn count (speaker changes)
        let turnCount = 0;
        let lastSpeaker: SpeakerRole | null = null;
        for (const segment of this.segments.filter(s => !s.isBackground)) {
            if (lastSpeaker && segment.speaker !== lastSpeaker) {
                turnCount++;
            }
            lastSpeaker = segment.speaker;
        }

        // Total duration
        const totalDuration = this.segments.length > 0
            ? Math.max(...this.segments.map(s => s.endTime))
            : 0;

        return {
            segments: this.segments,
            totalDuration,
            speakerStats: {
                agent: calculateStats(agentSegments),
                candidate: calculateStats(candidateSegments),
                background: calculateStats(backgroundSegments),
            },
            turnCount,
        };
    }

    /**
     * Clear all segments (for new session)
     */
    reset(): void {
        this.segments = [];
        this.speakerMapping.clear();
        this.primarySpeakerId = null;
        this.agentSpeakerId = null;
    }

    /**
     * Get current segment count
     */
    getSegmentCount(): number {
        return this.segments.length;
    }

    /**
     * Get count of filtered (ignored) background segments
     */
    getFilteredCount(): number {
        return this.segments.filter(s => s.isBackground).length;
    }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new diarization service with default settings
 * optimized for interview/review sessions
 */
export function createDiarizationService(options?: {
    confidenceThreshold?: number;
    minUtteranceDuration?: number;
}): DiarizationService {
    return new DiarizationService({
        confidenceThreshold: options?.confidenceThreshold ?? 0.65,
        minUtteranceDuration: options?.minUtteranceDuration ?? 0.3,
    });
}

export default DiarizationService;
