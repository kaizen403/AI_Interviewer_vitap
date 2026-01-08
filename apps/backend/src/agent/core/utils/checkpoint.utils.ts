/**
 * Checkpoint Utilities
 * State persistence and recovery for LangGraph agents
 */

import { MemorySaver } from '@langchain/langgraph';

// ============================================================================
// Types
// ============================================================================

export interface CheckpointMetadata {
  /** Unique checkpoint ID */
  id: string;
  /** Timestamp of checkpoint creation */
  createdAt: Date;
  /** Node that created the checkpoint */
  nodeId: string;
  /** Phase at checkpoint time */
  phase: string;
  /** Session ID */
  sessionId: string;
  /** Reason for checkpoint */
  reason: CheckpointReason;
  /** Optional description */
  description?: string;
}

export type CheckpointReason = 
  | 'phase_transition'
  | 'before_question'
  | 'after_evaluation'
  | 'emergency_pause'
  | 'connection_lost'
  | 'periodic'
  | 'manual';

export interface CheckpointConfig {
  /** Enable automatic checkpointing */
  enabled: boolean;
  /** Interval for periodic checkpoints (ms) */
  periodicIntervalMs: number;
  /** Maximum checkpoints to retain */
  maxCheckpoints: number;
  /** Storage backend ('memory' | 'database') */
  storage: 'memory' | 'database';
}

export interface SavedCheckpoint<TState> {
  metadata: CheckpointMetadata;
  state: TState;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = {
  enabled: true,
  periodicIntervalMs: 60000, // 1 minute
  maxCheckpoints: 10,
  storage: 'memory',
};

// ============================================================================
// In-Memory Checkpoint Store
// ============================================================================

class InMemoryCheckpointStore<TState> {
  private checkpoints: Map<string, SavedCheckpoint<TState>[]> = new Map();
  private config: CheckpointConfig;

  constructor(config: Partial<CheckpointConfig> = {}) {
    this.config = { ...DEFAULT_CHECKPOINT_CONFIG, ...config };
  }

  /**
   * Save a checkpoint for a session
   */
  save(sessionId: string, state: TState, metadata: Omit<CheckpointMetadata, 'id' | 'createdAt'>): CheckpointMetadata {
    const fullMetadata: CheckpointMetadata = {
      ...metadata,
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date(),
    };

    const sessionCheckpoints = this.checkpoints.get(sessionId) || [];
    sessionCheckpoints.push({ metadata: fullMetadata, state: structuredClone(state) });

    // Enforce max checkpoints
    while (sessionCheckpoints.length > this.config.maxCheckpoints) {
      sessionCheckpoints.shift();
    }

    this.checkpoints.set(sessionId, sessionCheckpoints);
    console.log(`[Checkpoint] Saved checkpoint ${fullMetadata.id} for session ${sessionId}`);

    return fullMetadata;
  }

  /**
   * Get the latest checkpoint for a session
   */
  getLatest(sessionId: string): SavedCheckpoint<TState> | null {
    const sessionCheckpoints = this.checkpoints.get(sessionId);
    if (!sessionCheckpoints || sessionCheckpoints.length === 0) {
      return null;
    }
    return sessionCheckpoints[sessionCheckpoints.length - 1];
  }

  /**
   * Get a specific checkpoint by ID
   */
  getById(sessionId: string, checkpointId: string): SavedCheckpoint<TState> | null {
    const sessionCheckpoints = this.checkpoints.get(sessionId);
    if (!sessionCheckpoints) return null;
    return sessionCheckpoints.find(cp => cp.metadata.id === checkpointId) || null;
  }

  /**
   * Get all checkpoints for a session
   */
  getAll(sessionId: string): SavedCheckpoint<TState>[] {
    return this.checkpoints.get(sessionId) || [];
  }

  /**
   * List checkpoint metadata for a session
   */
  list(sessionId: string): CheckpointMetadata[] {
    const sessionCheckpoints = this.checkpoints.get(sessionId) || [];
    return sessionCheckpoints.map(cp => cp.metadata);
  }

  /**
   * Clear all checkpoints for a session
   */
  clear(sessionId: string): void {
    this.checkpoints.delete(sessionId);
    console.log(`[Checkpoint] Cleared checkpoints for session ${sessionId}`);
  }

  /**
   * Clear all checkpoints
   */
  clearAll(): void {
    this.checkpoints.clear();
    console.log('[Checkpoint] Cleared all checkpoints');
  }
}

// ============================================================================
// Checkpoint Manager
// ============================================================================

export class CheckpointManager<TState> {
  private store: InMemoryCheckpointStore<TState>;
  private config: CheckpointConfig;
  private periodicTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<CheckpointConfig> = {}) {
    this.config = { ...DEFAULT_CHECKPOINT_CONFIG, ...config };
    this.store = new InMemoryCheckpointStore(this.config);
  }

