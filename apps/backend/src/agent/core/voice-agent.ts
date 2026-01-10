/**
 * Base Voice Agent
 * Abstract base class for all LangGraph-powered voice agents
 *
 * This class handles:
 * - LiveKit room connection and management
 * - Voice pipeline setup (VAD, STT, LLM, TTS)
 * - LangGraph integration for state management
 * - Event handling and lifecycle management
 */

import {
  WorkerOptions,
  defineAgent,
  JobContext,
  JobProcess,
  voice,
} from "@livekit/agents";
import * as livekit from "@livekit/agents-plugin-livekit";
import * as openai from "@livekit/agents-plugin-openai";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as silero from "@livekit/agents-plugin-silero";
import * as cartesia from "@livekit/agents-plugin-cartesia";
import { StateGraph, END, START } from "@langchain/langgraph";

import {
  type BaseAgentConfig,
  type BaseAgentState,
  type TranscriptEntry,
  type AgentEvent,
  type AgentEventHandler,
  type AgentMetadata,
  AgentEventType,
} from "./types.js";
import {
  withTimeout,
  withRetry,
  AgentLogger,
  createAgentLogger,
  CheckpointManager,
  getCheckpointManager,
} from "./utils/index.js";

// ============================================================================
// Constants
// ============================================================================

/** Default timeout for graph invocations (ms) */
const GRAPH_INVOKE_TIMEOUT_MS = 30000;

/** Maximum retries for graph invocations */
const GRAPH_INVOKE_MAX_RETRIES = 2;

// ============================================================================
// Abstract Base Class
// ============================================================================

/**
 * Abstract base class for voice agents with LangGraph integration
 *
 * Extend this class to create custom voice agents:
 *
 * @example
 * ```typescript
 * class MyAgent extends BaseVoiceAgent<MyState, MyConfig> {
 *   protected buildGraph() {
 *     // Build your LangGraph workflow
 *   }
 *
 *   protected getSystemPrompt(metadata: AgentMetadata): string {
 *     return "You are a helpful assistant...";
 *   }
 * }
 * ```
 */
export abstract class BaseVoiceAgent<
  TState extends BaseAgentState = BaseAgentState,
  TConfig extends BaseAgentConfig = BaseAgentConfig,
