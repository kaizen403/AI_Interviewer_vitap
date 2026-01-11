/**
 * Project Review Agent
 * LangGraph-powered voice agent for reviewing project presentations
 * 
 * This agent:
 * - Receives PPT upload and parses content
 * - Detects AI-generated content
 * - Generates level-wise questions (easy, medium, hard)
 * - Evaluates answers and generates comprehensive report
 */

import { StateGraph, END, START } from '@langchain/langgraph';

import { BaseVoiceAgent } from '../core/voice-agent.js';
import { type AgentMetadata, type BaseAgentConfig } from '../core/types.js';

import {
  ProjectReviewState,
  type ProjectReviewStateType,
  createDefaultReviewConnectionState,
  createDefaultReviewTimeState,
} from './state/index.js';
import { ReviewPhase, QuestionLevel } from './types/index.js';
import {
  initializationNode,
  pptParsingNode,
  aiDetectionNode,
  questionGenerationNode,
  askQuestionNode,
  evaluateAnswerNode,
  levelTransitionNode,
  reportGenerationNode,
  closingNode,
} from './nodes/index.js';

// ============================================================================
// Types
// ============================================================================

export interface ProjectReviewAgentConfig extends BaseAgentConfig {
  reviewId: string;
  candidateId: string;
  projectTitle: string;
  maxDurationMinutes?: number;
}

// ============================================================================
// Project Review Agent Implementation
// ============================================================================

export class ProjectReviewAgent extends BaseVoiceAgent<ProjectReviewStateType, ProjectReviewAgentConfig> {
  /**
   * Build the project review LangGraph workflow
   */
  protected buildGraph() {
    const graph = new StateGraph(ProjectReviewState) as any;

    // -----------------------------------------------------------------------
    // Add Nodes
    // -----------------------------------------------------------------------

    // Setup phase
    graph.addNode('initializeSession', initializationNode);
    graph.addNode('awaitUpload', this.createWaitForUploadNode());
    graph.addNode('parsePpt', pptParsingNode);

    // Analysis phase
    graph.addNode('detectAiContent', aiDetectionNode);
    graph.addNode('generateQuestions', questionGenerationNode);

    // Questioning phase
    graph.addNode('presentQuestion', askQuestionNode);
    graph.addNode('assessAnswer', evaluateAnswerNode);
    graph.addNode('transitionLevel', levelTransitionNode);

    // Report phase
    graph.addNode('generateReport', reportGenerationNode);
    graph.addNode('closeSession', closingNode);

    // Error handling
    graph.addNode('onError', this.createErrorNode());

    // -----------------------------------------------------------------------
    // Add Edges
    // -----------------------------------------------------------------------

    // Entry
    graph.addEdge(START, 'initializeSession');
    graph.addEdge('initializeSession', 'awaitUpload');

    // Upload routing
    graph.addConditionalEdges('awaitUpload', this.routeFromUpload.bind(this), {
      parsePpt: 'parsePpt',
      awaitUpload: 'awaitUpload',
      onError: 'onError',
    });

    // Parsing -> Detection -> Question Gen
    graph.addEdge('parsePpt', 'detectAiContent');
    graph.addEdge('detectAiContent', 'generateQuestions');
    graph.addEdge('generateQuestions', 'presentQuestion');

    // Question loop
    graph.addConditionalEdges('presentQuestion', this.routeFromQuestion.bind(this), {
      assessAnswer: 'assessAnswer',
      generateReport: 'generateReport',
    });

    graph.addEdge('assessAnswer', 'transitionLevel');

    // Level transition routing
    graph.addConditionalEdges('transitionLevel', this.routeFromLevelTransition.bind(this), {
      presentQuestion: 'presentQuestion',
      generateReport: 'generateReport',
    });

    // Report -> Closing -> End
    graph.addEdge('generateReport', 'closeSession');
    graph.addEdge('closeSession', END);
    graph.addEdge('onError', END);

    return graph;
  }