  /**
   * Create a checkpoint
   */
  checkpoint(
    sessionId: string,
    state: TState,
    nodeId: string,
    phase: string,
    reason: CheckpointReason,
    description?: string
  ): CheckpointMetadata {
    if (!this.config.enabled) {
      return {
        id: 'disabled',
        createdAt: new Date(),
        nodeId,
        phase,
        sessionId,
        reason,
        description,
      };
    }

    return this.store.save(sessionId, state, {
      nodeId,
      phase,
      sessionId,
      reason,
      description,
    });
  }

  /**
   * Restore from the latest checkpoint
   */
  restore(sessionId: string): { state: TState; metadata: CheckpointMetadata } | null {
    const checkpoint = this.store.getLatest(sessionId);
    if (!checkpoint) {
      console.log(`[Checkpoint] No checkpoint found for session ${sessionId}`);
      return null;
    }

    console.log(`[Checkpoint] Restoring from checkpoint ${checkpoint.metadata.id}`);
    return {
      state: structuredClone(checkpoint.state),
      metadata: checkpoint.metadata,
    };
  }

  /**
   * Restore from a specific checkpoint
   */
  restoreFromId(sessionId: string, checkpointId: string): { state: TState; metadata: CheckpointMetadata } | null {
    const checkpoint = this.store.getById(sessionId, checkpointId);
    if (!checkpoint) {
      console.log(`[Checkpoint] Checkpoint ${checkpointId} not found for session ${sessionId}`);
      return null;
    }

    console.log(`[Checkpoint] Restoring from checkpoint ${checkpointId}`);
    return {
      state: structuredClone(checkpoint.state),
      metadata: checkpoint.metadata,
    };
  }

  /**
   * Start periodic checkpointing for a session
   */
  startPeriodic(
    sessionId: string,
    getState: () => TState,
    nodeId: string,
    getPhase: () => string
  ): void {
    if (!this.config.enabled) return;

    // Clear existing timer
    this.stopPeriodic(sessionId);

    const timer = setInterval(() => {
      this.checkpoint(
        sessionId,
        getState(),
        nodeId,
        getPhase(),
        'periodic',
        'Automatic periodic checkpoint'
      );
    }, this.config.periodicIntervalMs);

    this.periodicTimers.set(sessionId, timer);
    console.log(`[Checkpoint] Started periodic checkpointing for session ${sessionId}`);
  }

  /**
   * Stop periodic checkpointing for a session
   */
  stopPeriodic(sessionId: string): void {
    const timer = this.periodicTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.periodicTimers.delete(sessionId);
      console.log(`[Checkpoint] Stopped periodic checkpointing for session ${sessionId}`);
    }
  }

  /**
   * Get checkpoint history for a session
   */
  getHistory(sessionId: string): CheckpointMetadata[] {
    return this.store.list(sessionId);
  }

  /**
   * Clear session checkpoints
   */
  clearSession(sessionId: string): void {
    this.stopPeriodic(sessionId);
    this.store.clear(sessionId);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    for (const sessionId of this.periodicTimers.keys()) {
      this.stopPeriodic(sessionId);
    }
    this.store.clearAll();
  }
}

// ============================================================================
// LangGraph Memory Saver Factory
// ============================================================================

/**
 * Create a LangGraph-compatible memory saver
 * This integrates with LangGraph's built-in checkpointing
 */
export function createMemorySaver(): MemorySaver {
  return new MemorySaver();
}

// ============================================================================
// Singleton Instance
// ============================================================================

let checkpointManagerInstance: CheckpointManager<unknown> | null = null;

/**
 * Get or create the checkpoint manager singleton
 */
export function getCheckpointManager<TState>(
  config?: Partial<CheckpointConfig>
): CheckpointManager<TState> {
  if (!checkpointManagerInstance) {
    checkpointManagerInstance = new CheckpointManager(config);
  }
  return checkpointManagerInstance as CheckpointManager<TState>;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a phase transition checkpoint
 */
export function checkpointPhaseTransition<TState>(
  manager: CheckpointManager<TState>,
  sessionId: string,
  state: TState,
  fromPhase: string,
  toPhase: string
): CheckpointMetadata {
  return manager.checkpoint(
    sessionId,
    state,
    'phase_transition',
    toPhase,
    'phase_transition',
    `Transition from ${fromPhase} to ${toPhase}`
  );
}

/**
 * Create an emergency checkpoint
 */
export function checkpointEmergency<TState>(
  manager: CheckpointManager<TState>,
  sessionId: string,
  state: TState,
  phase: string,
  reason: string
): CheckpointMetadata {
  return manager.checkpoint(
    sessionId,
    state,
    'emergency',
    phase,
    'emergency_pause',
    `Emergency: ${reason}`
  );
}