> {
  protected config: TConfig;
  protected graph: any = null; // LangGraph compiled graph
  protected currentState: TState | null = null;
  protected eventHandlers: Map<AgentEventType, AgentEventHandler[]> = new Map();
  protected session: voice.AgentSession | null = null;
  protected vad: silero.VAD | null = null;
  protected logger: AgentLogger;
  protected checkpointManager: CheckpointManager<TState>;
  protected ctx: JobContext | null = null; // Store context for data messages

  constructor(config: TConfig) {
    this.config = config;
    this.logger = createAgentLogger(config.name);
    this.checkpointManager = getCheckpointManager<TState>();
  }

  // -------------------------------------------------------------------------
  // Abstract Methods (Must be implemented by subclasses)
  // -------------------------------------------------------------------------

  /**
   * Build the LangGraph state graph
   * Override this to define your agent's workflow
   */
  protected abstract buildGraph(): any; // Returns StateGraph that will be compiled

  /**
   * Get the system prompt for the agent
   * Override this to customize the agent's personality
   */
  protected abstract getSystemPrompt(metadata: AgentMetadata): string;

  /**
   * Create the initial state for a new session
   * Override this to set up your agent's initial state
   */
  protected abstract createInitialState(
    sessionId: string,
    roomName: string,
    metadata: AgentMetadata,
  ): TState;

  /**
   * Get the greeting message for the user
   * Override this to customize the initial greeting
   */
  protected abstract getGreetingMessage(metadata: AgentMetadata): string;

  // -------------------------------------------------------------------------
  // Template Methods (Can be overridden)
  // -------------------------------------------------------------------------

  /**
   * Process user input and route through LangGraph
   * Override for custom input processing
   * Includes timeout and retry protection
   */
  protected async processUserInput(
    input: string,
    state: TState,
  ): Promise<{ response: string; newState: TState }> {
    if (!this.graph) {
      throw new Error("Graph not initialized");
    }

    this.logger.debug("Processing user input", { inputLength: input.length });

    // Add user message to transcript
    const updatedTranscript: TranscriptEntry[] = [
      ...state.transcript,
      {
        role: "user" as const,
        content: input,
        timestamp: new Date(),
      },
    ];

    // Create updated state with user input
    const inputState = {
      ...state,
      transcript: updatedTranscript,
    };

    try {
      // Invoke the graph with timeout protection
      const result = (await withTimeout(this.graph.invoke(inputState), {
        timeoutMs: GRAPH_INVOKE_TIMEOUT_MS,
        timeoutMessage: "Graph invocation timed out",
      })) as TState & { lastAiMessage?: string };

      // Extract AI response
      const response =
        result.lastAiMessage || "I'm sorry, I didn't understand that.";

      this.logger.debug("Graph invocation complete", {
        responseLength: response.length,
      });

      return {
        response,
        newState: result as TState,
      };
    } catch (error) {
      this.logger.error("Graph invocation failed", error);

      // Return graceful fallback
      return {
        response:
          "I'm having a moment of difficulty. Could you please repeat that?",
        newState: state,
      };
    }
  }

  /**
   * Handle events during the session
   * Override for custom event handling
   */
  protected async onEvent(event: AgentEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  /**
   * Called when user joins the room
   * Override for custom join handling
   */
  protected async onUserJoined(participantId: string): Promise<void> {
    console.log(`[${this.config.name}] User joined: ${participantId}`);
  }

  /**
   * Called when user leaves the room
   * Override for custom leave handling
   */
  protected async onUserLeft(participantId: string): Promise<void> {
    console.log(`[${this.config.name}] User left: ${participantId}`);
  }

  /**
   * Called on session end
   * Override for cleanup
   */
  protected async onSessionEnd(): Promise<void> {
    console.log(`[${this.config.name}] Session ended`);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Register an event handler
   */
  public on(eventType: AgentEventType, handler: AgentEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Get current state
   */
  public getState(): TState | null {
    return this.currentState;
  }

  /**
   * Get agent configuration
   */
  public getConfig(): TConfig {
    return this.config;
  }

  // -------------------------------------------------------------------------
  // LiveKit Agent Integration
  // -------------------------------------------------------------------------

  /**
   * Create the LiveKit agent definition
   * This is called by the agent runner
   */
  public createAgentDefinition() {
    const self = this;

    return defineAgent({
      prewarm: async (proc: JobProcess) => {
        self.logger.info("Prewarming - loading VAD model...");
        proc.userData.vad = await silero.VAD.load();
        self.logger.info("Prewarm complete");
      },

      entry: async (ctx: JobContext) => {
        await self.handleEntry(ctx);
      },
    });
  }

  /**
   * Handle agent entry (when job starts)
   */
  protected async handleEntry(ctx: JobContext): Promise<void> {
    console.log("\n========================================");
    console.log(`[${this.config.name}] 🎤 HANDLE ENTRY STARTING`);
    console.log("========================================");

    try {
      console.log(`[${this.config.name}] 📊 Job context:`);
      console.log(
        `  - Room name: ${ctx.room?.name || ctx.job?.room?.name || "unknown"}`,
      );
      console.log(
        `  - Proc userData keys: ${Object.keys(ctx.proc?.userData || {}).join(", ")}`,
      );

      this.logger.info("🎤 Agent starting", { roomName: ctx.room.name });

      // Note: We'll parse metadata AFTER connecting to the room (it's empty before connect)
      console.log(`[${this.config.name}] 📝 Initial metadata check (pre-connect)...`);

      // Get preloaded VAD
      console.log(`[${this.config.name}] 🎙️ Getting preloaded VAD...`);
      this.vad = ctx.proc.userData.vad as silero.VAD;
      if (this.vad) {
        console.log(`[${this.config.name}] ✅ VAD loaded from proc.userData`);
      } else {
        console.error(
          `[${this.config.name}] ❌ VAD not found in proc.userData!`,
        );
      }

      // Build and compile the graph
      console.log(`[${this.config.name}] 🏗️ Building LangGraph...`);
      const graphBuilder = this.buildGraph();
      console.log(`[${this.config.name}] ✅ Graph built, compiling...`);
      this.graph = graphBuilder.compile ? graphBuilder.compile() : graphBuilder;
      console.log(`[${this.config.name}] ✅ Graph compiled`);

      // Note: sessionId, metadata, and voice.Agent will be created after room connection

      // Create voice pipeline components
      console.log(
        `[${this.config.name}] 🎛️ Creating voice pipeline components...`,
      );

      console.log(`[${this.config.name}]   - Creating STT (Deepgram)...`);
      const stt = this.createSTT();
      console.log(
        `[${this.config.name}]   ✅ STT created: model=${this.config.stt.model}, language=${this.config.stt.language}`,
      );

      console.log(`[${this.config.name}]   - Creating LLM (OpenAI)...`);
      const llm = this.createVoiceLLM();
      console.log(
        `[${this.config.name}]   ✅ LLM created: model=${this.config.llm.model}, temp=${this.config.llm.temperature}`,
      );

      console.log(`[${this.config.name}]   - Creating TTS (Cartesia)...`);
      const tts = this.createTTS();
      console.log(
        `[${this.config.name}]   ✅ TTS created: model=${this.config.tts.model}, voice=${this.config.tts.voiceId}`,
      );

      console.log(`[${this.config.name}]   - Creating turn detection...`);
      const turnDetection = this.createTurnDetection();
      console.log(`[${this.config.name}]   ✅ Turn detection created`);

      // Create agent session with voice pipeline
      // Configure to be less sensitive to interruptions and require longer silence
      console.log(
        `[${this.config.name}] 🔧 Creating AgentSession with voice pipeline...`,
      );
      const vadConfig = this.config.vad;
      console.log(
        `[${this.config.name}]   - minEndpointingDelay: ${(vadConfig?.minSilenceDurationMs || 1200) / 1000}s`,
      );

      this.session = new voice.AgentSession({
        vad: this.vad,
        stt,
        llm,
        tts,
        turnDetection,
        // Voice options OPTIMIZED FOR LOW LATENCY
        voiceOptions: {
          // Faster endpointing - reduced from 1.2s to 0.6s
          minEndpointingDelay: (vadConfig?.minSilenceDurationMs || 600) / 1000,
          maxEndpointingDelay:
            (vadConfig?.minSilenceDurationMs || 600) / 1000 + 0.5,

          // Shorter speech required before interruption (250ms)
          minInterruptionDuration:
            (vadConfig?.minSpeechDurationMs || 250) / 1000,

          // Only 2 words needed to interrupt (faster response)
          minInterruptionWords: 2,

          // Allow interruptions for natural conversation
          allowInterruptions: true,
        },
      });
      console.log(
        `[${this.config.name}] ✅ AgentSession created with noise-resistant settings`,
      );

      // Connect to room
      console.log(`[${this.config.name}] 🔌 Connecting to room...`);
      await ctx.connect();
      this.ctx = ctx; // Store context for data message handling
      console.log(
        `[${this.config.name}] ✅ Connected to room: ${ctx.room.name}`,
      );
      console.log(
        `[${this.config.name}]   - Room metadata: ${ctx.room.metadata}`,
      );
      this.logger.info("✅ Connected to room");

      // NOW parse room metadata (after connection, it's available)
      console.log(`[${this.config.name}] 📝 Parsing room metadata (post-connect)...`);
      const rawMetadata = ctx.room.metadata || "{}";
      console.log(`[${this.config.name}] Raw metadata: ${rawMetadata.substring(0, 200)}...`);
      const metadata = this.parseMetadata(rawMetadata);
      console.log(
        `[${this.config.name}] ✅ Parsed metadata:`,
        JSON.stringify(metadata, null, 2),
      );

      // Create initial state with metadata from room
      const sessionId = `session_${Date.now()}`;
      console.log(
        `[${this.config.name}] 📋 Creating initial state for session: ${sessionId}`,
      );
      this.currentState = this.createInitialState(
        sessionId,
        ctx.room.name ?? "",
        metadata,
      );
      console.log(`[${this.config.name}] ✅ Initial state created`);
      console.log(`[${this.config.name}]   - pptContent available: ${!!metadata.pptContent}`);
      console.log(`[${this.config.name}]   - pptUrl: ${metadata.pptUrl || 'none'}`);

      // Set up data message listener for file uploads and other events
      console.log(
        `[${this.config.name}] 📡 Setting up data message listener...`,
      );
      this.setupDataMessageListener(ctx);

      // Emit session started event
      console.log(`[${this.config.name}] 📡 Emitting SESSION_STARTED event...`);
      await this.onEvent({
        type: AgentEventType.SESSION_STARTED,
        timestamp: new Date(),
        sessionId,
        data: { roomName: ctx.room.name, metadata },
      });

      // Create voice agent with system prompt
      console.log(
        `[${this.config.name}] 🤖 Creating voice.Agent with system prompt...`,
      );
      const systemPrompt = this.getSystemPrompt(metadata);
      console.log(
        `[${this.config.name}] System prompt preview: ${systemPrompt.substring(0, 100)}...`,
      );
      const agent = new voice.Agent({
        instructions: systemPrompt,
      });
      console.log(`[${this.config.name}] ✅ voice.Agent created`);

      // Start the agent session
      console.log(`[${this.config.name}] 🚀 Starting agent session...`);
      try {
        await this.session.start({
          agent,
          room: ctx.room,
        });
        console.log(
          `[${this.config.name}] ✅ Voice agent session started successfully!`,
        );
        this.logger.info("🚀 Voice agent session started");
      } catch (err) {
        console.error(
          `[${this.config.name}] ❌ Failed to start agent session:`,
          err,
        );
        this.logger.error("❌ Failed to start agent session:", err);
        throw err;
      }

      // Start periodic checkpointing
      console.log(
        `[${this.config.name}] 💾 Starting periodic checkpointing...`,
      );
      this.checkpointManager.startPeriodic(
        sessionId,
        () => this.currentState!,
        "session",
        () => (this.currentState as any)?.phase || "unknown",
      );

      // NOTE: Greeting is now handled by the LangGraph workflow (e.g., greetingNode)
      // Do NOT call session.say() here as it would cause duplicate speech.
      // The workflow will set lastAiMessage which automatically triggers TTS.
      console.log(
        `[${this.config.name}] 📋 Greeting will be handled by LangGraph workflow...`,
      );

      // Wait for participant
      console.log(
        `[${this.config.name}] ⏳ Waiting for participant to join...`,
      );
      const participant = await ctx.waitForParticipant();
      console.log(`[${this.config.name}] ✅ Participant joined!`);
      console.log(
        `[${this.config.name}]   - Identity: ${participant.identity}`,
      );
      console.log(`[${this.config.name}]   - Name: ${participant.name}`);
      console.log(`[${this.config.name}]   - SID: ${participant.sid}`);
      this.logger.info("👤 Participant joined", {
        participantId: participant.identity,
      });

      await this.onUserJoined(participant.identity);
      await this.onEvent({
        type: AgentEventType.USER_JOINED,
        timestamp: new Date(),
        sessionId: this.getSessionId(),
        data: { participantId: participant.identity },
      });

      // Invoke the graph to trigger the greeting workflow
      console.log(`[${this.config.name}] 🚀 Starting interview...`);

      // Parse room metadata for greeting
      let roomMetadata: any = {};
      try {
        roomMetadata = JSON.parse(ctx.room.metadata || "{}");
      } catch {
        /* ignore parse errors */
      }

      // IMMEDIATELY speak a greeting before running the graph
      // This ensures the user hears something right away
      if (this.session) {
        const candidateName = roomMetadata.candidateName || "there";
        const reviewerName =
          roomMetadata.agentConfig?.interviewerName || "your AI Reviewer";

        const greeting = `Hello ${candidateName}! Welcome to your capstone project review session. I'm ${reviewerName}, and I'll be reviewing your presentation today. Let me just analyze what you've uploaded, and then we'll get started with some questions about your project.`;

        console.log(
          `[${this.config.name}] 💬 Speaking greeting immediately...`,
        );
        await this.session.say(greeting);
        console.log(`[${this.config.name}] ✅ Greeting spoken!`);
      }

      // Now invoke the graph workflow in the background
      // The graph will generate questions and handle the interview flow
      console.log(`[${this.config.name}] 📊 Invoking graph workflow...`);

      this.graph
        .invoke(this.currentState)
        .then((result: any) => {
          this.currentState = result;
          console.log(`[${this.config.name}] ✅ Graph workflow completed`);
        })
        .catch((error: any) => {
          console.error(
            `[${this.config.name}] ❌ Graph workflow error:`,
            error,
          );
        });

      console.log("\n========================================");
      console.log(`[${this.config.name}] ✨ AGENT IS READY AND LISTENING`);
      console.log("========================================\n");
      this.logger.info("✨ Agent is ready and listening...");

      // =====================================================================
      // KEEP SESSION ALIVE - Wait for room to disconnect
      // The agent must stay alive to handle ongoing conversation
      // =====================================================================

      // Set up event listeners for debugging
      this.setupSessionEventListeners(ctx);

      // Wait for the room to disconnect before exiting
      // This keeps the agent alive for the entire session
      console.log(
        `[${this.config.name}] 🔄 Waiting for room disconnect (session is active)...`,
      );

      await new Promise<void>((resolve) => {
        ctx.room.on("disconnected", () => {
          console.log(
            `[${this.config.name}] 🔌 Room disconnected - ending session`,
          );
          this.logger.info("Room disconnected - ending session");
          resolve();
        });

        // Also resolve if room connection state changes
        ctx.room.on("connectionStateChanged", (state: any) => {
          console.log(
            `[${this.config.name}] 📡 Connection state changed: ${state}`,
          );
          if (state === "disconnected") {
            resolve();
          }
        });
      });

      // Cleanup
      console.log(`[${this.config.name}] 🧹 Cleaning up session...`);
      await this.onSessionEnd();
      this.checkpointManager.stopPeriodic(this.getSessionId());

      console.log(`[${this.config.name}] ✅ Session ended gracefully`);
    } catch (err) {
      console.error("\n========================================");
      console.error(`[${this.config.name}] ❌ FATAL ERROR IN handleEntry`);
      console.error("========================================");
      console.error("Error:", err);
      console.error("Stack:", (err as Error)?.stack);
      this.logger.error("❌ Fatal error in handleEntry:", err);
      throw err;
    }
  }

  /**
   * Set up event listeners for session debugging
   */
  protected setupSessionEventListeners(ctx: JobContext): void {
    const agentName = this.config.name;

    // Track speaking events
    ctx.room.on(
      "trackSubscribed",
      (track: any, publication: any, participant: any) => {
        console.log(
          `[${agentName}] 🎧 Track subscribed: ${track.kind} from ${participant.identity}`,
        );
      },
    );

    ctx.room.on(
      "trackUnsubscribed",
      (track: any, publication: any, participant: any) => {
        console.log(
          `[${agentName}] 🔇 Track unsubscribed: ${track.kind} from ${participant.identity}`,
        );
      },
    );

    // Track participant events
    ctx.room.on("participantConnected", (participant: any) => {
      console.log(
        `[${agentName}] 👤 Participant connected: ${participant.identity}`,
      );
    });

    ctx.room.on("participantDisconnected", (participant: any) => {
      console.log(
        `[${agentName}] 👋 Participant disconnected: ${participant.identity}`,
      );
    });

    // Track active speaker
    ctx.room.on("activeSpeakersChanged", (speakers: any[]) => {
      if (speakers.length > 0) {
        console.log(
          `[${agentName}] 🗣️ Active speakers: ${speakers.map((s: any) => s.identity).join(", ")}`,
        );
      }
    });

    console.log(`[${agentName}] 📡 Session event listeners set up`);
  }

  /**
   * Set up listener for data messages from the room
   */
  protected setupDataMessageListener(ctx: JobContext): void {
    ctx.room.on(
      "dataReceived",
      (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));
          this.logger.debug("📩 Data message received", {
            topic,
            type: message.type,
          });
          this.onDataMessage(message, participant);
        } catch (err) {
          this.logger.error("Failed to parse data message:", err);
        }
      },
    );
    this.logger.info("📡 Data message listener set up");
  }

  /**
   * Handle incoming data messages
   * Override this in subclasses to handle specific message types
   */
  protected onDataMessage(
    message: { type: string; data?: any },
    participant: any,
  ): void {
    this.logger.debug("Data message received (base handler)", {
      type: message.type,
    });
    // Base implementation does nothing - override in subclasses
  }

  /**
   * Get session ID from current state (handles different state shapes)
   */
  protected getSessionId(): string {
    if (!this.currentState) return "";
    // Check for common session ID field names
    const state = this.currentState as Record<string, unknown>;
    return (state.sessionId ||
      state.interviewId ||
      state.reviewId ||
      "") as string;
  }

  // -------------------------------------------------------------------------
  // Voice Pipeline Factory Methods
  // -------------------------------------------------------------------------

  /**
   * Create STT instance based on config
   * Using Deepgram nova-2 - Cartesia STT not yet available in Node.js plugin
   */
  protected createSTT(): deepgram.STT {
    const { stt } = this.config;

    // Optimized Deepgram settings for low latency
    const sttOptions: any = {
      model: stt.model as any,
      language: stt.language,
      punctuate: stt.punctuate ?? true,
      smartFormat: stt.smartFormat ?? true,
      // Fast utterance end detection for quicker turn-taking
      endpointing: 300, // 300ms silence to end utterance
      interimResults: true, // Get faster interim results
    };

    this.logger.info("🎙️ Using Deepgram STT (nova-2) with optimized settings");
    this.logger.debug("STT configuration", sttOptions);

    return new deepgram.STT(sttOptions);
  }

  /**
   * Create VAD (Voice Activity Detection) with noise-resistant settings
   * Uses higher thresholds to ignore background voices and noise
   */
  protected async createVAD(proc: JobProcess): Promise<silero.VAD> {
    const vadConfig = this.config.vad;

    // Use preloaded VAD if available (from prewarm)
    if (proc.userData.vad) {
      this.logger.info("Using preloaded VAD from prewarm");
      return proc.userData.vad as silero.VAD;
    }

    // Create new VAD with custom settings for noise resistance
    const vadOptions: any = {};

    // Higher activation threshold = less sensitive to background noise
    // Default is around 0.5, we increase to reduce false positives
    if (vadConfig?.activationThreshold) {
      vadOptions.activationThreshold = vadConfig.activationThreshold;
    }

    // Minimum speech duration before triggering (filters out short noises)
    if (vadConfig?.minSpeechDurationMs) {
      vadOptions.minSpeechDurationMs = vadConfig.minSpeechDurationMs;
    }

    // Minimum silence to end segment (prevents premature cutoff)
    if (vadConfig?.minSilenceDurationMs) {
      vadOptions.minSilenceDurationMs = vadConfig.minSilenceDurationMs;
    }

    // Padding for smoother transitions
    if (vadConfig?.paddingStartMs) {
      vadOptions.paddingStartMs = vadConfig.paddingStartMs;
    }
    if (vadConfig?.paddingEndMs) {
      vadOptions.paddingEndMs = vadConfig.paddingEndMs;
    }

    this.logger.debug("VAD configuration", vadOptions);

    return await silero.VAD.load(vadOptions);
  }

  /**
   * Create LLM instance for voice (uses OpenAI plugin)
   */
  protected createVoiceLLM(): openai.LLM {
    const { llm } = this.config;
    return new openai.LLM({
      model: llm.model,
      temperature: llm.temperature,
    });
  }

  /**
   * Create TTS instance based on config
   */
  protected createTTS(): cartesia.TTS {
    const { tts } = this.config;
    return new cartesia.TTS({
      model: tts.model,
      voice: tts.voiceId,
      language: tts.language,
    });
  }

  /**
   * Create turn detection based on config
   * Uses LiveKit's MultilingualModel for robust turn detection across languages
   */
  protected createTurnDetection(): livekit.turnDetector.MultilingualModel {
    return new livekit.turnDetector.MultilingualModel();
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  /**
   * Parse room metadata
   */
  protected parseMetadata(metadataStr: string): AgentMetadata {
    try {
      const parsed = JSON.parse(metadataStr);
      return {
        agentType: parsed.agentType || "custom",
        sessionId: parsed.sessionId || `session_${Date.now()}`,
        userId: parsed.userId,
        customData: parsed,
      };
    } catch {
      return {
        agentType: "custom",
        sessionId: `session_${Date.now()}`,
      };
    }
  }

  /**
   * Speak a message through TTS
   */
  protected speak(message: string): void {
    if (this.session) {
      this.session.say(message);

      // Update state
      if (this.currentState) {
        this.currentState = {
          ...this.currentState,
          lastAiMessage: message,
          transcript: [
            ...this.currentState.transcript,
            {
              role: "ai" as const,
              content: message,
              timestamp: new Date(),
            },
          ],
        };
      }
    }
  }

  /**
   * Update the current state
   */
  protected updateState(update: Partial<TState>): void {
    if (this.currentState) {
      this.currentState = {
        ...this.currentState,
        ...update,
      };
    }
  }
}
