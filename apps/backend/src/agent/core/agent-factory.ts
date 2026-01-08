/**
 * Agent Factory
 * Factory for creating and registering voice agents
 */

import { WorkerOptions, cli } from '@livekit/agents';
import { fileURLToPath } from 'url';
import type { BaseVoiceAgent } from './voice-agent.js';
import type { AgentType, AgentRegistration, BaseAgentConfig, BaseAgentState } from './types.js';

// ============================================================================
// Agent Registry
// ============================================================================

/**
 * Agent registry - stores all registered agent types
 */
const agentRegistry = new Map<AgentType, AgentRegistration>();

/**
 * Agent instance creators
 */
const agentCreators = new Map<
  AgentType,
  (config?: Record<string, unknown>) => BaseVoiceAgent<BaseAgentState, BaseAgentConfig>
>();

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Register a new agent type
 */
export function registerAgent<TState extends BaseAgentState, TConfig extends BaseAgentConfig>(
  registration: AgentRegistration,
  creator: (config?: Record<string, unknown>) => BaseVoiceAgent<TState, TConfig>
): void {
  agentRegistry.set(registration.type, registration);
  agentCreators.set(registration.type, creator as any);
  console.log(`[AgentFactory] Registered agent: ${registration.name} (${registration.type})`);
}

/**
 * Get registered agent info
 */
export function getAgentInfo(type: AgentType): AgentRegistration | undefined {
  return agentRegistry.get(type);
}

/**
 * Get all registered agents
 */
export function listRegisteredAgents(): AgentRegistration[] {
  return Array.from(agentRegistry.values());
}

/**
 * Check if an agent type is registered
 */
export function isAgentRegistered(type: AgentType): boolean {
  return agentRegistry.has(type);
}

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create an agent instance
 */
export function createAgent<TState extends BaseAgentState = BaseAgentState>(
  type: AgentType,
  config?: Record<string, unknown>
): BaseVoiceAgent<TState, BaseAgentConfig> {
  const creator = agentCreators.get(type);

  if (!creator) {
    throw new Error(`Agent type '${type}' is not registered. Available types: ${Array.from(agentRegistry.keys()).join(', ')}`);
  }

  return creator(config) as BaseVoiceAgent<TState, BaseAgentConfig>;
}

// ============================================================================
// Agent Runner
// ============================================================================

/**
 * Configuration for running an agent
 */
export interface AgentRunnerConfig {
  /** Agent type to run */
  agentType: AgentType;

  /** Agent name (for identification in LiveKit) */
  agentName?: string;

  /** Custom configuration for the agent */
  config?: Record<string, unknown>;

  /** Path to the agent file (for CLI runner) */
  agentFile?: string;
}

/**
 * Run an agent with the LiveKit CLI
 */
export function runAgent(runnerConfig: AgentRunnerConfig): void {
  const { agentType, agentName, config } = runnerConfig;

  const agent = createAgent(agentType, config);
  const agentDef = agent.createAgentDefinition();

  const name = agentName || `${agentType}-agent`;
  const agentFile = runnerConfig.agentFile || fileURLToPath(import.meta.url);

  cli.runApp(
    new WorkerOptions({
      agent: agentFile,
      agentName: name,
    })
  );
}

// ============================================================================
// Multi-Agent Router
// ============================================================================

/**
 * Route to appropriate agent based on room metadata
 * 
 * Use this when you want a single entry point that can route
 * to different agents based on room configuration
 */
export function createAgentRouter() {
  return {
    /**
     * Get the appropriate agent for a room based on metadata
     */
    getAgentForRoom(metadata: Record<string, unknown>): BaseVoiceAgent | null {
      const agentType = (metadata.agentType as AgentType) || 'project-review';

      if (!isAgentRegistered(agentType)) {
        console.error(`[AgentRouter] Unknown agent type: ${agentType}`);
        return null;
      }

      return createAgent(agentType, metadata);
    },

    /**
     * Create a unified agent definition that routes based on metadata
     */
    createRoutedAgentDefinition() {
      // This creates a single agent entry point that routes to the right agent
      // based on room metadata
      return {
        prewarm: async (proc: any) => {
          // Prewarm all registered agents
          console.log('[AgentRouter] Prewarming all agents...');
          // VAD is shared across all agents
          const silero = await import('@livekit/agents-plugin-silero');
          proc.userData.vad = await silero.VAD.load();
        },

        entry: async (ctx: any) => {
          const metadata = JSON.parse(ctx.room.metadata || '{}');
          const agentType = metadata.agentType as AgentType || 'project-review';

          console.log(`[AgentRouter] Routing to agent: ${agentType}`);

          const agent = createAgent(agentType, metadata);
          const agentDef = agent.createAgentDefinition();

          // Call the agent's entry function
          if (agentDef.entry) {
            await agentDef.entry(ctx);
          }
        },
      };
    },
  };
}

// ============================================================================
// Default Export
// ============================================================================

export const AgentFactory = {
  register: registerAgent,
  create: createAgent,
  run: runAgent,
  list: listRegisteredAgents,
  getInfo: getAgentInfo,
  isRegistered: isAgentRegistered,
  createRouter: createAgentRouter,
};

export default AgentFactory;