  /**
   * Get system prompt for the project review agent
   * Includes RAG context from PPT if available
   */
  protected getSystemPrompt(metadata: AgentMetadata): string {
    const pptContext = this.currentState?.pptContext || '';
    const projectTitle = metadata.projectTitle || 'the project';
    const candidateName = metadata.candidate?.name || 'the candidate';

    let prompt = `You are an AI project reviewer conducting a professional capstone presentation review session.

CANDIDATE: ${candidateName}
PROJECT: ${projectTitle}

YOUR ROLE:
- Review the candidate's project presentation (PPT)
- Ask targeted questions based on the presentation content
- Evaluate understanding and project ownership
- Progress from easier to harder questions
- Provide constructive feedback

GUIDELINES:
1. Be professional but encouraging
2. Start with easier questions to build confidence
3. Progress to harder questions to test depth of understanding
4. Reference specific slides and content from the presentation when asking questions
5. Note any discrepancies between what's in the presentation and the candidate's answers
6. Focus on testing genuine understanding, not memorization
7. Ask follow-up questions if answers are vague or incomplete

SESSION INFO:
- Session ID: ${metadata.sessionId || 'unknown'}
- Room: ${metadata.roomName || 'unknown'}`;

    // Add PPT context if available
    if (pptContext) {
      prompt += `

PRESENTATION CONTENT (from uploaded PPT):
${pptContext}

Use this presentation content to:
- Ask specific questions about concepts mentioned in the slides
- Verify the candidate understands their own implementation
- Probe technical decisions and trade-offs
- Identify potential gaps in knowledge`;
    }

    return prompt;
  }

  /**
   * Create initial state for a new review session
   */
  protected createInitialState(
    sessionId: string,
    roomName: string,
    metadata: AgentMetadata
  ): ProjectReviewStateType {
    // Check if PPT was already uploaded (from room metadata)
    const hasPptUploaded = !!(metadata.pptUrl || metadata.pptContent);

    return {
      // Session info
      sessionId,
      roomName,
      // Skip UPLOAD phase if PPT already uploaded
      phase: hasPptUploaded ? ReviewPhase.PARSING : ReviewPhase.UPLOAD,

      // Candidate (will be populated from metadata)
      candidate: metadata.candidate ? {
        id: metadata.candidate.id || '',
        name: metadata.candidate.name || 'Candidate',
        email: metadata.candidate.email || '',
        projectTitle: metadata.projectTitle || 'Project',
      } : null,

      // PPT content - use from metadata if available
      pptFile: metadata.pptUrl || null,
      pptMetadata: null,
      slides: [],
      pptContext: metadata.pptContent || '', // Use pptContent from room metadata

      // AI Detection
      aiDetection: null,

      // Questions
      questionsPool: {
        easy: [],
        medium: [],
        hard: [],
      },
      currentQuestion: null,
      questionsAsked: [],
      currentLevel: QuestionLevel.EASY,

      // Answers & Evaluations
      answers: [],
      evaluations: [],

      // Report
      finalReport: null,

      // Connection
      connection: createDefaultReviewConnectionState(),

      // Time tracking
      time: createDefaultReviewTimeState(),

      // Conversation
      transcript: [],
      lastAiMessage: '',
      lastUserMessage: '',
      shouldSpeak: true,

      // Error handling
      errorCount: 0,
      lastError: null,
    };
  }

  /**
   * Get greeting message for the candidate
   */
  protected getGreetingMessage(metadata: AgentMetadata): string {
    const name = metadata.candidate?.name || 'there';
    return `Hello ${name}! Welcome to your project review session. 
I'm here to discuss your project presentation with you.

Please start by uploading your PowerPoint file. Once I receive it, 
I'll analyze the content and we'll have a discussion about your project.`;
  }

  // =========================================================================
  // Routing Functions
  // =========================================================================

  private routeFromUpload(state: ProjectReviewStateType): string {
    if (state.pptFile) {
      return 'parsePpt';
    }
    if (state.errorCount >= 3) {
      return 'onError';
    }
    return 'awaitUpload';
  }

  private routeFromQuestion(state: ProjectReviewStateType): string {
    // Check if we have a question to ask
    if (state.currentQuestion) {
      return 'assessAnswer';
    }

    // Check if we've exhausted all questions
    const { questionsPool, questionsAsked } = state;
    const totalAsked = questionsAsked.length;
    const totalAvailable =
      questionsPool.easy.length +
      questionsPool.medium.length +
      questionsPool.hard.length;

    if (totalAsked >= totalAvailable || totalAsked >= 10) {
      return 'generateReport';
    }

    return 'assessAnswer';
  }

  private routeFromLevelTransition(state: ProjectReviewStateType): string {
    if (state.phase === ReviewPhase.REPORT_GENERATION) {
      return 'generateReport';
    }
    return 'presentQuestion';
  }

  // =========================================================================
  // Helper Nodes
  // =========================================================================

  private createWaitForUploadNode() {
    return async (state: ProjectReviewStateType): Promise<Partial<ProjectReviewStateType>> => {
      // This node waits for file upload - in real implementation,
      // file upload would be handled by the voice agent's event system
      console.log('[ProjectReview] Waiting for PPT upload...');

      if (!state.pptFile) {
        return {
          lastAiMessage: "I'm waiting for your presentation file. Please upload your PowerPoint.",
        };
      }

      return {};
    };
  }

