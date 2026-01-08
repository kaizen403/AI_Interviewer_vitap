/**
 * Voice Agent Entry Point
 * 
 * Main entry point for running voice agents with LiveKit.
 * Supports routing to different agent types based on room metadata.
 */

import 'dotenv/config';
import { WorkerOptions, cli, defineAgent, JobContext, JobProcess } from '@livekit/agents';
import * as silero from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'url';

import { createAgent, isAgentRegistered, listRegisteredAgents, type AgentType } from './core/index.js';

import { config } from '../config/index.js';

// ============================================================================
// Agent Router Entry Point
// ============================================================================

/**
 * Main agent definition that routes to appropriate agent based on room metadata
 */
export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    console.log('\n========================================');
    console.log('[VoiceAgentRouter] 🔥 PREWARM STARTING');
    console.log('========================================');
    console.log('[VoiceAgentRouter] Loading shared models (VAD)...');

    try {
      // Load VAD model with noise-resistant settings from config
      const vadConfig = config.vad;
      console.log('[VoiceAgentRouter] 🎛️ VAD settings:');
      console.log(`  - Activation threshold: ${vadConfig.activationThreshold} (higher = stricter)`);
      console.log(`  - Min speech duration: ${vadConfig.minSpeechDurationMs}ms`);
      console.log(`  - Min silence duration: ${vadConfig.minSilenceDurationMs}ms`);

      // Note: Silero VAD.load() options are limited, but we configure 
      // the AgentSession's turn detection to use these values
      proc.userData.vad = await silero.VAD.load({
        // Force CPU to avoid GPU issues
        forceCPU: true,
      });

      // Store our custom VAD config for use in the session
      proc.userData.vadConfig = vadConfig;

      console.log('[VoiceAgentRouter] ✅ VAD model loaded successfully');
    } catch (error) {
      console.error('[VoiceAgentRouter] ❌ Failed to load VAD model:', error);
      throw error;
    }

    const registeredAgents = listRegisteredAgents();
    console.log('[VoiceAgentRouter] ✅ Prewarm complete');
    console.log(`[VoiceAgentRouter] 📋 Registered agents (${registeredAgents.length}):`);
    registeredAgents.forEach(a => console.log(`  - ${a.name} (${a.type})`));
    console.log('========================================\n');
  },

  entry: async (ctx: JobContext) => {
    console.log('\n========================================');
    console.log('[VoiceAgentRouter] 🎤 NEW JOB RECEIVED');
    console.log('========================================');

    // Note: ctx.room.name may be undefined before connect(), use ctx.job.room.name instead
    const roomName = ctx.job.room?.name || ctx.room.name || 'unknown';
    console.log(`[VoiceAgentRouter] 🏠 Room name: ${roomName}`);
    console.log(`[VoiceAgentRouter] 📊 Job ID: ${ctx.job.id}`);
    console.log(`[VoiceAgentRouter] 📊 Job details:`, JSON.stringify(ctx.job, null, 2));

    // Parse room metadata to determine agent type
    // Try job.room.metadata first (available before connect), then fall back to ctx.room.metadata
    let metadata: Record<string, unknown> = {};
    const metadataStr = ctx.job.room?.metadata || ctx.room.metadata || '{}';
    console.log(`[VoiceAgentRouter] 📝 Raw metadata string: ${metadataStr}`);

    try {
      metadata = JSON.parse(metadataStr);
      console.log('[VoiceAgentRouter] ✅ Metadata parsed successfully:', JSON.stringify(metadata, null, 2));
    } catch (e) {
      console.warn('[VoiceAgentRouter] ⚠️ Failed to parse room metadata, using defaults');
      console.warn('[VoiceAgentRouter] Parse error:', e);
    }

    // Determine agent type from metadata (default to 'interview')
    const agentType = (metadata.agentType as AgentType) || 'interview';
    console.log(`[VoiceAgentRouter] 🎯 Agent type: ${agentType}`);

    // Check if agent type is registered
    if (!isAgentRegistered(agentType)) {
      console.error('[VoiceAgentRouter] ❌ UNKNOWN AGENT TYPE!');
      console.error(`[VoiceAgentRouter] Requested: ${agentType}`);
      console.error(`[VoiceAgentRouter] Available: ${listRegisteredAgents().map(a => a.type).join(', ')}`);
      return;
    }
    console.log(`[VoiceAgentRouter] ✅ Agent type '${agentType}' is registered`);

    // Create the appropriate agent
    console.log('[VoiceAgentRouter] 🏗️ Creating agent instance...');
    const agent = createAgent(agentType, metadata);
    console.log('[VoiceAgentRouter] ✅ Agent instance created');

    const agentDef = agent.createAgentDefinition();
    console.log('[VoiceAgentRouter] ✅ Agent definition created');

    // Run the agent's entry function
    if (agentDef.entry) {
      console.log('[VoiceAgentRouter] 🚀 Calling agent entry function...');
      console.log('========================================\n');
      try {
        await agentDef.entry(ctx);
        console.log('\n========================================');
        console.log('[VoiceAgentRouter] ✅ Agent entry completed successfully');
        console.log('========================================\n');
      } catch (error) {
        console.error('\n========================================');
        console.error('[VoiceAgentRouter] ❌ AGENT ENTRY FAILED!');
        console.error('[VoiceAgentRouter] Error:', error);
        console.error('========================================\n');
        throw error;
      }
    } else {
      console.warn('[VoiceAgentRouter] ⚠️ Agent has no entry function!');
    }
  },
});

// ============================================================================
// CLI Entry Point
// ============================================================================

const __filename = fileURLToPath(import.meta.url);

cli.runApp(
  new WorkerOptions({
    agent: __filename,
    agentName: 'pendent-voice-agent',
  })
);