  private createErrorNode() {
    return async (state: ProjectReviewStateType): Promise<Partial<ProjectReviewStateType>> => {
      console.log('[ProjectReview] Handling error:', state.lastError);
      return {
        phase: ReviewPhase.ERROR,
        lastAiMessage: `I apologize, but we've encountered an issue: ${state.lastError || 'Unknown error'}. 
Please contact support for assistance.`,
      };
    };
  }

  /**
   * Safely call session.say() - catches errors if session is closed
   */
  private safeSay(message: string): void {
    if (!this.session) {
      console.log('[ProjectReview] Session not available, skipping say:', message.substring(0, 50) + '...');
      return;
    }
    try {
      this.safeSay(message);
    } catch (error: any) {
      console.log('[ProjectReview] Failed to say (session may be closed):', error.message);
    }
  }

  // =========================================================================
  // Data Message Handling
  // =========================================================================

  /**
   * Handle incoming data messages from the room
   */
  protected onDataMessage(message: { type: string; data?: any }, participant: any): void {
    console.log('[ProjectReview] Data message received:', message.type);

    switch (message.type) {
      case 'ppt_uploaded':
        this.handleFileUpload(message.data?.fileUrl || message.data?.url);
        break;
      case 'file_upload':
        this.handleFileUpload(message.data?.fileUrl || message.data?.url);
        break;
      default:
        console.log('[ProjectReview] Unknown message type:', message.type);
    }
  }

  // =========================================================================
  // Public Methods for File Upload Handling
  // =========================================================================

  /**
   * Handle PPT file upload from external source
   * This runs the LangGraph workflow to analyze the PPT and generate questions
   */
  public async handleFileUpload(fileUrl: string): Promise<void> {
    if (!this.currentState || !fileUrl) {
      console.log('[ProjectReview] Cannot process upload - state not ready');
      return;
    }

    console.log(`[ProjectReview] 📤 File upload received: ${fileUrl}`);

    // Notify user we're processing
    this.safeSay("I've received your presentation file. Let me analyze the content and prepare some questions for you. This will take a moment.");

    try {
      // Fetch RAG context from vector store
      let pptContext = '';
      try {
        const { getPptContext } = await import('../../services/rag/index.js');
        const reviewId = this.currentState.sessionId; // Use session ID or review ID
        pptContext = await getPptContext(reviewId, 'project overview implementation');
        console.log(`[ProjectReview] 📚 Retrieved ${pptContext.length} chars of RAG context`);
      } catch (ragError) {
        console.warn('[ProjectReview] RAG context fetch failed:', ragError);
      }

      // Update state with file URL and context
      this.currentState = {
        ...this.currentState,
        pptFile: fileUrl,
        pptContext,
        phase: ReviewPhase.PARSING,
      };

      // Run the LangGraph workflow to analyze and generate questions
      console.log('[ProjectReview] 🔄 Running analysis workflow...');

      if (this.graph) {
        const result = await this.graph.invoke(this.currentState, { recursionLimit: 100 });
        this.currentState = result;

        console.log('[ProjectReview] ✅ Workflow complete');
        console.log(`[ProjectReview] Questions generated: Easy=${result.questionsPool?.easy?.length || 0}, Medium=${result.questionsPool?.medium?.length || 0}, Hard=${result.questionsPool?.hard?.length || 0}`);

        // If we have questions, announce we're ready
        const totalQuestions =
          (result.questionsPool?.easy?.length || 0) +
          (result.questionsPool?.medium?.length || 0) +
          (result.questionsPool?.hard?.length || 0);

        if (totalQuestions > 0) {
          const firstQuestion = result.questionsPool?.easy?.[0]?.question ||
            result.questionsPool?.medium?.[0]?.question ||
            'Can you give me an overview of your project?';

          this.safeSay(`I've analyzed your presentation and prepared ${totalQuestions} questions for you. Let's begin with an easy one: ${firstQuestion}`);
        } else {
          // Use RAG context to generate a question
          if (pptContext) {
            this.safeSay("I've reviewed your presentation. Based on what I see in your slides, can you start by explaining the main problem your project aims to solve?");
          } else {
            this.safeSay("I've reviewed your presentation. Let's start with a simple question: Can you give me an overview of your project and its main objectives?");
          }
        }
      }
    } catch (error) {
      console.error('[ProjectReview] ❌ Workflow error:', error);
      this.safeSay("I encountered an issue analyzing your presentation, but let's proceed. Can you give me an overview of your project?");
    }
  }
}
